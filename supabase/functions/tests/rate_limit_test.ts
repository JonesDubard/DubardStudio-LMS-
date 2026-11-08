// Unit tests for the shared rate-limit check (NF-07a.4, NF-07a.5).
// Counting itself (N allowed, N+1 refused, allowed again after the window) is
// proven in the database by tests/rls/0011_rate_limits_tests.sql.
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { adminHandler } from "../_shared/admin.ts";
import {
  enforceRateLimit,
  LIMITS,
  RateLimitError,
} from "../_shared/rate_limit.ts";
import { FakeDb } from "./fake_db.ts";

const USER = "00000000-0000-0000-0000-0000000000b1";
const SCHOOL = "00000000-0000-0000-0000-00000000000a";
const ADMIN = "00000000-0000-0000-0000-0000000000a1";

type Answer = { data?: unknown; error?: { message: string } | null };

/** A client whose rate_limit_hit answers come from a list, one per call. */
function fakeLimiter(...answers: Answer[]) {
  const calls: Record<string, unknown>[] = [];
  const db = {
    rpc: (name: string, args: Record<string, unknown>) => {
      assertEquals(name, "rate_limit_hit");
      calls.push(args);
      return Promise.resolve(answers.shift() ?? ok);
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}
const ok: Answer = {
  data: [{ allowed: true, retry_after_seconds: 0 }],
  error: null,
};
const over = (s: number): Answer => ({
  data: [{ allowed: false, retry_after_seconds: s }],
  error: null,
});

Deno.test(
  "under the limit: allowed, and counted once for the user",
  async () => {
    const { db, calls } = fakeLimiter(ok);
    await enforceRateLimit(db, "upload", USER);
    assertEquals(calls, [
      {
        p_bucket: "upload",
        p_subject: `user:${USER}`,
        p_limit: 30,
        p_window_seconds: 60,
      },
    ]);
  },
);

Deno.test("starting numbers match NF-07a.3", () => {
  assertEquals(LIMITS.invite, { limit: 50, windowSeconds: 3600, per: "admin" });
  assertEquals(LIMITS.import, { limit: 5, windowSeconds: 3600, per: "school" });
  assertEquals(LIMITS.upload, { limit: 30, windowSeconds: 60, per: "user" });
});

Deno.test("invites are counted per admin, imports per school", async () => {
  const { db, calls } = fakeLimiter(ok, ok);
  await enforceRateLimit(db, "invite", ADMIN);
  await enforceRateLimit(db, "import", SCHOOL);
  assertEquals(
    calls.map((c) => c.p_subject),
    [`admin:${ADMIN}`, `school:${SCHOOL}`],
  );
});

Deno.test(
  "over the limit: 429 with the retry time and a Retry-After header",
  async () => {
    const { db } = fakeLimiter(over(42));
    const err = await assertRejects(
      () => enforceRateLimit(db, "upload", USER),
      RateLimitError,
    );
    assertEquals(err.status, 429);
    assertEquals(err.code, "rate_limited");
    assertEquals(err.retryAfterSeconds, 42);
    assertEquals(err.headers, { "Retry-After": "42" });
    assert(err.message.includes("42 seconds"));
  },
);

Deno.test(
  "a retry time of 0 or missing still says at least 1 second",
  async () => {
    const { db } = fakeLimiter(over(0));
    const err = await assertRejects(
      () => enforceRateLimit(db, "upload", USER),
      RateLimitError,
    );
    assertEquals(err.retryAfterSeconds, 1);
  },
);

Deno.test(
  "database error: refused (fails closed), not let through",
  async () => {
    const { db } = fakeLimiter({ data: null, error: { message: "boom" } });
    const err = await assertRejects(
      () => enforceRateLimit(db, "upload", USER),
      Error,
    );
    assert(!(err instanceof RateLimitError));
    assert(err.message.includes("rate_limit_hit failed"));
  },
);

Deno.test("an empty answer from the database is refused too", async () => {
  const { db } = fakeLimiter({ data: [], error: null });
  await assertRejects(
    () => enforceRateLimit(db, "upload", USER),
    Error,
    "returned no result",
  );
});

Deno.test(
  "an id that isn't a uuid is a programming error, and nothing is counted",
  async () => {
    const { db, calls } = fakeLimiter();
    await assertRejects(
      () => enforceRateLimit(db, "upload", "undefined"),
      Error,
      "needs a user id",
    );
    assertEquals(calls.length, 0);
  },
);

Deno.test(
  "inside adminHandler: 429 with Retry-After, and the work never runs",
  async () => {
    const db = new FakeDb();
    db.users = { "admin-token": ADMIN };
    db.admins = { [ADMIN]: true };
    db.rpcResult = over(42);
    let didWork = false;
    const handler = adminHandler(
      {
        scope: "platform",
        action: "invite.send",
        resourceType: "invitation",
        db: () => db.asClient(),
      },
      async ({ adminId, db: client }) => {
        await enforceRateLimit(client, "invite", adminId);
        didWork = true;
        return { body: { ok: true } };
      },
    );
    const res = await handler(
      new Request("http://localhost/fn", {
        method: "POST",
        headers: {
          Authorization: "Bearer admin-token",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    assertEquals(res.status, 429);
    assertEquals(res.headers.get("Retry-After"), "42");
    const body = await res.json();
    assertEquals(body.error, "rate_limited");
    assert(body.message.includes("42 seconds"));
    assertEquals(didWork, false);
  },
);
