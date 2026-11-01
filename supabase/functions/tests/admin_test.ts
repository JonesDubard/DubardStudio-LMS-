// Unit tests for the admin path (US-013) and writeAudit() (US-014).
// Run: deno test supabase/functions/tests/
// "Nobody can edit or delete audit rows" is proven in the database by the MIG-0010 tests.
import { assert, assertEquals, assertRejects, assertThrows } from "jsr:@std/assert@1";
import { AuditWriteError, callerIp, writeAudit } from "../_shared/audit.ts";
import { adminHandler, schoolScope } from "../_shared/admin.ts";
import { createSchool } from "../admin-create-school/handler.ts";
import { schoolOverview } from "../admin-school-overview/handler.ts";
import { FakeDb } from "./fake_db.ts";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const OLD_ADMIN = "00000000-0000-0000-0000-0000000000a2";
const TEACHER = "00000000-0000-0000-0000-0000000000b1";
const SCHOOL_A = "00000000-0000-0000-0000-00000000000a";
const SCHOOL_B = "00000000-0000-0000-0000-00000000000b";
const NO_SCHOOL = "00000000-0000-0000-0000-00000000000c";

function setup() {
    const db = new FakeDb();
    db.users = { "admin-token": ADMIN, "old-admin-token": OLD_ADMIN, "teacher-token": TEACHER };
    db.admins = { [ADMIN]: true, [OLD_ADMIN]: false };
    db.tenants = {
        [SCHOOL_A]: { id: SCHOOL_A, name: "School A" },
        [SCHOOL_B]: { id: SCHOOL_B, name: "School B" },
    };
    return db;
}

function call(token: string | null, body: unknown = {}, method = "POST") {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return new Request("http://localhost/fn", {
        method,
        headers,
        body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    });
}

/** Every query the function itself ran, after the guard and the school lookup. */
function functionQueries(db: FakeDb) {
    return db.queries.filter((q) =>
        q.table !== "audit_log" && q.table !== "platform_admins" && !(q.table === "tenants" && q.columns === "id")
    );
}

// ---------------------------------------------------------------------------
// writeAudit (US-014.1, US-014.2)
// ---------------------------------------------------------------------------

Deno.test("writeAudit saves who, school, action, record and result", async () => {
    const db = setup();
    await writeAudit(db.asClient(), {
        actorId: ADMIN,
        tenantId: SCHOOL_A,
        action: "tenant.update",
        resourceType: "tenant",
        resourceId: SCHOOL_A,
        result: "success",
        details: { field: "status" },
        ipAddress: "203.0.113.7",
    });
    assertEquals(db.auditRows, [{
        actor_id: ADMIN,
        actor_kind: "platform_admin",
        tenant_id: SCHOOL_A,
        action: "tenant.update",
        resource_type: "tenant",
        resource_id: SCHOOL_A,
        result: "success",
        reason: null,
        details: { field: "status" },
        ip_address: "203.0.113.7",
    }]);
});

Deno.test("writeAudit refuses a bad action name or a non-uuid id, and writes nothing", async () => {
    const db = setup();
    const base = { actorId: ADMIN, tenantId: null, resourceType: "tenant", result: "success" as const };
    await assertRejects(() => writeAudit(db.asClient(), { ...base, action: "CreateSchool" }), AuditWriteError);
    await assertRejects(
        () => writeAudit(db.asClient(), { ...base, action: "tenant.create", tenantId: "school-a" }),
        AuditWriteError,
    );
    assertEquals(db.auditRows.length, 0);
});

Deno.test("writeAudit throws when the row is not saved", async () => {
    const db = setup();
    db.failAuditInsert = true;
    await assertRejects(
        () =>
            writeAudit(db.asClient(), {
                actorId: ADMIN,
                tenantId: null,
                action: "tenant.list",
                resourceType: "tenant",
                result: "success",
            }),
        AuditWriteError,
    );
});

Deno.test("callerIp keeps the first forwarded address and drops anything that isn't an IP", () => {
    const ip = (v: string) => callerIp(new Request("http://x", { headers: { "x-forwarded-for": v } }));
    assertEquals(ip("203.0.113.7, 10.0.0.1"), "203.0.113.7");
    assertEquals(ip("2001:db8::1"), "2001:db8::1");
    assertEquals(ip("not-an-ip"), null);
    assertEquals(ip("999.1.1.1"), null);
});

