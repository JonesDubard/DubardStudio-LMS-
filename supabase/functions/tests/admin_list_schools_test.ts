// US-009: the school list for Platform Admins. Runs offline against a small fake database.
// deno test --node-modules-dir=none --allow-read --allow-env supabase/functions/tests/admin_list_schools_test.ts
import assert from "node:assert/strict";
import { listSchools } from "../admin-list-schools/handler.ts";
import { parsePaging, pageOf } from "../_shared/paging.ts";

const assertEquals = (got: unknown, want: unknown, msg?: string) => assert.deepStrictEqual(got, want, msg);
const assertStringIncludes = (got: string, part: string) => assert.ok(got.includes(part), `${got} should include ${part}`);

interface Tenant {
  id: string; name: string; subdomain: string; subscription_status: string;
  onboarding_status: string; created_at: string; contact_email: string; contact_name: string;
}
const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const INACTIVE = "00000000-0000-4000-8000-0000000000a2";
const TEACHER = "00000000-0000-4000-8000-0000000000b1";

function tenant(n: number, sub: string, onboarding: string, created: string): Tenant {
  return {
    id: `10000000-0000-4000-8000-00000000000${n}`, name: `School ${n}`, subdomain: `school-${n}`,
    subscription_status: sub, onboarding_status: onboarding, created_at: created,
    contact_email: `secret${n}@example.test`, contact_name: `Secret ${n}`,
  };
}
// newest first by date: 5, 4, 3, 2, 1
const TENANTS = [
  tenant(1, "active", "complete", "2026-01-01T00:00:00Z"),
  tenant(2, "trial", "provisioning", "2026-02-01T00:00:00Z"),
  tenant(3, "trial", "invited", "2026-03-01T00:00:00Z"),
  tenant(4, "suspended", "complete", "2026-04-01T00:00:00Z"),
  tenant(5, "active", "invited", "2026-05-01T00:00:00Z"),
];

function fakeDb(tenants: Tenant[] = TENANTS) {
  const audit: Record<string, unknown>[] = [];
  const log = { tenantReads: 0, rpc: [] as string[], selects: [] as string[] };
  const users: Record<string, string> = { "admin-token": ADMIN, "inactive-token": INACTIVE, "teacher-token": TEACHER };
  const admins: Record<string, boolean> = { [ADMIN]: true, [INACTIVE]: false };
  const totals = () => {
    const c = (s: string) => tenants.filter((t) => t.subscription_status === s).length;
    return { total: tenants.length, active: c("active"), trial: c("trial"), suspended: c("suspended"), cancelled: c("cancelled") };
  };
  // deno-lint-ignore no-explicit-any
  const db: any = {
    auth: {
      getUser: (token: string) =>
        Promise.resolve(users[token]
          ? { data: { user: { id: users[token] } }, error: null }
          : { data: { user: null }, error: { message: "bad token" } }),
    },
    from(table: string) {
      if (table === "platform_admins") {
        return { select: () => ({ eq: (_c: string, id: string) => ({ maybeSingle: () => Promise.resolve({ data: id in admins ? { is_active: admins[id] } : null, error: null }) }) }) };
      }
      if (table === "audit_log") return { insert: (row: Record<string, unknown>) => { audit.push(row); return Promise.resolve({ error: null }); } };
      if (table !== "tenants") throw new Error(`unexpected table ${table}`);
      log.tenantReads++;
      const filters: [string, string][] = [];
      const order: { col: string; asc: boolean }[] = [];
      let range: [number, number] | null = null;
      let head = false;
      let cols: string[] = [];
      const run = () => {
        // deno-lint-ignore no-explicit-any
        let rows: any[] = tenants.filter((r) => filters.every(([c, v]) => (r as any)[c] === v));
        const count = rows.length;
        if (head) return { data: null, count, error: null };
        for (const o of [...order].reverse()) {
          rows = [...rows].sort((a, b) => (a[o.col] < b[o.col] ? (o.asc ? -1 : 1) : a[o.col] > b[o.col] ? (o.asc ? 1 : -1) : 0));
        }
        if (range) rows = rows.slice(range[0], range[1] + 1);
        return { data: rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]]))), count, error: null };
      };
      // deno-lint-ignore no-explicit-any
      const q: any = {
        select: (c: string, o?: { head?: boolean }) => { log.selects.push(c); cols = c.split(",").map((s) => s.trim()); head = !!o?.head; return q; },
        eq: (c: string, v: string) => { filters.push([c, v]); return q; },
        order: (col: string, o?: { ascending?: boolean }) => { order.push({ col, asc: o?.ascending !== false }); return q; },
        range: (a: number, b: number) => { range = [a, b]; return q; },
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
      };
      return q;
    },
    rpc(fn: string) {
      log.rpc.push(fn);
      return { single: () => Promise.resolve({ data: totals(), error: null }) };
    },
  };
  return { db, audit, log };
}

