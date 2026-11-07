// NF-10 unit tests: templates, sendEmail, retries, failure log, Resend request,
// and "no API key in the repo". No network and no Resend account needed.
// The real send and bad-address checks (NF-10.7) are done with the email-test function.
//
// Run:  node --test tests/email_test.ts      |   deno test --allow-read tests/email_test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { EmailError, ProviderError, resendProvider, sendEmail } from "../supabase/functions/_shared/email.ts";
import type { EmailProvider, FailureInfo, OutgoingEmail } from "../supabase/functions/_shared/email.ts";
import { renderTemplate } from "../supabase/functions/_shared/email_templates.ts";
import type { School } from "../supabase/functions/_shared/email_templates.ts";

const SCHOOL: School = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Sint-Jan College",
  logoUrl: "https://cdn.example.org/logos/sint-jan.png",
  primaryColor: "#0a7d4b",
};
const FROM = "no-reply@mail.example.org";
const FAKE_KEY = "test-key-not-real";

function fakeProvider(script: (n: number, msg: OutgoingEmail, key: string) => { id: string } | ProviderError) {
  const calls: { msg: OutgoingEmail; key: string }[] = [];
  const provider: EmailProvider = {
    send(msg, { idempotencyKey }) {
      calls.push({ msg, key: idempotencyKey });
      const r = script(calls.length, msg, idempotencyKey);
      return r instanceof ProviderError ? Promise.reject(r) : Promise.resolve(r);
    },
  };
  return { provider, calls };
}
const opts = (provider: EmailProvider, extra: object = {}) => ({
  provider, fromAddress: FROM, sleep: () => Promise.resolve(), log: () => {}, ...extra,
});
const invite = { school: SCHOOL, acceptUrl: "https://app.example.org/accept?t=1", roleLabel: "teacher", inviterName: "Mrs. Peeters" };

// ---------------------------------------------------------------------------
// NF-10.4 templates
// ---------------------------------------------------------------------------

test("each template shows the school's name and logo", () => {
  const rendered = [
    renderTemplate("invite", invite),
    renderTemplate("password_reset", { school: SCHOOL, resetUrl: "https://app.example.org/reset?t=1" }),
    renderTemplate("weekly_digest", { school: SCHOOL, weekLabel: "3 to 9 November", appUrl: "https://app.example.org", items: [{ title: "Lesson published" }] }),
  ];
  for (const r of rendered) {
    assert.ok(r.html.includes("Sint-Jan College"));
    assert.ok(r.html.includes('<img src="https://cdn.example.org/logos/sint-jan.png"'));
    assert.ok(r.html.includes("#0a7d4b"));
    assert.ok(r.text.includes("Sint-Jan College"));
    assert.ok(r.subject.length > 0 && !/[\r\n]/.test(r.subject));
  }
});

test("without a usable logo the school's name is shown as text", () => {
  for (const logoUrl of [null, undefined, "", "javascript:alert(1)", "http://insecure.example.org/a.png", "tenant-files/x/logos/y/a.png"]) {
    const r = renderTemplate("invite", { ...invite, school: { ...SCHOOL, logoUrl } });
    assert.ok(!r.html.includes("<img"), String(logoUrl));
    assert.ok(r.html.includes("Sint-Jan College"));
  }
});

test("names and text from data cannot inject HTML", () => {
  const evil = '<script>alert(1)</script> "x" & <b>';
  const r = renderTemplate("invite", { school: { ...SCHOOL, name: evil }, acceptUrl: invite.acceptUrl, roleLabel: evil, inviterName: evil, inviteeName: evil });
  assert.ok(!r.html.includes("<script>"));
  assert.ok(!r.html.includes("<b>"));
  assert.ok(r.html.includes("&lt;script&gt;"));
});

test("links must be https; a bad link is refused, never put in an email", () => {
  for (const acceptUrl of ["javascript:alert(1)", "http://example.org/x", "not a url", ""]) {
    assert.throws(() => renderTemplate("invite", { ...invite, acceptUrl }), /https link/);
  }
  assert.doesNotThrow(() => renderTemplate("invite", { ...invite, acceptUrl: "http://localhost:3000/accept" }));
});