// ---------------------------------------------------------------------------
// The guard (US-013.2)
// ---------------------------------------------------------------------------

const probe = (db: FakeDb, ran: { yes: boolean }) =>
    adminHandler({ scope: "platform", action: "tenant.list", resourceType: "tenant", db: () => db.asClient() }, () => {
        ran.yes = true;
        return Promise.resolve({ body: { ok: true } });
    });

Deno.test("no token or a bad token: 401, the function doesn't run, no audit row", async () => {
    for (const token of [null, "forged-token"]) {
        const db = setup();
        const ran = { yes: false };
        const res = await probe(db, ran)(call(token));
        assertEquals(res.status, 401);
        assertEquals(await res.json(), { error: "not_signed_in" });
        assertEquals(ran.yes, false);
        assertEquals(db.auditRows.length, 0);
    }
});

Deno.test("a signed-in teacher is refused with 403 and the refusal is audited", async () => {
    const db = setup();
    const ran = { yes: false };
    const res = await probe(db, ran)(call("teacher-token"));
    assertEquals(res.status, 403);
    assertEquals(await res.json(), { error: "not_platform_admin" });
    assertEquals(ran.yes, false);
    assertEquals(db.auditRows.length, 1);
    const row = db.auditRows[0];
    assertEquals([row.actor_id, row.result, row.reason, row.tenant_id], [TEACHER, "denied", "not_platform_admin", null]);
    assertEquals(row.ip_address, "203.0.113.7");
});

Deno.test("an inactive Platform Admin is refused with 403", async () => {
    const db = setup();
    const ran = { yes: false };
    const res = await probe(db, ran)(call("old-admin-token"));
    assertEquals(res.status, 403);
    assertEquals(ran.yes, false);
    assertEquals(db.auditRows[0].result, "denied");
});

Deno.test("an active Platform Admin gets through and the call is audited", async () => {
    const db = setup();
    const ran = { yes: false };
    const res = await probe(db, ran)(call("admin-token"));
    assertEquals(res.status, 200);
    assertEquals(ran.yes, true);
    assertEquals(db.auditRows.map((r) => [r.actor_id, r.action, r.result]), [[ADMIN, "tenant.list", "success"]]);
});

Deno.test("OPTIONS is answered for CORS, other methods get 405, neither runs the function", async () => {
    const db = setup();
    const ran = { yes: false };
    assertEquals((await probe(db, ran)(call(null, null, "OPTIONS"))).status, 204);
    assertEquals((await probe(db, ran)(call("admin-token", null, "GET"))).status, 405);
    assertEquals(ran.yes, false);
});

Deno.test("a body that isn't a JSON object is refused with 400 and audited", async () => {
    for (const body of ["not json", "[1,2]", "null"]) {
        const db = setup();
        const res = await probe(db, { yes: false })(call("admin-token", body));
        assertEquals(res.status, 400);
        assertEquals((await res.json()).error, "bad_json");
        assertEquals(db.auditRows[0].result, "error");
    }
});

Deno.test("an unexpected error is a 500 with no details, and it is audited", async () => {
    const db = setup();
    const fn = adminHandler(
        { scope: "platform", action: "tenant.list", resourceType: "tenant", db: () => db.asClient() },
        () => {
            throw new Error("secret internal detail");
        },
    );
    const res = await fn(call("admin-token"));
    assertEquals(res.status, 500);
    assertEquals(await res.json(), { error: "internal" });
    assertEquals([db.auditRows[0].result, db.auditRows[0].reason], ["error", "internal"]);
});

Deno.test("if the success row can't be saved, the data is not returned", async () => {
    const db = setup();
    db.failAuditInsert = true;
    const res = await probe(db, { yes: false })(call("admin-token"));
    assertEquals(res.status, 500);
    assertEquals(await res.json(), { error: "audit_write_failed" });
});

// ---------------------------------------------------------------------------
// One school per call (US-013.3)
// ---------------------------------------------------------------------------

