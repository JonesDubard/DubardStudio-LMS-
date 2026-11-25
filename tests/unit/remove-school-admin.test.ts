import { describe, expect, it } from "vitest";
import type { Rpc } from "../../lib/invitations/sendInvite";
import { removeSchoolAdmin, removeSchoolAdminError } from "../../lib/people/removeSchoolAdmin";

const SCHOOL_A = "a0000000-0000-4000-8000-000000000000";
const SCHOOL_B = "b0000000-0000-4000-8000-000000000000";
const PA = "f0000000-0000-4000-8000-000000000001"; // active Platform Admin
const PA_OFF = "f0000000-0000-4000-8000-000000000002"; // inactive Platform Admin
const ADMIN_A1 = "a0000000-0000-4000-8000-000000000001";
const ADMIN_A2 = "a0000000-0000-4000-8000-000000000002";
const ADMIN_B1 = "b0000000-0000-4000-8000-000000000001";

type Membership = { id: string; tenant_id: string; profile_id: string; role: string; status: string };

function fakeDb() {
  const memberships: Membership[] = [
    { id: "m1", tenant_id: SCHOOL_A, profile_id: ADMIN_A1, role: "school_admin", status: "active" },
    { id: "m2", tenant_id: SCHOOL_A, profile_id: ADMIN_A2, role: "school_admin", status: "active" },
    { id: "m3", tenant_id: SCHOOL_B, profile_id: ADMIN_B1, role: "school_admin", status: "active" },
  ];
  const audit: Record<string, unknown>[] = [];
  const platformAdmins = new Map([[PA, true], [PA_OFF, false]]);
  const calls: { fn: string; args: Record<string, unknown> }[] = [];

  const db: Rpc = {
    async rpc(fn, a) {
      calls.push({ fn, args: a });
      if (fn !== "remove_school_admin") throw new Error(`unexpected rpc ${fn}`);
      const isPlatformAdmin = platformAdmins.get(String(a.p_actor_id)) === true;
      const isSchoolAdminHere = memberships.some(
        (x) => x.profile_id === a.p_actor_id && x.tenant_id === a.p_tenant_id
          && x.role === "school_admin" && x.status === "active",
      );
      if (!isPlatformAdmin && !isSchoolAdminHere) {
        return { data: null, error: { message: "not_allowed: only a Platform Admin or an active School Admin of this school can remove a School Admin" } };
      }
      const m = memberships.find(
        (x) => x.tenant_id === a.p_tenant_id && x.profile_id === a.p_profile_id
          && x.role === "school_admin" && x.status !== "removed",
      );
      if (!m) return { data: null, error: { message: "admin_not_found: no School Admin" } };
      const others = memberships.filter(
        (x) => x.tenant_id === m.tenant_id && x.role === "school_admin" && x.status === "active" && x.id !== m.id,
      );
      if (m.status === "active" && others.length === 0) {
        return { data: null, error: { message: "last_school_admin: a school needs at least one active School Admin" } };
      }
      m.status = "removed";
      audit.push({
        actor_id: a.p_actor_id, actor_kind: isPlatformAdmin ? "platform_admin" : "user",
        tenant_id: m.tenant_id, action: "membership.remove", resource_id: m.id,
      });
      return { data: true, error: null };
    },
  };
  return { db, memberships, audit, calls };
}

describe("removeSchoolAdmin (US-037)", () => {
  it("a Platform Admin removes a School Admin: the membership is removed and audited", async () => {
    const f = fakeDb();
    const r = await removeSchoolAdmin(PA, SCHOOL_A, ADMIN_A2, { db: f.db });
    expect(r).toEqual({ ok: true });
    expect(f.memberships.find((m) => m.id === "m2")?.status).toBe("removed");
    expect(f.audit).toEqual([
      { actor_id: PA, actor_kind: "platform_admin", tenant_id: SCHOOL_A, action: "membership.remove", resource_id: "m2" },
    ]);
    expect(f.calls[0].args).toEqual({ p_tenant_id: SCHOOL_A, p_profile_id: ADMIN_A2, p_actor_id: PA });
  });

  it("the last active School Admin can't be removed, and nothing is audited", async () => {
    const f = fakeDb();
    await removeSchoolAdmin(PA, SCHOOL_A, ADMIN_A2, { db: f.db });
    const r = await removeSchoolAdmin(PA, SCHOOL_A, ADMIN_A1, { db: f.db });
    expect(r).toEqual({ ok: false, code: "last_school_admin" });
    expect(f.memberships.find((m) => m.id === "m1")?.status).toBe("active");
    expect(f.audit).toHaveLength(1);
  });

  it("a School Admin removes another School Admin of their school: audited as a user", async () => {
    const f = fakeDb();
    const r = await removeSchoolAdmin(ADMIN_A1, SCHOOL_A, ADMIN_A2, { db: f.db });
    expect(r).toEqual({ ok: true });
    expect(f.audit).toEqual([
      { actor_id: ADMIN_A1, actor_kind: "user", tenant_id: SCHOOL_A, action: "membership.remove", resource_id: "m2" },
    ]);
  });

  it("an inactive Platform Admin, or another school's School Admin, is refused and nothing changes", async () => {
    for (const actor of [PA_OFF, ADMIN_B1]) {
      const f = fakeDb();
      const r = await removeSchoolAdmin(actor, SCHOOL_A, ADMIN_A2, { db: f.db });
      expect(r).toEqual({ ok: false, code: "not_allowed" });
      expect(f.memberships.every((m) => m.status === "active")).toBe(true);
      expect(f.audit).toHaveLength(0);
    }
  });

  it("another school's School Admin is not found through this school", async () => {
    const f = fakeDb();
    const r = await removeSchoolAdmin(PA, SCHOOL_A, ADMIN_B1, { db: f.db });
    expect(r).toEqual({ ok: false, code: "admin_not_found" });
    expect(f.memberships.find((m) => m.id === "m3")?.status).toBe("active");
  });

  it("a School Admin who was removed can't remove anyone any more", async () => {
    const f = fakeDb();
    await removeSchoolAdmin(PA, SCHOOL_A, ADMIN_A2, { db: f.db });
    const r = await removeSchoolAdmin(ADMIN_A2, SCHOOL_A, ADMIN_A1, { db: f.db });
    expect(r).toEqual({ ok: false, code: "not_allowed" });
  });

  it("removing the same person twice: the second time is not found", async () => {
    const f = fakeDb();
    await removeSchoolAdmin(PA, SCHOOL_A, ADMIN_A2, { db: f.db });
    const r = await removeSchoolAdmin(PA, SCHOOL_A, ADMIN_A2, { db: f.db });
    expect(r).toEqual({ ok: false, code: "admin_not_found" });
    expect(f.audit).toHaveLength(1);
  });

  it("an unexpected answer from the database is a failure, not a success", async () => {
    const db: Rpc = { rpc: async () => ({ data: null, error: null }) };
    expect(await removeSchoolAdmin(PA, SCHOOL_A, ADMIN_A2, { db })).toEqual({ ok: false, code: "remove_failed" });
  });

  it("every refusal has a plain sentence", () => {
    expect(removeSchoolAdminError("last_school_admin")).toMatch(/last active School Admin/);
    expect(removeSchoolAdminError("admin_not_found")).toMatch(/not found/);
    expect(removeSchoolAdminError("not_allowed")).toMatch(/can't remove/);
    expect(removeSchoolAdminError("something_else")).toBe("The School Admin was not removed.");
  });
});