test("a school name with line breaks cannot add email headers to the subject", () => {
  const r = renderTemplate("password_reset", { school: { ...SCHOOL, name: "Evil\r\nBcc: someone@example.org" }, resetUrl: "https://app.example.org/r" });
  assert.ok(!/[\r\n]/.test(r.subject));
});

test("the digest lists items, caps long lists, and says so when empty", () => {
  const empty = renderTemplate("weekly_digest", { school: SCHOOL, weekLabel: "w", appUrl: "https://a.example.org", items: [] });
  assert.ok(empty.html.includes("Nothing new this week."));
  const many = renderTemplate("weekly_digest", {
    school: SCHOOL, weekLabel: "w", appUrl: "https://a.example.org",
    items: Array.from({ length: 30 }, (_, i) => ({ title: `Item ${i}`, url: "javascript:x" })),
  });
  assert.ok(many.html.includes("Item 24") && !many.html.includes("Item 25"));
  assert.ok(many.text.includes("and 5 more"));
  assert.ok(!many.html.includes("javascript:"));
});

test("password reset states how long the link works", () => {
  assert.match(renderTemplate("password_reset", { school: SCHOOL, resetUrl: "https://a.example.org/r" }).text, /60 minutes/);
  assert.match(renderTemplate("password_reset", { school: SCHOOL, resetUrl: "https://a.example.org/r", expiresInMinutes: 15 }).text, /15 minutes/);
});

// ---------------------------------------------------------------------------
// NF-10.3 sendEmail
// ---------------------------------------------------------------------------

test("sendEmail sends once, with the school name as sender name and the verified address", async () => {
  const { provider, calls } = fakeProvider(() => ({ id: "em_1" }));
  const r = await sendEmail("anna@example.org", "invite", invite, opts(provider));
  assert.deepEqual(r, { id: "em_1" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].msg.from, `"Sint-Jan College" <${FROM}>`);
  assert.equal(calls[0].msg.to, "anna@example.org");
  assert.ok(calls[0].msg.html && calls[0].msg.text && calls[0].msg.subject);
});

test("a success is not logged as a failure", async () => {
  const logged: FailureInfo[] = [];
  const { provider } = fakeProvider(() => ({ id: "em_1" }));
  await sendEmail("anna@example.org", "invite", invite, opts(provider, { log: (i: FailureInfo) => logged.push(i) }));
  assert.equal(logged.length, 0);
});

test("a temporary failure is retried with the SAME idempotency key, then succeeds", async () => {
  const { provider, calls } = fakeProvider((n) => n < 3 ? new ProviderError("down", true, 503) : { id: "em_2" });
  const r = await sendEmail("anna@example.org", "invite", invite, opts(provider));
  assert.equal(r.id, "em_2");
  assert.equal(calls.length, 3);
  assert.equal(new Set(calls.map((c) => c.key)).size, 1);
});

test("a permanent failure is not retried", async () => {
  const { provider, calls } = fakeProvider(() => new ProviderError("validation_error: invalid from", false, 403));
  await assert.rejects(sendEmail("anna@example.org", "invite", invite, opts(provider)), (e: unknown) =>
    e instanceof EmailError && e.code === "provider_rejected" && e.status === 403);
  assert.equal(calls.length, 1);
});

test("retries stop after the maximum number of attempts", async () => {
  const { provider, calls } = fakeProvider(() => new ProviderError("down", true, 503));
  await assert.rejects(sendEmail("anna@example.org", "invite", invite, opts(provider)), (e: unknown) =>
    e instanceof EmailError && e.code === "provider_unavailable");
  assert.equal(calls.length, 3);
});

// ---------------------------------------------------------------------------
// NF-10.6 failure log / NF-10.7 bad address
// ---------------------------------------------------------------------------

test("NF-10.7: a bad address is refused before Resend is called, and logged", async () => {
  const logged: FailureInfo[] = [];
  const { provider, calls } = fakeProvider(() => ({ id: "x" }));
  for (const bad of ["not-an-address", "a@b", "two@example.org, three@example.org", "x@example.org\r\nBcc: y@example.org", "", " "]) {
    await assert.rejects(sendEmail(bad, "invite", invite, opts(provider, { log: (i: FailureInfo) => logged.push(i) })), (e: unknown) =>
      e instanceof EmailError && e.code === "invalid_recipient");
  }
  assert.equal(calls.length, 0);
  assert.equal(logged.length, 6);
});

