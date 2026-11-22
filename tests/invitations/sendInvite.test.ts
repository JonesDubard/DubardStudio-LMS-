// US-008b.5. Run with: npx tsx --test tests/invitations/sendInvite.test.ts
// (or any runner that runs TypeScript with node:test). No network, no database:
// a small in-memory stand-in for upsert_invitation / mark_invitation_sent follows the same
// rules as migration 0018, which tests/rls/0018_invitation_send_tests.sql checks for real.
import test from "node:test";
import assert from "node:assert/strict";
import { buildAcceptUrl, hashToken, sendInvite, type Rpc } from "../../lib/invitations/sendInvite";
import { inviteFirstSchoolAdmin, resendSchoolAdminInvite } from "../../lib/invitations/schoolAdminInvite";
import type { EmailSender } from "../../lib/email/resend";

interface Inv { id: string; tenant_id: string; email: string; role: string; token_hash: string; status: string; sent_at: string | null }

function fakeDb() {
  const rows: Inv[] = [];
  let n = 0;
  const db: Rpc = {
    async rpc(fn, a) {
      if (fn === "upsert_invitation") {
        const email = String(a.p_email).trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { data: null, error: { message: "invalid_email: a valid email is required" } };
        const hit = rows.find((r) => r.tenant_id === a.p_tenant_id && r.email === email && r.role === a.p_role && r.status === "pending");
        if (hit) { hit.token_hash = String(a.p_token_hash); hit.sent_at = null; return { data: [{ invitation_id: hit.id, reused: true }], error: null }; }
        const r = { id: `inv-${++n}`, tenant_id: String(a.p_tenant_id), email, role: String(a.p_role), token_hash: String(a.p_token_hash), status: "pending", sent_at: null };
        rows.push(r);
        return { data: [{ invitation_id: r.id, reused: false }], error: null };
      }
      if (fn === "mark_invitation_sent") {
        const r = rows.find((x) => x.id === a.p_invitation_id && x.status === "pending" && x.token_hash === a.p_token_hash);
        if (r) r.sent_at = "now";
        return { data: !!r, error: null };
      }
      throw new Error(`unexpected rpc ${fn}`);
    },
  };
  return { db, rows };
}

function fakeMail(failTimes = 0) {
  const sent: { to: string; acceptUrl: string; key?: string }[] = [];
  let left = failTimes;
  const send: EmailSender = async (to, _t, data, key) => {
    if (left > 0) { left--; return { ok: false, error: "resend_500" }; }
    sent.push({ to, acceptUrl: (data as { acceptUrl: string }).acceptUrl, key });
    return { ok: true, id: "e1" };
  };
  return { send, sent };
}

const school = { id: "t1", name: "Sint-Jan College", contact_email: "Ada@Example.test", contact_name: "Ada" };
let tok = 0;
const opts = (db: Rpc, send: EmailSender) => ({ db, send, newToken: () => `token-number-${String(++tok).padStart(4, "0")}-padding`, acceptUrl: (t: string) => `https://app.test/invite?token=${t}` });

test("creating a school sends exactly one School Admin invite and sets sent_at", async () => {
  const { db, rows } = fakeDb(); const { send, sent } = fakeMail();
  const r = await inviteFirstSchoolAdmin(school, opts(db, send));
  assert.deepEqual([r.ok, r.ok && r.sent], [true, true]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "ada@example.test");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].role, "school_admin");
  assert.equal(rows[0].sent_at, "now");
});

test("the emailed link carries the token whose hash is stored (and never the hash)", async () => {
  const { db, rows } = fakeDb(); const { send, sent } = fakeMail();
  await inviteFirstSchoolAdmin(school, opts(db, send));
  const token = new URL(sent[0].acceptUrl).searchParams.get("token")!;
  assert.equal(rows[0].token_hash, hashToken(token));
  assert.notEqual(token, rows[0].token_hash);
  assert.ok(token.length >= 20 && token.length <= 200, "0016 accepts tokens of 20-200 characters");
});

