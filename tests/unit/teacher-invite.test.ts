// US-030.3: invite a teacher. No network, no database: small in-memory stand-ins follow the
// rules of migrations 0018 and 0019, which tests/rls/0019_create_school_invitation_tests.sql
// checks against a real database.
import { describe, expect, it } from "vitest";
import type { Rpc } from "../../lib/invitations/sendInvite";
import type { EmailSender } from "../../lib/email/resend";
import {
  inviteTeacher,
  resendTeacherInvite,
  teacherInviteError,
  type Caller,
} from "../../lib/invitations/teacherInvite";

const SCHOOL_A = "a0000000-0000-4000-8000-000000000000";
const SCHOOL_B = "b0000000-0000-4000-8000-000000000000";
const ADMIN_A = "a0000000-0000-4000-8000-000000000001";
const ADMIN_B = "b0000000-0000-4000-8000-000000000001";

type Row = Record<string, unknown>;

/** A tiny stand-in for the database: tables for reads, and the three invite functions. */
function fakeDb() {
  const tables: Record<string, Row[]> = {
    tenants: [
      { id: SCHOOL_A, name: "School A", subdomain: "school-a", logo_url: null, primary_color: null },
      { id: SCHOOL_B, name: "School B", subdomain: "school-b", logo_url: null, primary_color: null },
    ],
    profiles: [
      { id: ADMIN_A, full_name: "Admin A" },
      { id: ADMIN_B, full_name: "Admin B" },
    ],
    memberships: [
      { id: "m1", profile_id: ADMIN_A, tenant_id: SCHOOL_A, role: "school_admin", status: "active" },
      { id: "m2", profile_id: ADMIN_B, tenant_id: SCHOOL_B, role: "school_admin", status: "active" },
    ],
    invitations: [],
  };
  const teachers = new Set<string>(); // "tenant|email" of existing teachers
  const calls: string[] = [];
  let n = 0;

  const db: Rpc = {
    async rpc(fn, a) {
      calls.push(fn);
      const email = String(a.p_email).trim().toLowerCase();
      const open = () =>
        tables.invitations.find(
          (r) => r.tenant_id === a.p_tenant_id && r.email === email && r.role === a.p_role && r.status === "pending",
        );
      if (fn === "create_school_invitation") {
        const admin = tables.memberships.find(
          (m) => m.profile_id === a.p_invited_by && m.tenant_id === a.p_tenant_id
            && m.role === "school_admin" && m.status === "active",
        );
        if (!admin) return { data: null, error: { message: "not_school_admin: only an active School Admin of this school can invite" } };
        if (teachers.has(`${a.p_tenant_id}|${email}`)) return { data: null, error: { message: `already_member: ${email} already has this role` } };
        if (open()) return { data: null, error: { message: `already_invited: ${email} already has an open invite` } };
        const row = { id: `inv-${++n}`, tenant_id: a.p_tenant_id, email, role: a.p_role, token_hash: a.p_token_hash, status: "pending", sent_at: null };
        tables.invitations.push(row);
        return { data: [{ invitation_id: row.id, reused: false }], error: null };
      }
      if (fn === "upsert_invitation") {
        const hit = open();
        if (hit) {
          hit.token_hash = a.p_token_hash;
          hit.sent_at = null;
          return { data: [{ invitation_id: hit.id, reused: true }], error: null };
        }
        const row = { id: `inv-${++n}`, tenant_id: a.p_tenant_id, email, role: a.p_role, token_hash: a.p_token_hash, status: "pending", sent_at: null };
        tables.invitations.push(row);
        return { data: [{ invitation_id: row.id, reused: false }], error: null };
      }
      if (fn === "mark_invitation_sent") {
        const r = tables.invitations.find((x) => x.id === a.p_invitation_id && x.token_hash === a.p_token_hash);
        if (r) r.sent_at = "now";
        return { data: Boolean(r), error: null };
      }
      throw new Error(`unexpected rpc ${fn}`);
    },
  };

  // from(table).select(...).eq(col, val)...maybeSingle()
  const read = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      const q = {
        select: () => q,
        eq: (col: string, val: unknown) => {
          filters.push([col, val]);
          return q;
        },
        maybeSingle: async () => ({
          data: (tables[table] ?? []).find((r) => filters.every(([c, v]) => r[c] === v)) ?? null,
          error: null,
        }),
      };
      return q;
    },
  };

  return { db, read, tables, teachers, calls };
}