test("NF-10.6: a failed send is logged with school, recipient, template and error", async () => {
  const logged: FailureInfo[] = [];
  const { provider } = fakeProvider(() => new ProviderError("validation_error: The from domain is not verified", false, 403));
  await assert.rejects(sendEmail("anna@example.org", "invite", invite, opts(provider, { log: (i: FailureInfo) => logged.push(i) })));
  assert.equal(logged.length, 1);
  assert.equal(logged[0].tenantId, SCHOOL.id);
  assert.equal(logged[0].recipient, "anna@example.org");
  assert.equal(logged[0].template, "invite");
  assert.match(logged[0].error, /not verified/);
});

test("the default log is one JSON line with all four fields", async () => {
  const lines: string[] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => { lines.push(a.join(" ")); };
  try {
    const { provider } = fakeProvider(() => new ProviderError("boom", false, 403));
    await assert.rejects(sendEmail("anna@example.org", "password_reset", { school: SCHOOL, resetUrl: "https://a.example.org/r" },
      { provider, fromAddress: FROM, sleep: () => Promise.resolve() }));
  } finally {
    console.error = orig;
  }
  const entry = JSON.parse(lines[0]);
  assert.deepEqual(
    { e: entry.event, t: entry.tenant_id, r: entry.recipient, tpl: entry.template, err: entry.error },
    { e: "email_send_failed", t: SCHOOL.id, r: "anna@example.org", tpl: "password_reset", err: "boom" },
  );
});

test("a failure is also logged when the data is wrong (bad link, no school name)", async () => {
  const logged: FailureInfo[] = [];
  const { provider, calls } = fakeProvider(() => ({ id: "x" }));
  await assert.rejects(sendEmail("anna@example.org", "invite", { ...invite, acceptUrl: "javascript:1" }, opts(provider, { log: (i: FailureInfo) => logged.push(i) })),
    (e: unknown) => e instanceof EmailError && e.code === "invalid_data");
  assert.equal(calls.length, 0);
  assert.equal(logged[0].tenantId, SCHOOL.id);
});

test("alerts: a mistyped address does not alert the team, a rejected key or an outage does", async () => {
  const seen: FailureInfo[] = [];
  const onFailure = (i: FailureInfo) => { seen.push(i); };
  const a = fakeProvider(() => new ProviderError("validation_error: invalid to", false, 422));
  await assert.rejects(sendEmail("anna@example.org", "invite", invite, opts(a.provider, { onFailure })));
  const b = fakeProvider(() => new ProviderError("API key is invalid", false, 401));
  await assert.rejects(sendEmail("anna@example.org", "invite", invite, opts(b.provider, { onFailure })));
  const c = fakeProvider(() => new ProviderError("down", true, 503));
  await assert.rejects(sendEmail("anna@example.org", "invite", invite, opts(c.provider, { onFailure })));
  assert.deepEqual(seen.map((i) => i.alert), [false, true, true]);
});

test("a failing onFailure hook never hides the real error", async () => {
  const { provider } = fakeProvider(() => new ProviderError("x", false, 401));
  await assert.rejects(sendEmail("anna@example.org", "invite", invite, opts(provider, { onFailure: () => { throw new Error("hook broke"); } })),
    (e: unknown) => e instanceof EmailError && e.code === "provider_rejected");
});

test("without the secrets set, sendEmail says what is missing (and logs it)", async () => {
  const logged: FailureInfo[] = [];
  await assert.rejects(sendEmail("anna@example.org", "invite", invite, { log: (i: FailureInfo) => logged.push(i) }), (e: unknown) =>
    e instanceof EmailError && e.code === "not_configured" && /RESEND_API_KEY|EMAIL_FROM_ADDRESS/.test(e.message));
  assert.equal(logged.length, 1);
});

// ---------------------------------------------------------------------------
// Resend request / answers
// ---------------------------------------------------------------------------