test("hashToken is sha256 hex, as invitation_token_hash() in 0016", () => {
  assert.equal(hashToken("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("a failed send leaves sent_at empty, still reports the invitation, and sends nothing", async () => {
  const { db, rows } = fakeDb(); const { send, sent } = fakeMail(1);
  const r = await inviteFirstSchoolAdmin(school, opts(db, send));
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.sent, false);
  assert.equal(r.ok && !r.sent && r.emailError, "resend_500");
  assert.equal(rows[0].sent_at, null);
  assert.equal(sent.length, 0);
});

test("a failed send can be resent: same invitation, sent_at set, one email", async () => {
  const { db, rows } = fakeDb(); const { send, sent } = fakeMail(1);
  const first = await inviteFirstSchoolAdmin(school, opts(db, send));
  const again = await resendSchoolAdminInvite("t1", { ...opts(db, send), read: readerFor(db, rows, school) });
  assert.ok(first.ok && again.ok);
  assert.equal(again.ok && again.sent, true);
  assert.equal(again.ok && again.invitationId, first.ok && first.invitationId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sent_at, "now");
  assert.equal(sent.length, 1);
});

test("resending never creates a second invitation, and only the newest link matches", async () => {
  const { db, rows } = fakeDb(); const { send, sent } = fakeMail();
  await inviteFirstSchoolAdmin(school, opts(db, send));
  for (let i = 0; i < 4; i++) await resendSchoolAdminInvite("t1", { ...opts(db, send), read: readerFor(db, rows, school) });
  assert.equal(rows.length, 1);
  assert.equal(sent.length, 5);
  const tokens = sent.map((s) => new URL(s.acceptUrl).searchParams.get("token")!);
  assert.equal(new Set(tokens).size, 5, "every send has its own link");
  assert.equal(rows[0].token_hash, hashToken(tokens[4]));
  for (const old of tokens.slice(0, 4)) assert.notEqual(rows[0].token_hash, hashToken(old));
});

test("a retry of the same send uses the same idempotency key (Resend will not deliver twice)", async () => {
  const { db } = fakeDb(); const { send, sent } = fakeMail();
  const o = { ...opts(db, send), newToken: () => "same-token-for-both-calls-xyz" };
  await sendInvite({ tenantId: "t1", schoolName: "S", email: "a@example.test", role: "teacher" }, o);
  await sendInvite({ tenantId: "t1", schoolName: "S", email: "a@example.test", role: "teacher" }, o);
  assert.equal(sent[0].key, sent[1].key);
});

test("resend with nothing open (accepted, or never created) is an error, not a new invitation", async () => {
  const { db, rows } = fakeDb(); const { send, sent } = fakeMail();
  await inviteFirstSchoolAdmin(school, opts(db, send));
  rows[0].status = "accepted";
  const r = await resendSchoolAdminInvite("t1", { ...opts(db, send), read: readerFor(db, rows, school) });
  assert.deepEqual([r.ok, !r.ok && r.code], [false, "no_open_invite"]);
  assert.equal(rows.length, 1);
  assert.equal(sent.length, 1);
});

test("resend for an unknown school is refused", async () => {
  const { db, rows } = fakeDb(); const { send } = fakeMail();
  const r = await resendSchoolAdminInvite("nope", { ...opts(db, send), read: readerFor(db, rows, school) });
  assert.deepEqual([r.ok, !r.ok && r.code], [false, "school_not_found"]);
});

test("a database refusal is returned with its code and no email is sent", async () => {
  const { send, sent } = fakeMail();
  const db: Rpc = { async rpc() { return { data: null, error: { message: "school_suspended" } }; } };
  const r = await sendInvite({ tenantId: "t1", schoolName: "S", email: "a@example.test", role: "teacher" }, { db, send });
  assert.deepEqual([r.ok, !r.ok && r.code], [false, "school_suspended"]);
  assert.equal(sent.length, 0);
});

test("a bad email is refused before anything is sent", async () => {
  const { db, rows } = fakeDb(); const { send, sent } = fakeMail();
  const r = await sendInvite({ tenantId: "t1", schoolName: "S", email: "nope", role: "teacher" }, opts(db, send));
  assert.deepEqual([r.ok, !r.ok && r.code], [false, "invalid_email"]);
  assert.equal(rows.length + sent.length, 0);
});

test("if sent_at cannot be saved after the email went out, it is reported as not sent (safe to resend)", async () => {
  const { db } = fakeDb(); const { send } = fakeMail();
  const flaky: Rpc = { rpc: (fn, a) => fn === "mark_invitation_sent" ? Promise.resolve({ data: null, error: { message: "boom" } }) : db.rpc(fn, a) };
  const r = await sendInvite({ tenantId: "t1", schoolName: "S", email: "a@example.test", role: "teacher" }, { db: flaky, send });
  assert.equal(r.ok && r.sent, false);
});

test("teacher and parent invites use the same function", async () => {
  const { db, rows } = fakeDb(); const { send, sent } = fakeMail();
  await sendInvite({ tenantId: "t1", schoolName: "S", email: "t@example.test", role: "teacher", invitedBy: "u1" }, opts(db, send));
  await sendInvite({ tenantId: "t1", schoolName: "S", email: "p@example.test", role: "parent", invitedBy: "u1" }, opts(db, send));
  assert.deepEqual(rows.map((r) => r.role), ["teacher", "parent"]);
  assert.equal(sent.length, 2);
});

// A stand-in for supabase.from(...).select(...).eq(...).maybeSingle() over the fake rows.
function readerFor(_db: Rpc, rows: Inv[], sch: typeof school) {
  return {
    from(table: string) {
      return {
        select() {
          const filters: [string, string][] = [];
          const q: any = {
            eq(c: string, v: string) { filters.push([c, v]); return q; },
            limit() { return q; },
            async maybeSingle() {
              if (table === "tenants") return { data: filters.some(([c, v]) => c === "id" && v === sch.id) ? { id: sch.id, name: sch.name } : null };
              const r = rows.find((x) => filters.every(([c, v]) => (x as any)[c] === v));
              return { data: r ? { email: r.email } : null };
            },
          };
          return q;
        },
      };
    },
  };
}

test("buildAcceptUrl: default, token in the path, school address, and encoding", () => {
  assert.equal(buildAcceptUrl("a b", null, { APP_URL: "https://app.test/" } as any), "https://app.test/invite?token=a%20b");
  assert.equal(buildAcceptUrl("tok", null, { INVITE_URL_TEMPLATE: "https://app.test/invite/{token}" } as any), "https://app.test/invite/tok");
  assert.equal(buildAcceptUrl("tok", "sint-jan", { INVITE_URL_TEMPLATE: "https://{subdomain}.app.test/invite?token={token}" } as any), "https://sint-jan.app.test/invite?token=tok");
  assert.throws(() => buildAcceptUrl("tok", null, { INVITE_URL_TEMPLATE: "https://{subdomain}.app.test/{token}" } as any));
});