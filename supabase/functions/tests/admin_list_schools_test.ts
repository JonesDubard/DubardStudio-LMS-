// US-009 + NF-13: the school list for Platform Admins, with cursor paging. Runs offline against a small fake database.
// deno test --node-modules-dir=none --allow-read --allow-env supabase/functions/tests/admin_list_schools_test.ts
import assert from "node:assert/strict";
import { listSchools } from "../admin-list-schools/handler.ts";

const assertEquals = (got: unknown, want: unknown, msg?: string) => assert.deepStrictEqual(got, want, msg);

interface Tenant {
  id: string; name: string; subdomain: string; subscription_status: string;
  onboarding_status: string; created_at: string; contact_email: string; contact_name: string;
}
const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const INACTIVE = "00000000-0000-4000-8000-0000000000a2";
const TEACHER = "00000000-0000-4000-8000-0000000000b1";
const MAX_ROWS = 100; // the Supabase API setting (NF-13.1): the fake enforces it too

const idOf = (n: number) => `10000000-0000-4000-8000-00000000000${n}`;

function tenant(n: number, sub: string, onboarding: string, created: string): Tenant {
  return {
    id: idOf(n), name: `School ${n}`, subdomain: `school-${n}`,
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

// n schools; groups share the same created_at, so the id tiebreak is exercised.
function many(n: number): Tenant[] {
  return Array.from({ length: n }, (_, i) => ({
    ...tenant(1, "trial", "provisioning", `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z`),
    id: `20000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    name: `Many ${i}`,
  }));
}
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sortedIds = (rows: Tenant[], asc: boolean) =>
  [...rows].sort((a, b) => (cmp(a.created_at, b.created_at) || cmp(a.id, b.id)) * (asc ? 1 : -1)).map((r) => r.id);

function fakeDb(tenants: Tenant[] = TENANTS) {
  const audit: Record<string, unknown>[] = [];
  const log = { tenantReads: 0, rpc: [] as string[], selects: [] as string[], limits: [] as number[] };
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
      let orFilter: string | null = null;
      let limit: number | null = null;
      let cols: string[] = [];
      const run = () => {
        // deno-lint-ignore no-explicit-any
        let rows: any[] = tenants.filter((r) => filters.every(([c, v]) => (r as any)[c] === v));
        if (orFilter) {
          // the one shape keysetFilter() produces: created_at.lt."C",and(created_at.eq."C",id.lt."I")
          const m = /^created_at\.(lt|gt)\."([^"]+)",and\(created_at\.eq\."([^"]+)",id\.(lt|gt)\."([^"]+)"\)$/.exec(orFilter);
          if (!m) throw new Error(`unexpected or() filter: ${orFilter}`);
          const [, op, c, c2, , id] = m;
          const after = (a: string, b: string) => (op === "lt" ? a < b : a > b);
          rows = rows.filter((r) => after(r.created_at, c) || (r.created_at === c2 && after(r.id, id)));
        }
        for (const o of [...order].reverse()) {
          rows = [...rows].sort((a, b) => (a[o.col] < b[o.col] ? (o.asc ? -1 : 1) : a[o.col] > b[o.col] ? (o.asc ? 1 : -1) : 0));
        }
        if (limit !== null) rows = rows.slice(0, limit);
        rows = rows.slice(0, MAX_ROWS); // Max Rows: no query returns more than 100
        return { data: rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]]))), error: null };
      };
      // deno-lint-ignore no-explicit-any
      const q: any = {
        select: (c: string) => { log.selects.push(c); cols = c.split(",").map((s) => s.trim()); return q; },
        eq: (c: string, v: string) => { filters.push([c, v]); return q; },
        or: (s: string) => { orFilter = s; return q; },
        order: (col: string, o?: { ascending?: boolean }) => { order.push({ col, asc: o?.ascending !== false }); return q; },
        limit: (n: number) => { limit = n; log.limits.push(n); return q; },
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

// Follow next_cursor until there is none. Returns every id seen, in order, and how many calls it took.
async function walk(f: ReturnType<typeof fakeDb>, body: Record<string, unknown>) {
  const ids: string[] = [];
  let cursor: string | null = null;
  let calls = 0;
  do {
    const r = await call(f, cursor ? { ...body, cursor } : body);
    assertEquals(r.status, 200);
    ids.push(...r.json.schools.map((s: Tenant) => s.id));
    cursor = r.json.paging.next_cursor;
    calls++;
    assert.ok(calls <= 200, "cursor paging should end"); // page size 7 over 150 schools takes 22 calls
  } while (cursor);
  return { ids, calls };
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

Deno.test("every successful list writes one audit row: tenant.list, the filters, no school data, no cursor", async () => {
  const f = fakeDb();
  await call(f, { status: "trial", page_size: 1 });
  assertEquals(f.audit.length, 1);
  const a = f.audit[0];
  assertEquals([a.action, a.result, a.actor_id, a.resource_type], ["tenant.list", "success", ADMIN, "tenant"]);
  const d = a.details as Record<string, unknown>;
  assertEquals([d.status, d.page_size, d.returned, d.has_more], ["trial", 1, 1, true]);
  assertEquals(JSON.stringify(a).includes("secret"), false);
  assertEquals(JSON.stringify(a).includes("cursor"), false);
});

// ---- US-009.2: filters and sort -------------------------------------------------

Deno.test("filter by subscription status", async () => {
  const r = await call(fakeDb(), { status: "trial" });
  assertEquals(r.json.schools.map((s: Tenant) => s.name), ["School 3", "School 2"]);
  assertEquals(r.json.paging.next_cursor, null);
});

Deno.test("filter by onboarding status, and both filters together", async () => {
  const a = await call(fakeDb(), { onboarding_status: "invited" });
  assertEquals(a.json.schools.map((s: Tenant) => s.name), ["School 5", "School 3"]);
  const b = await call(fakeDb(), { status: "active", onboarding_status: "invited" });
  assertEquals(b.json.schools.map((s: Tenant) => s.name), ["School 5"]);
});

Deno.test("an onboarding status nobody has is an empty page, not an error", async () => {
  const r = await call(fakeDb(), { onboarding_status: "nothing_like_this" });
  assertEquals([r.status, r.json.schools.length, r.json.paging.next_cursor], [200, 0, null]);
});

Deno.test("sort by created date: oldest first", async () => {
  const r = await call(fakeDb(), { sort: "oldest" });
  assertEquals(r.json.schools.map((s: Tenant) => s.name), ["School 1", "School 2", "School 3", "School 4", "School 5"]);
});

// ---- NF-13: cursor paging --------------------------------------------------------

Deno.test("page_size 2 walks all 5 schools, newest first, in 3 calls", async () => {
  const first = await call(fakeDb(), { page_size: 2 });
  assertEquals(first.json.schools.map((s: Tenant) => s.name), ["School 5", "School 4"]);
  assert.ok(first.json.paging.next_cursor);
  assertEquals(first.json.paging.page_size, 2);
  const all = await walk(fakeDb(), { page_size: 2 });
  assertEquals(all.ids, [5, 4, 3, 2, 1].map(idOf));
  assertEquals(all.calls, 3);
});

Deno.test("a list that fits in one page has no next cursor", async () => {
  const r = await call(fakeDb(), {});
  assertEquals([r.json.schools.length, r.json.paging.next_cursor], [5, null]);
});

Deno.test("150 schools: default page is 20; more than 100 gives 100 plus a next cursor", async () => {
  const f = fakeDb(many(150));
  const d = await call(f, {});
  assertEquals([d.json.schools.length, d.json.paging.page_size], [20, 20]);
  const big = await call(f, { page_size: 500 });
  assertEquals([big.json.schools.length, big.json.paging.page_size], [100, 100]);
  assert.ok(big.json.paging.next_cursor);
  for (const n of f.log.limits) assert.ok(n <= MAX_ROWS, `a query asked for ${n} rows`);
});

Deno.test("150 schools: following the cursor returns the rest, no repeats, no gaps, same order as one sorted list", async () => {
  const rows = many(150);
  const { ids, calls } = await walk(fakeDb(rows), { page_size: 500 });
  assertEquals(calls, 2);
  assertEquals(ids.length, 150);
  assertEquals(new Set(ids).size, 150, "no repeats");
  assertEquals(ids, sortedIds(rows, false));
});

Deno.test("schools created at the same moment are never skipped or repeated at a page boundary", async () => {
  const rows = many(150); // several schools share each created_at; a page size of 7 splits groups
  const { ids } = await walk(fakeDb(rows), { page_size: 7 });
  assertEquals(ids.length, 150);
  assertEquals(new Set(ids).size, 150);
  assertEquals(ids, sortedIds(rows, false));
});

Deno.test("oldest first walks the same schools in the opposite order", async () => {
  const rows = many(150);
  const { ids } = await walk(fakeDb(rows), { page_size: 40, sort: "oldest" });
  assertEquals(ids, sortedIds(rows, true));
});

Deno.test("exactly 100 schools at page size 100: a cursor, then an empty last page, no error", async () => {
  const f = fakeDb(many(100));
  const first = await call(f, { page_size: 100 });
  assertEquals(first.json.schools.length, 100);
  assert.ok(first.json.paging.next_cursor);
  const second = await call(f, { page_size: 100, cursor: first.json.paging.next_cursor });
  assertEquals([second.status, second.json.schools.length, second.json.paging.next_cursor], [200, 0, null]);
});

Deno.test("a cursor belongs to the sort it was issued for", async () => {
  const f = fakeDb(many(30));
  const newest = await call(f, { page_size: 5 });
  const r = await call(f, { page_size: 5, sort: "oldest", cursor: newest.json.paging.next_cursor });
  assertEquals([r.status, r.json.error], [400, "invalid_cursor"]);
});

Deno.test("bad input is a 400 and is audited as an error: page_size, cursor, status, sort, onboarding_status", async () => {
  const bodies = [
    { page_size: 0 }, { page_size: -1 }, { page_size: "x" }, { page_size: 1.5 },
    { cursor: "nonsense" }, { cursor: 5 }, { cursor: "" },
    { status: "gold" }, { status: 5 }, { sort: "random" }, { onboarding_status: "A; drop" },
  ];
  for (const body of bodies) {
    const f = fakeDb();
    const r = await call(f, body);
    assertEquals(r.status, 400, JSON.stringify(body));
    assertEquals(f.audit[0].result, "error");
    assertEquals([f.log.tenantReads, f.log.rpc.length], [0, 0], "nothing is read for bad input");
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