function fakeFetch(status: number, body: unknown) {
  const seen: { url: string; init: RequestInit }[] = [];
  const f = ((url: string, init: RequestInit) => {
    seen.push({ url, init });
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  }) as unknown as typeof fetch;
  return { f, seen };
}
const MSG: OutgoingEmail = { from: `"S" <${FROM}>`, to: "anna@example.org", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

test("the Resend request: URL, bearer key, idempotency key, JSON body", async () => {
  const { f, seen } = fakeFetch(200, { id: "re-id-1" });
  const r = await resendProvider(FAKE_KEY, f).send(MSG, { idempotencyKey: "key-1" });
  assert.deepEqual(r, { id: "re-id-1" });
  assert.equal(seen[0].url, "https://api.resend.com/emails");
  const h = seen[0].init.headers as Record<string, string>;
  assert.equal(h.Authorization, `Bearer ${FAKE_KEY}`);
  assert.equal(h["Idempotency-Key"], "key-1");
  assert.deepEqual(JSON.parse(String(seen[0].init.body)), { from: MSG.from, to: ["anna@example.org"], subject: "Hi", html: "<p>Hi</p>", text: "Hi" });
});

test("Resend answers are sorted into retry / do not retry", async () => {
  const cases: [number, string, boolean][] = [
    [429, "rate_limit_exceeded", true], [500, "application_error", true], [503, "service_unavailable", true],
    [409, "concurrent_idempotent_requests", true],
    [429, "daily_quota_exceeded", false], [401, "validation_error", false], [403, "validation_error", false],
    [422, "missing_required_field", false], [409, "invalid_idempotent_request", false],
  ];
  for (const [status, name, retryable] of cases) {
    const { f } = fakeFetch(status, { name, message: "m", statusCode: status });
    await assert.rejects(resendProvider(FAKE_KEY, f).send(MSG, { idempotencyKey: "k" }), (e: unknown) =>
      e instanceof ProviderError && e.retryable === retryable && e.status === status, `${status} ${name}`);
  }
});

test("a network error is retryable", async () => {
  const f = (() => Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch;
  await assert.rejects(resendProvider(FAKE_KEY, f).send(MSG, { idempotencyKey: "k" }), (e: unknown) =>
    e instanceof ProviderError && e.retryable);
});

test("the API key never appears in an error, even if Resend echoes it back", async () => {
  const { f } = fakeFetch(401, { name: "validation_error", message: `API key ${FAKE_KEY} is invalid` });
  await assert.rejects(resendProvider(FAKE_KEY, f).send(MSG, { idempotencyKey: "k" }), (e: unknown) =>
    e instanceof ProviderError && !e.message.includes(FAKE_KEY) && e.message.includes("[key]"));
  const g = (() => Promise.reject(new Error(`connect failed for ${FAKE_KEY}`))) as unknown as typeof fetch;
  await assert.rejects(resendProvider(FAKE_KEY, g).send(MSG, { idempotencyKey: "k" }), (e: unknown) =>
    e instanceof ProviderError && !e.message.includes(FAKE_KEY));
});

// ---------------------------------------------------------------------------
// NF-10.2: no API key in the repo
// ---------------------------------------------------------------------------

test("no Resend API key and no .env file in the repo files", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".git" || name === ".claude" || name === ".cache" || name === ".config" || name === ".local" || name === ".npm" || name === ".npm-global") continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  };
  for (const d of ["supabase", "tests", "docs", "flutter", "lib", "src"]) {
    try { walk(join(root, d)); } catch { /* folder does not exist */ }
  }
  assert.ok(files.length > 5, "scanned the project files");
  const keyShape = /\bre_[A-Za-z0-9_]{16,}\b/;
  const assignment = /RESEND_API_KEY\s*[=:]\s*["']?[A-Za-z0-9_]{12,}/;
  for (const f of files) {
    assert.ok(!/(^|\/)\.env(\..+)?$/.test(f), `${f} is an env file; keep secrets in supabase secrets`);
    if (!/\.(ts|js|json|md|toml|sql|dart|yml|yaml|txt)$/.test(f)) continue;
    const text = readFileSync(f, "utf8");
    assert.ok(!keyShape.test(text), `${f} contains something shaped like a Resend key`);
    assert.ok(!assignment.test(text), `${f} assigns a value to RESEND_API_KEY`);
  }
});