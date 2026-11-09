// NF-17.2 privacy rules. No Sentry account needed: these test what is allowed to
// leave, not the delivery. Run: node --test tests/sentry_test.ts | deno test --allow-read tests/sentry_test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildTags,
  reportableError,
  scrubEvent,
  shouldReport,
} from "../supabase/functions/_shared/sentry_scrub.ts";
import { StorageError } from "../supabase/functions/_shared/storage.ts";

const SCHOOL = "11111111-1111-4111-8111-111111111111";

test("tags are the school id and the role, plus the function name, and nothing else", () => {
  assert.deepEqual(buildTags({ fn: "files-upload", tenantId: SCHOOL, roles: ["teacher"] }), {
    function: "files-upload", tenant_id: SCHOOL, role: "teacher",
  });
  assert.deepEqual(buildTags({ fn: "files-sign", tenantId: SCHOOL, roles: ["teacher", "school_admin"] }).role, "teacher,school_admin");
});

test("before sign-in there is no school or role to tag", () => {
  assert.deepEqual(buildTags({ fn: "files-upload" }), { function: "files-upload" });
  assert.deepEqual(buildTags({ fn: "files-upload", roles: [] }), { function: "files-upload" });
});

test("expected refusals are not reported, server failures are", () => {
  for (const s of [400, 401, 403, 404, 413, 415]) {
    assert.equal(shouldReport(new StorageError("invalid_input", s, "x")), false, String(s));
  }
  assert.equal(shouldReport(new StorageError("upload_failed", 502, "x")), true);
  assert.equal(shouldReport(new StorageError("record_failed", 500, "x")), true);
  assert.equal(shouldReport(new TypeError("boom")), true);
});

test("a reported StorageError carries its code, not its message (messages hold file names)", () => {
  const e = new StorageError("record_failed", 500, 'Could not save "Anna Peeters - essay.pdf"');
  const out = reportableError(e);
  assert.equal(out.message, "StorageError: record_failed");
  assert.ok(!String(out.stack).includes("Anna Peeters"));
});

test("scrubEvent removes user, request, breadcrumbs and extra data", () => {
  const event = scrubEvent({
    user: { id: "u1", email: "anna@school.be", ip_address: "1.2.3.4" },
    request: { url: "https://x/functions/v1/files-upload?x=1", headers: { authorization: "Bearer secret", cookie: "a=b" } },
    breadcrumbs: [{ message: "clicked anna@school.be" }],
    extra: { fileName: "Anna Peeters.pdf" },
    tags: { tenant_id: SCHOOL, role: "teacher" },
    exception: { values: [{ type: "Error", value: "failed for anna@school.be" }] },
  });
  assert.equal(event.user, undefined);
  assert.equal(event.request, undefined);
  assert.equal(event.breadcrumbs, undefined);
  assert.equal(event.extra, undefined);
  assert.deepEqual(event.tags, { tenant_id: SCHOOL, role: "teacher" });
  assert.equal(event.exception.values[0].value, "failed for [email]");
});

test("email addresses are blanked in messages", () => {
  const event = scrubEvent({ message: "mail jan.janssens+x@gmail.com and a@b.co", logentry: { message: "x@y.be" } });
  assert.equal(event.message, "mail [email] and [email]");
  assert.equal(event.logentry.message, "[email]");
});

test("scrubEvent copes with an event that has none of those fields", () => {
  assert.deepEqual(scrubEvent({ tags: { role: "teacher" } }), { tags: { role: "teacher" } });
});

test("the Sentry setup never turns on personal data or sets a user", () => {
  const src = readFileSync(new URL("../supabase/functions/_shared/sentry.ts", import.meta.url), "utf8");
  const code = src.split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");
  assert.ok(/sendDefaultPii:\s*false/.test(code));
  assert.ok(!/setUser|sendDefaultPii:\s*true|attachStacktrace.*request/i.test(code));
  assert.ok(/beforeSend/.test(code));
});