function fakeMail(fail = false) {
  const sent: { to: string; acceptUrl: string }[] = [];
  const send: EmailSender = async (to, _template, data) => {
    if (fail) return { ok: false, error: "resend_500" };
    sent.push({ to, acceptUrl: (data as { acceptUrl: string }).acceptUrl });
    return { ok: true, id: "e1" };
  };
  return { send, sent };
}

let tok = 0;
function deps(f: ReturnType<typeof fakeDb>, send: EmailSender) {
  return {
    db: f.db,
    read: f.read,
    send,
    newToken: () => `teacher-token-${String(++tok).padStart(4, "0")}-padding`,
    acceptUrl: (t: string, sub?: string | null) => `https://${sub}.test/invite/${t}`,
  };
}

const adminA: Caller = { userId: ADMIN_A, tenantId: SCHOOL_A, roles: ["school_admin"] };

describe("inviteTeacher (US-030)", () => {
  it("a School Admin invites a teacher: one invitation in their school, one email, sent_at set", async () => {
    const f = fakeDb();
    const mail = fakeMail();
    const r = await inviteTeacher(adminA, " New.Teacher@Example.test ", deps(f, mail.send));
    expect(r).toMatchObject({ ok: true, sent: true, reused: false });
    expect(f.tables.invitations).toHaveLength(1);
    expect(f.tables.invitations[0]).toMatchObject({ tenant_id: SCHOOL_A, role: "teacher", email: "new.teacher@example.test", sent_at: "now" });
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe("new.teacher@example.test");
    expect(mail.sent[0].acceptUrl).toMatch(/^https:\/\/school-a\.test\/invite\//);
    expect(f.calls[0]).toBe("create_school_invitation"); // create only, never "create or reuse"
  });

  it("a second invite to the same email is refused and sends nothing", async () => {
    const f = fakeDb();
    const mail = fakeMail();
    await inviteTeacher(adminA, "new.teacher@example.test", deps(f, mail.send));
    const again = await inviteTeacher(adminA, "NEW.TEACHER@example.test", deps(f, mail.send));
    expect(again).toMatchObject({ ok: false, code: "already_invited" });
    expect(f.tables.invitations).toHaveLength(1);
    expect(mail.sent).toHaveLength(1);
  });

  it("someone who is already a teacher here is refused and gets no email", async () => {
    const f = fakeDb();
    f.teachers.add(`${SCHOOL_A}|teacher@example.test`);
    const mail = fakeMail();
    const r = await inviteTeacher(adminA, "teacher@example.test", deps(f, mail.send));
    expect(r).toMatchObject({ ok: false, code: "already_member" });
    expect(mail.sent).toHaveLength(0);
  });

  it("a teacher can't invite, and nothing reaches the database", async () => {
    const f = fakeDb();
    const mail = fakeMail();
    const teacher: Caller = { userId: "t1", tenantId: SCHOOL_A, roles: ["teacher"] };
    expect(await inviteTeacher(teacher, "x@example.test", deps(f, mail.send))).toMatchObject({ ok: false, code: "not_school_admin" });
    expect(f.calls).toHaveLength(0);
    expect(mail.sent).toHaveLength(0);
  });

  it("a parent can't invite", async () => {
    const f = fakeDb();
    const parent: Caller = { userId: "p1", tenantId: SCHOOL_A, roles: ["parent"] };
    expect(await inviteTeacher(parent, "x@example.test", deps(f, fakeMail().send))).toMatchObject({ ok: false, code: "not_school_admin" });
    expect(f.tables.invitations).toHaveLength(0);
  });

  it("a token with no school (e.g. a Platform Admin) can't invite", async () => {
    const f = fakeDb();
    const noSchool: Caller = { userId: "pa", tenantId: null, roles: ["school_admin"] };
    expect(await inviteTeacher(noSchool, "x@example.test", deps(f, fakeMail().send))).toMatchObject({ ok: false, code: "not_school_admin" });
  });

  it("another school's admin only ever invites into their own school", async () => {
    const f = fakeDb();
    const adminB: Caller = { userId: ADMIN_B, tenantId: SCHOOL_B, roles: ["school_admin"] };
    await inviteTeacher(adminB, "x@example.test", deps(f, fakeMail().send));
    expect(f.tables.invitations.map((r) => r.tenant_id)).toEqual([SCHOOL_B]);
  });

  it("a stale token is refused by the database (the admin was removed after signing in)", async () => {
    const f = fakeDb();
    f.tables.memberships[0].status = "removed";
    const mail = fakeMail();
    const r = await inviteTeacher(adminA, "x@example.test", deps(f, mail.send));
    expect(r).toMatchObject({ ok: false, code: "not_school_admin" });
    expect(mail.sent).toHaveLength(0);
  });

  it("a failed email keeps the invitation, unsent, so it can be resent", async () => {
    const f = fakeDb();
    const r = await inviteTeacher(adminA, "x@example.test", deps(f, fakeMail(true).send));
    expect(r).toMatchObject({ ok: true, sent: false });
    expect(f.tables.invitations).toHaveLength(1);
    expect(f.tables.invitations[0].sent_at).toBeNull();
  });
});

describe("resendTeacherInvite (US-030)", () => {
  it("resends the same invitation with a new link, and never makes a second one", async () => {
    const f = fakeDb();
    const mail = fakeMail();
    await inviteTeacher(adminA, "x@example.test", deps(f, mail.send));
    const id = String(f.tables.invitations[0].id);
    const firstHash = f.tables.invitations[0].token_hash;
    const r = await resendTeacherInvite(adminA, id, deps(f, mail.send));
    expect(r).toMatchObject({ ok: true, sent: true, reused: true, invitationId: id });
    expect(f.tables.invitations).toHaveLength(1);
    expect(f.tables.invitations[0].token_hash).not.toBe(firstHash);
    expect(mail.sent).toHaveLength(2);
    expect(mail.sent[1].acceptUrl).not.toBe(mail.sent[0].acceptUrl);
  });

  it("another school's admin can't resend this school's invite", async () => {
    const f = fakeDb();
    await inviteTeacher(adminA, "x@example.test", deps(f, fakeMail().send));
    const adminB: Caller = { userId: ADMIN_B, tenantId: SCHOOL_B, roles: ["school_admin"] };
    const mail = fakeMail();
    const r = await resendTeacherInvite(adminB, String(f.tables.invitations[0].id), deps(f, mail.send));
    expect(r).toMatchObject({ ok: false, code: "no_open_invite" });
    expect(mail.sent).toHaveLength(0);
  });

  it("a removed admin can't resend, even with a token that still says school_admin", async () => {
    const f = fakeDb();
    await inviteTeacher(adminA, "x@example.test", deps(f, fakeMail().send));
    f.tables.memberships[0].status = "removed";
    const r = await resendTeacherInvite(adminA, String(f.tables.invitations[0].id), deps(f, fakeMail().send));
    expect(r).toMatchObject({ ok: false, code: "not_school_admin" });
  });

  it("an accepted invite can't be resent", async () => {
    const f = fakeDb();
    await inviteTeacher(adminA, "x@example.test", deps(f, fakeMail().send));
    f.tables.invitations[0].status = "accepted";
    const r = await resendTeacherInvite(adminA, String(f.tables.invitations[0].id), deps(f, fakeMail().send));
    expect(r).toMatchObject({ ok: false, code: "no_open_invite" });
  });
});

describe("teacherInviteError", () => {
  it("gives a clear sentence for each refusal, and a safe default", () => {
    expect(teacherInviteError("already_invited")).toContain("Resend");
    expect(teacherInviteError("already_member")).toContain("already a teacher");
    expect(teacherInviteError("not_school_admin")).toContain("School Admin");
    expect(teacherInviteError("something_new")).toBe("The invite was not sent. Try again in a moment.");
  });
});
