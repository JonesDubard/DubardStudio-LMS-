import { describe, expect, it } from "vitest";
import { sendInvite, type Rpc } from "../../lib/invitations/sendInvite";
import type { EmailSender } from "../../lib/email/resend";
import { inviteSchoolAdmin, resendSchoolAdminInvite } from "../../lib/invitations/schoolAdminInvite";

const SCHOOL_A = "a0000000-0000-4000-8000-000000000000";
const SCHOOL_B = "b0000000-0000-4000-8000-000000000000";
const PA = "f0000000-0000-4000-8000-000000000001"; // active Platform Admin
const PA_OFF = "f0000000-0000-4000-8000-000000000002"; // inactive Platform Admin
const SCHOOL_ADMIN_A = "a0000000-0000-4000-8000-000000000001"; // a School Admin, not a Platform Admin

type Row = Record<string, unknown>;

/** A tiny stand-in for the database: tables for reads, and the invite functions. */
function fakeDb() {
  const tables: Record<string, Row[]> = {
    tenants: [
      { id: SCHOOL_A, name: "School A", subdomain: "school-a", logo_url: null, primary_color: null },
      { id: SCHOOL_B, name: "School B", subdomain: "school-b", logo_url: null, primary_color: null },
    ],
    invitations: [],
    audit_log: [],
  };
  const platformAdmins = new Map([[PA, true], [PA_OFF, false]]);
  const schoolAdmins = new Set<string>([`${SCHOOL_A}|admin@school-a.test`]); // "tenant|email"
  const calls: { fn: string; args: Row }[] = [];
  let n = 0;

  const db: Rpc = {
    async rpc(fn, a) {
      calls.push({ fn, args: a });
      const email = String(a.p_email ?? "").trim().toLowerCase();
      const open = (role: string) =>
        tables.invitations.find(
          (r) => r.tenant_id === a.p_tenant_id && r.email === email && r.role === role && r.status === "pending",
        );
      if (fn === "create_school_admin_invitation") {
        if (!platformAdmins.get(String(a.p_actor_id))) {
          return { data: null, error: { message: "not_platform_admin: only an active Platform Admin can invite a School Admin" } };
        }
        if (schoolAdmins.has(`${a.p_tenant_id}|${email}`)) return { data: null, error: { message: `already_member: ${email} is already a School Admin here` } };
        if (open("school_admin")) return { data: null, error: { message: `already_invited: ${email} already has an open invite` } };
        const row = { id: `inv-${++n}`, tenant_id: a.p_tenant_id, email, role: "school_admin", token_hash: a.p_token_hash, status: "pending", sent_at: null, invited_by: null };
        tables.invitations.push(row);
        tables.audit_log.push({ actor_id: a.p_actor_id, tenant_id: a.p_tenant_id, action: "invite.create", resource_id: row.id });
        return { data: [{ invitation_id: row.id, reused: false }], error: null };
      }
      if (fn === "upsert_invitation") {
        const hit = open(String(a.p_role));
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

  const read = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      const q = {
        select: () => q,
        eq: (col: string, val: unknown) => {
          filters.push([col, val]);
          return q;
        },
        limit: () => q,
        maybeSingle: async () => ({
          data: (tables[table] ?? []).find((r) => filters.every(([c, v]) => r[c] === v)) ?? null,
          error: null,
        }),
      };
      return q;
    },
  };

  return { db, read, tables, calls };
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
    newToken: () => `admin-token-${String(++tok).padStart(4, "0")}-padding-xx`,
    acceptUrl: (t: string, sub?: string | null) => `https://${sub}.test/invite/${t}`,
  };
}