Deno.test("a one-school function needs exactly one tenant_id", async () => {
    const bodies = [
        {},
        { tenant_id: "school-a" },
        { tenant_id: [SCHOOL_A, SCHOOL_B] },
        { tenant_id: SCHOOL_A, tenant_ids: [SCHOOL_B] },
        { tenant_id: SCHOOL_A, schools: [SCHOOL_B] },
    ];
    for (const body of bodies) {
        const db = setup();
        const res = await schoolOverview(() => db.asClient())(call("admin-token", body));
        assertEquals(res.status, 400, JSON.stringify(body));
        assertEquals((await res.json()).error, "one_school_required");
        assertEquals(functionQueries(db).length, 0);
        assertEquals([db.auditRows[0].result, db.auditRows[0].tenant_id], ["error", null]);
    }
});

Deno.test("an unknown school is a 404; the audit row keeps the id in details, not in tenant_id", async () => {
    const db = setup();
    const res = await schoolOverview(() => db.asClient())(call("admin-token", { tenant_id: NO_SCHOOL }));
    assertEquals(res.status, 404);
    const row = db.auditRows[0];
    assertEquals(row.tenant_id, null);
    assertEquals(row.details, { requested_tenant_id: NO_SCHOOL });
});

Deno.test("school overview: every query is limited to the one school asked for", async () => {
    const db = setup();
    const res = await schoolOverview(() => db.asClient())(call("admin-token", { tenant_id: SCHOOL_A }));
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.school.id, SCHOOL_A);
    assertEquals(body.active_members, { school_admin: 3, teacher: 3, student: 3, parent: 3 });

    const qs = functionQueries(db);
    assertEquals(qs.length, 5);
    for (const q of qs) {
        const key = q.table === "tenants" ? "id" : "tenant_id";
        assertEquals(q.filters.filter(([c]) => c === key), [[key, SCHOOL_A]], `${q.table} not limited to school A`);
    }
    assertEquals(db.auditRows.length, 1);
    const row = db.auditRows[0];
    assertEquals([row.action, row.tenant_id, row.resource_id, row.result], [
        "tenant.view_overview",
        SCHOOL_A,
        SCHOOL_A,
        "success",
    ]);
});

Deno.test("school overview refuses a teacher before any school data is read", async () => {
    const db = setup();
    const res = await schoolOverview(() => db.asClient())(call("teacher-token", { tenant_id: SCHOOL_A }));
    assertEquals(res.status, 403);
    assertEquals(db.queries.filter((q) => q.table === "tenants" || q.table === "memberships").length, 0);
});

Deno.test("schoolScope stamps inserts with the school and refuses rows for another school", async () => {
    const db = setup();
    const school = schoolScope(db.asClient(), SCHOOL_A);
    await school.insert("classes", [{ name: "10A" }, { name: "10B", tenant_id: SCHOOL_A }]);
    assertEquals(db.queries[0].rows, [{ name: "10A", tenant_id: SCHOOL_A }, { name: "10B", tenant_id: SCHOOL_A }]);
    assertThrows(() => school.insert("classes", { name: "x", tenant_id: SCHOOL_B }));
    assertThrows(() => school.insert("tenants", { name: "x" }));
    assertThrows(() => school.update("classes", { tenant_id: SCHOOL_B }));
    assertThrows(() => school.update("tenants", { id: SCHOOL_B }));

    await school.update("classes", { name: "10C" }).eq("id", "x");
    await school.delete("classes").eq("id", "x");
    await school.update("tenants", { name: "New name" });
    assertEquals(db.queries.slice(1).map((q) => [q.op, q.filters[0]]), [
        ["update", ["tenant_id", SCHOOL_A]],
        ["delete", ["tenant_id", SCHOOL_A]],
        ["update", ["id", SCHOOL_A]],
    ]);
});

// ---------------------------------------------------------------------------
// Create a school (US-007.1 through the admin path)
// ---------------------------------------------------------------------------

const newSchool = {
    name: "Hope Academy",
    subdomain: "hope",
    contact_name: "Ma Kebbeh",
    contact_email: "office@hope.example",
};