async function call(f: ReturnType<typeof fakeDb>, body: unknown, token: string | null = "admin-token", method = "POST") {
  const handler = listSchools(() => f.db);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await handler(new Request("http://x/admin-list-schools", { method, headers, body: method === "POST" ? JSON.stringify(body) : undefined }));
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

// ---- US-009.4: who is refused -------------------------------------------------

Deno.test("no token: 401, nothing read, no audit row", async () => {
  const f = fakeDb();
  const r = await call(f, {}, null);
  assertEquals(r.status, 401);
  assertEquals([f.log.tenantReads, f.log.rpc.length, f.audit.length], [0, 0, 0]);
});

Deno.test("a bad token: 401 and nothing read", async () => {
  const f = fakeDb();
  assertEquals((await call(f, {}, "nonsense")).status, 401);
  assertEquals(f.log.tenantReads, 0);
});

Deno.test("a signed-in teacher (not a Platform Admin) is refused with 403 and the refusal is audited", async () => {
  const f = fakeDb();
  const r = await call(f, {}, "teacher-token");
  assertEquals(r.status, 403);
  assertEquals(r.json.error, "not_platform_admin");
  assertEquals([f.log.tenantReads, f.log.rpc.length], [0, 0]);
  assertEquals(f.audit.length, 1);
  assertEquals([f.audit[0].action, f.audit[0].result, f.audit[0].reason], ["tenant.list", "denied", "not_platform_admin"]);
});

Deno.test("an inactive Platform Admin is refused with 403", async () => {
  const f = fakeDb();
  assertEquals((await call(f, {}, "inactive-token")).status, 403);
  assertEquals(f.log.tenantReads, 0);
});

Deno.test("GET is refused with 405 before anything runs", async () => {
  const f = fakeDb();
  assertEquals((await call(f, {}, "admin-token", "GET")).status, 405);
  assertEquals(f.log.tenantReads, 0);
});

// ---- US-009.1: fields and audit -------------------------------------------------

Deno.test("an admin gets a page with school-level fields only, newest first", async () => {
  const f = fakeDb();
  const r = await call(f, {});
  assertEquals(r.status, 200);
  assertEquals(r.json.schools.map((s: Tenant) => s.name), ["School 5", "School 4", "School 3", "School 2", "School 1"]);
  for (const s of r.json.schools) {
    assertEquals(Object.keys(s).sort(), ["created_at", "id", "name", "onboarding_status", "subdomain", "subscription_status"]);
  }
  const body = JSON.stringify(r.json);
  assertEquals(body.includes("secret"), false, "no contact details in the answer");
  for (const sel of f.log.selects) assertEquals(sel.includes("contact"), false, "contact columns are never selected");
});

Deno.test("every successful list writes one audit row: tenant.list, the filters, no school data", async () => {
  const f = fakeDb();
  await call(f, { status: "trial", page_size: 1 });
  assertEquals(f.audit.length, 1);
  const a = f.audit[0];
  assertEquals([a.action, a.result, a.actor_id, a.resource_type], ["tenant.list", "success", ADMIN, "tenant"]);
  const d = a.details as Record<string, unknown>;
  assertEquals([d.status, d.page_size, d.returned], ["trial", 1, 1]);
  assertEquals(JSON.stringify(a).includes("secret"), false);
});

// ---- US-009.2: filters, sort, paging --------------------------------------------

Deno.test("filter by subscription status", async () => {
  const r = await call(fakeDb(), { status: "trial" });
  assertEquals(r.json.schools.map((s: Tenant) => s.name), ["School 3", "School 2"]);
  assertEquals(r.json.paging.total, 2);
});

Deno.test("filter by onboarding status, and both filters together", async () => {
  const a = await call(fakeDb(), { onboarding_status: "invited" });
  assertEquals(a.json.schools.map((s: Tenant) => s.name), ["School 5", "School 3"]);
  const b = await call(fakeDb(), { status: "active", onboarding_status: "invited" });
  assertEquals(b.json.schools.map((s: Tenant) => s.name), ["School 5"]);
});

Deno.test("an onboarding status nobody has is an empty page, not an error", async () => {
  const r = await call(fakeDb(), { onboarding_status: "nothing_like_this" });
  assertEquals([r.status, r.json.schools.length, r.json.paging.total], [200, 0, 0]);
});

Deno.test("sort by created date: oldest first", async () => {
  const r = await call(fakeDb(), { sort: "oldest" });
  assertEquals(r.json.schools.map((s: Tenant) => s.name), ["School 1", "School 2", "School 3", "School 4", "School 5"]);
});

Deno.test("paging: page 2 of size 2, and the paging block says where we are", async () => {
  const r = await call(fakeDb(), { page: 2, page_size: 2 });
  assertEquals(r.json.schools.map((s: Tenant) => s.name), ["School 3", "School 2"]);
  assertEquals(r.json.paging, { page: 2, page_size: 2, total: 5, total_pages: 3 });
});

Deno.test("paging: the last page is short, and a page past the end is empty (not an error)", async () => {
  const last = await call(fakeDb(), { page: 3, page_size: 2 });
  assertEquals(last.json.schools.map((s: Tenant) => s.name), ["School 1"]);
  const past = await call(fakeDb(), { page: 99, page_size: 2 });
  assertEquals([past.status, past.json.schools.length, past.json.paging.total], [200, 0, 5]);
});

Deno.test("paging: no page given = page 1 of 25; more than 100 per page gives 100", async () => {
  const d = await call(fakeDb(), {});
  assertEquals([d.json.paging.page, d.json.paging.page_size], [1, 25]);
  const big = await call(fakeDb(), { page_size: 500 });
  assertEquals(big.json.paging.page_size, 100);
});

Deno.test("paging: 101 schools never come back in one answer", async () => {
  const many = Array.from({ length: 150 }, (_, i) => ({ ...tenant(1, "trial", "provisioning", `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z`), id: `20000000-0000-4000-8000-${String(i).padStart(12, "0")}` }));
  const r = await call(fakeDb(many), { page_size: 1000 });
  assertEquals(r.json.schools.length, 100);
  assertEquals(r.json.paging.total_pages, 2);
});

Deno.test("bad input is a 400 and is audited as an error: page 0, page 'x', status 'gold', sort 'random'", async () => {
  for (const body of [{ page: 0 }, { page: "x" }, { page_size: -1 }, { page: 1.5 }, { status: "gold" }, { status: 5 }, { sort: "random" }, { onboarding_status: "A; drop" }]) {
    const f = fakeDb();
    const r = await call(f, body);
    assertEquals(r.status, 400, JSON.stringify(body));
    assertEquals(f.audit[0].result, "error");
    assertEquals(f.log.rpc.length, 0);
  }
});

// ---- US-009.3: totals -----------------------------------------------------------

Deno.test("totals cover all schools, whatever the filter or page", async () => {
  const all = await call(fakeDb(), {});
  const filtered = await call(fakeDb(), { status: "trial", page_size: 1 });
  const want = { total: 5, active: 2, trial: 2, suspended: 1, cancelled: 0 };
  assertEquals(all.json.totals, want);
  assertEquals(filtered.json.totals, want);
  assertEquals(filtered.json.schools.length, 1);
});

Deno.test("totals come from the database function, in one call", async () => {
  const f = fakeDb();
  await call(f, {});
  assertEquals(f.log.rpc, ["school_status_totals"]);
});

// ---- the paging helper on its own ----------------------------------------------

Deno.test("parsePaging: defaults, the row range, and the 100 cap", () => {
  assertEquals(parsePaging({}), { page: 1, pageSize: 25, from: 0, to: 24 });
  assertEquals(parsePaging({ page: 3, page_size: 10 }), { page: 3, pageSize: 10, from: 20, to: 29 });
  assertEquals(parsePaging({ page_size: 100 }).pageSize, 100);
  assertEquals(parsePaging({ page_size: 101 }).pageSize, 100);
});

Deno.test("parsePaging: refuses what is not a whole number from 1", () => {
  for (const body of [{ page: 0 }, { page: -2 }, { page: "2" }, { page: 2.5 }, { page: 1e9 }, { page_size: 0 }, { page_size: "50" }, { page: NaN }]) {
    let code = "";
    try { parsePaging(body); } catch (e) { code = (e as { code?: string }).code ?? "other"; }
    assertEquals(code, "invalid_paging", JSON.stringify(body));
  }
});

Deno.test("pageOf: at least one page, even for no rows", () => {
  assertEquals(pageOf(0, parsePaging({})).total_pages, 1);
  assertEquals(pageOf(101, parsePaging({ page_size: 100 })).total_pages, 2);
  assertStringIncludes(JSON.stringify(pageOf(5, parsePaging({}))), '"total":5');
});