describe("inviteSchoolAdmin (US-036)", () => {
  it("a Platform Admin invites a School Admin: one invitation in that school, one email, one audit row", async () => {
    const f = fakeDb();
    const mail = fakeMail();
    const r = await inviteSchoolAdmin(PA, SCHOOL_A, " Second.Admin@Example.test ", deps(f, mail.send));
    expect(r).toMatchObject({ ok: true, sent: true, reused: false });
    expect(f.tables.invitations).toHaveLength(1);
    expect(f.tables.invitations[0]).toMatchObject({
      tenant_id: SCHOOL_A, role: "school_admin", email: "second.admin@example.test", sent_at: "now", invited_by: null,
    });
    expect(f.tables.audit_log).toEqual([
      { actor_id: PA, tenant_id: SCHOOL_A, action: "invite.create", resource_id: f.tables.invitations[0].id },
    ]);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].acceptUrl).toMatch(/^https:\/\/school-a\.test\/invite\//);
  });

  it("uses the create-only Platform Admin function, with the Platform Admin as actor", async () => {
    const f = fakeDb();
    await inviteSchoolAdmin(PA, SCHOOL_A, "x@example.test", deps(f, fakeMail().send));
    expect(f.calls[0].fn).toBe("create_school_admin_invitation"); // never "create or reuse"
    expect(f.calls[0].args).toMatchObject({ p_tenant_id: SCHOOL_A, p_actor_id: PA });
  });

  it("a school can have several School Admins: a second email is a second invitation", async () => {
    const f = fakeDb();
    const mail = fakeMail();
    await inviteSchoolAdmin(PA, SCHOOL_A, "one@example.test", deps(f, mail.send));
    const r = await inviteSchoolAdmin(PA, SCHOOL_A, "two@example.test", deps(f, mail.send));
    expect(r).toMatchObject({ ok: true, sent: true });
    expect(f.tables.invitations).toHaveLength(2);
    expect(f.tables.audit_log).toHaveLength(2);
  });

  it("the same email again is refused with already_invited and no email goes out", async () => {
    const f = fakeDb();
    const mail = fakeMail();
    await inviteSchoolAdmin(PA, SCHOOL_A, "dup@example.test", deps(f, mail.send));
    const r = await inviteSchoolAdmin(PA, SCHOOL_A, "DUP@example.test", deps(f, mail.send));
    expect(r).toMatchObject({ ok: false, code: "already_invited" });
    expect(f.tables.invitations).toHaveLength(1);
    expect(f.tables.audit_log).toHaveLength(1);
    expect(mail.sent).toHaveLength(1);
  });

  it("someone who is already a School Admin here is refused with already_member", async () => {
    const f = fakeDb();
    const mail = fakeMail();
    const r = await inviteSchoolAdmin(PA, SCHOOL_A, "admin@school-a.test", deps(f, mail.send));
    expect(r).toMatchObject({ ok: false, code: "already_member" });
    expect(mail.sent).toHaveLength(0);
  });

  it("an inactive Platform Admin, or a School Admin, is refused by the database and nothing is sent", async () => {
    for (const actor of [PA_OFF, SCHOOL_ADMIN_A]) {
      const f = fakeDb();
      const mail = fakeMail();
      const r = await inviteSchoolAdmin(actor, SCHOOL_A, "x@example.test", deps(f, mail.send));
      expect(r).toMatchObject({ ok: false, code: "not_platform_admin" });
      expect(f.tables.invitations).toHaveLength(0);
      expect(f.tables.audit_log).toHaveLength(0);
      expect(mail.sent).toHaveLength(0);
    }
  });

  it("the invite is for the chosen school only", async () => {
    const f = fakeDb();
    await inviteSchoolAdmin(PA, SCHOOL_B, "b.admin@example.test", deps(f, fakeMail().send));
    expect(f.tables.invitations.map((r) => r.tenant_id)).toEqual([SCHOOL_B]);
  });

  it("an unknown school is refused before anything reaches the database", async () => {
    const f = fakeDb();
    const r = await inviteSchoolAdmin(PA, "c0000000-0000-4000-8000-000000000000", "x@example.test", deps(f, fakeMail().send));
    expect(r).toMatchObject({ ok: false, code: "school_not_found" });
    expect(f.calls).toHaveLength(0);
  });

  it("if the email fails, the invite stays as not sent", async () => {
    const f = fakeDb();
    const r = await inviteSchoolAdmin(PA, SCHOOL_A, "x@example.test", deps(f, fakeMail(true).send));
    expect(r).toMatchObject({ ok: true, sent: false });
    expect(f.tables.invitations[0].sent_at).toBeNull();
  });

  it("sendInvite refuses platformAdminId for any role other than school_admin", async () => {
    const f = fakeDb();
    const r = await sendInvite(
      { tenantId: SCHOOL_A, schoolName: "School A", email: "t@example.test", role: "teacher", platformAdminId: PA },
      deps(f, fakeMail().send),
    );
    expect(r).toMatchObject({ ok: false, code: "invalid_role" });
    expect(f.calls).toHaveLength(0);
  });
});

describe("resendSchoolAdminInvite with an invitation id (US-036)", () => {
  it("resends exactly that invite: same invitation, new link", async () => {
    const f = fakeDb();
    const mail = fakeMail();
    await inviteSchoolAdmin(PA, SCHOOL_A, "one@example.test", deps(f, mail.send));
    const second = await inviteSchoolAdmin(PA, SCHOOL_A, "two@example.test", deps(f, mail.send));
    const id = second.ok ? second.invitationId : "";
    const oldHash = f.tables.invitations[1].token_hash;

    const r = await resendSchoolAdminInvite(SCHOOL_A, deps(f, mail.send), id);
    expect(r).toMatchObject({ ok: true, sent: true, reused: true, invitationId: id });
    expect(f.tables.invitations).toHaveLength(2);
    expect(f.tables.invitations[1].token_hash).not.toBe(oldHash);
    expect(mail.sent.at(-1)?.to).toBe("two@example.test");
  });

  it("another school's invitation id is not found", async () => {
    const f = fakeDb();
    const mail = fakeMail();
    const b = await inviteSchoolAdmin(PA, SCHOOL_B, "b.admin@example.test", deps(f, mail.send));
    const r = await resendSchoolAdminInvite(SCHOOL_A, deps(f, mail.send), b.ok ? b.invitationId : "");
    expect(r).toMatchObject({ ok: false, code: "no_open_invite" });
    expect(mail.sent).toHaveLength(1);
  });

  it("an accepted invite can't be resent", async () => {
    const f = fakeDb();
    const mail = fakeMail();
    const a = await inviteSchoolAdmin(PA, SCHOOL_A, "done@example.test", deps(f, mail.send));
    f.tables.invitations[0].status = "accepted";
    const r = await resendSchoolAdminInvite(SCHOOL_A, deps(f, mail.send), a.ok ? a.invitationId : "");
    expect(r).toMatchObject({ ok: false, code: "no_open_invite" });
  });
});