Deno.test("create school: calls provision_tenant as the admin, and leaves the success row to the database", async () => {
    const db = setup();
    db.rpcResult = { data: SCHOOL_A, error: null };
    const res = await createSchool(() => db.asClient())(call("admin-token", newSchool));
    assertEquals(res.status, 201);
    assertEquals(await res.json(), { tenant_id: SCHOOL_A });
    assertEquals(db.rpcCalls, [{
        name: "provision_tenant",
        args: {
            p_name: "Hope Academy",
            p_subdomain: "hope",
            p_contact_name: "Ma Kebbeh",
            p_contact_email: "office@hope.example",
            p_actor_id: ADMIN,
        },
    }]);
    // provision_tenant() writes tenant.create in the same transaction (MIG-0010 tests), so no second row here.
    assertEquals(db.auditRows.length, 0);
});

Deno.test("create school: database errors become clear 4xx answers, and are audited", async () => {
    const cases: [string, number][] = [
        ["subdomain_taken: hope is already used", 409],
        ["reserved_subdomain: admin is reserved", 400],
        ["invalid_subdomain: use 3-30 lowercase letters", 400],
        ["not_platform_admin: x is not an active Platform Admin", 403],
    ];
    for (const [message, status] of cases) {
        const db = setup();
        db.rpcResult = { data: null, error: { message } };
        const res = await createSchool(() => db.asClient())(call("admin-token", newSchool));
        const code = message.split(":")[0];
        assertEquals(res.status, status, message);
        assertEquals((await res.json()).error, code);
        assertEquals(db.auditRows.map((r) => [r.action, r.reason]), [["tenant.create", code]]);
    }
});

Deno.test("create school: a missing field is a 400 and the database isn't called", async () => {
    const db = setup();
    const res = await createSchool(() => db.asClient())(call("admin-token", { ...newSchool, contact_email: undefined }));
    assertEquals(res.status, 400);
    assertEquals((await res.json()).error, "invalid_input");
    assertEquals(db.rpcCalls.length, 0);
});

Deno.test("create school: a teacher is refused and the database isn't called", async () => {
    const db = setup();
    const res = await createSchool(() => db.asClient())(call("teacher-token", newSchool));
    assertEquals(res.status, 403);
    assertEquals(db.rpcCalls.length, 0);
    assertEquals(db.auditRows[0].result, "denied");
});

// ---------------------------------------------------------------------------
// Repo rules (US-013.1, US-014.1)
// ---------------------------------------------------------------------------

const functionsDir = new URL("../", import.meta.url);

async function sourceFiles(dir: URL): Promise<URL[]> {
    const out: URL[] = [];
    for await (const e of Deno.readDir(dir)) {
        const u = new URL(e.name + (e.isDirectory ? "/" : ""), dir);
        if (e.isDirectory && e.name !== "_shared" && e.name !== "tests" && e.name !== "node_modules") {
            out.push(...(await sourceFiles(u)));
        } else if (e.isFile && e.name.endsWith(".ts")) out.push(u);
    }
    return out;
}

Deno.test("every admin-* function is built with adminHandler()", async () => {
    let found = 0;
    for await (const e of Deno.readDir(functionsDir)) {
        if (!e.isDirectory || !e.name.startsWith("admin-")) continue;
        found++;
        const dir = new URL(e.name + "/", functionsDir);
        const code = (await Promise.all((await sourceFiles(dir)).map((u) => Deno.readTextFile(u)))).join("\n");
        assert(code.includes("adminHandler("), `${e.name} doesn't use adminHandler()`);
    }
    assert(found > 0, "no admin-* functions found");
});

Deno.test("only _shared/client.ts touches the service role key or creates a client", async () => {
    for (const u of await sourceFiles(functionsDir)) {
        const code = await Deno.readTextFile(u);
        const where = u.pathname.split("/functions/")[1];
        assert(!code.includes("SUPABASE_SERVICE_ROLE_KEY"), `${where} reads the service role key`);
        assert(!/\bcreateClient\s*\(/.test(code), `${where} creates its own client`);
        assert(!code.includes("_shared/client.ts"), `${where} imports the service-role client`);
    }
});
