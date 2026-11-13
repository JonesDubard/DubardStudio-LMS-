/** NF-03.6 through the real Edge Functions, against a local `supabase start` +
 * `supabase functions serve` (or a test project) with migrations 0001-0010 applied.
 * Skipped unless these are set:
 *
 *   SUPABASE_URL, SUPABASE_ANON_KEY
 *   TEACHER_A_EMAIL, TEACHER_A_PASSWORD   a teacher in school A
 *   SCHOOL_A_ID
 * Optional:
 *   TEACHER_B_EMAIL, TEACHER_B_PASSWORD   a teacher in a different school
 *                                         (enables the cross-school download test)
 *   STUDENT_A_EMAIL, STUDENT_A_PASSWORD   a student in school A
 *                                         (enables the submissions tests, 0009)
 *
 * Run:  node --test supabase/functions/tests/functions_integration_test.ts
 * Deno skips this file (see supabase/functions/deno.json).
 */

import test from "node:test";
import assert from "node:assert/strict";

const env = process.env;
// A signed link made inside Docker points at http://kong:8000, which a laptop cannot
// resolve. Point it at the URL the tests were given. Hosted projects need no change.
const localUrl = (u: string) => u.replace(/^https?:\/\/kong(:\d+)?/, env.SUPABASE_URL!);
const ready = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "TEACHER_A_EMAIL", "TEACHER_A_PASSWORD", "SCHOOL_A_ID"].every((k) => env[k]);
const skip = ready ? false : "set the SUPABASE_* / TEACHER_A_* / SCHOOL_A_ID variables to run";
const skipB = skip || (env.TEACHER_B_EMAIL && env.TEACHER_B_PASSWORD ? false : "set TEACHER_B_* to run");
const skipS = skip || (env.STUDENT_A_EMAIL && env.STUDENT_A_PASSWORD ? false : "set STUDENT_A_* to run");

const PDF = Uint8Array.from([...new TextEncoder().encode("%PDF-1.7\n"), ...new Array(64).fill(0)]);
const EXE = Uint8Array.from([0x4d, 0x5a, 0x90, 0, 3, 0, ...new Array(64).fill(0)]);

async function login(email: string, password: string): Promise<string> {
  const { createClient } = await import("@supabase/supabase-js");
  const c = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!);
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error("no session");
  return data.session.access_token;
}
const teacherA = () => login(env.TEACHER_A_EMAIL!, env.TEACHER_A_PASSWORD!);
const teacherB = () => login(env.TEACHER_B_EMAIL!, env.TEACHER_B_PASSWORD!);
const studentA = () => login(env.STUDENT_A_EMAIL!, env.STUDENT_A_PASSWORD!);

function upload(token: string, name: string, body: Uint8Array<ArrayBuffer>, type = "materials") {
  return fetch(`${env.SUPABASE_URL}/functions/v1/files-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY!,
      "x-upload-type": type,
      "x-file-name": encodeURIComponent(name),
      // a caller trying to pick another school: ignored, the token decides
      "x-tenant-id": "22222222-2222-4222-8222-222222222222",
    },
    body: body as BodyInit,
  });
}
function sign(token: string, fileId: string, expiresIn?: number) {
  return fetch(`${env.SUPABASE_URL}/functions/v1/files-sign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, expires_in: expiresIn }),
  });
}

test("own school: the upload lands in the school's folder and the signed link opens", { skip }, async () => {
  const t = await teacherA();
  const res = await upload(t, "it.pdf", PDF);
  assert.equal(res.status, 201);
  const { file } = await res.json() as { file: { id: string; storage_path: string; mime_type: string } };
  assert.ok(file.storage_path.startsWith(`${env.SCHOOL_A_ID!.toLowerCase()}/materials/`));
  assert.equal(file.mime_type, "application/pdf");

  const link = await sign(t, file.id);
  assert.equal(link.status, 200);
  const { url, expires_in } = await link.json() as { url: string; expires_in: number };
  assert.equal(expires_in, 60);
  const opened = await fetch(localUrl(url));
  assert.equal(opened.status, 200);
});

test("a renamed .exe is refused with a clear error", { skip }, async () => {
  const res = await upload(await teacherA(), "notes.pdf", EXE);
  assert.equal(res.status, 415);
  const { error } = await res.json() as { error: { code: string; message: string } };
  assert.equal(error.code, "unsupported_type");
  assert.match(error.message, /PDF/);
});

test("a file over 10 MB is refused with a clear error", { skip }, async () => {
  const big = new Uint8Array(10 * 1024 * 1024 + 1);
  big.set(PDF);
  const res = await upload(await teacherA(), "big.pdf", big);
  assert.equal(res.status, 413);
  const { error } = await res.json() as { error: { code: string; message: string } };
  assert.equal(error.code, "file_too_large");
  assert.match(error.message, /10 MB/);
});

test("a teacher cannot upload a logo", { skip }, async () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(64).fill(0)]);
  const res = await upload(await teacherA(), "logo.png", png, "logos");
  assert.equal(res.status, 403);
});

test("no sign-in, no upload", { skip }, async () => {
  const res = await fetch(`${env.SUPABASE_URL}/functions/v1/files-upload`, {
    method: "POST", headers: { apikey: env.SUPABASE_ANON_KEY!, "x-upload-type": "materials", "x-file-name": "a.pdf" }, body: PDF,
  });
  assert.ok([401, 403].includes(res.status));
});

test("an expired link stops working", { skip }, async () => {
  const t = await teacherA();
  const { file } = await (await upload(t, "exp.pdf", PDF)).json() as { file: { id: string } };
  const { url } = await (await sign(t, file.id, 2)).json() as { url: string };
  assert.equal((await fetch(localUrl(url))).status, 200);
  await new Promise((r) => setTimeout(r, 3500));
  assert.notEqual((await fetch(localUrl(url))).status, 200);
});

test("a link cannot last longer than 5 minutes", { skip }, async () => {
  const t = await teacherA();
  const { file } = await (await upload(t, "ttl.pdf", PDF)).json() as { file: { id: string } };
  assert.equal((await sign(t, file.id, 86400)).status, 400);
});

test("another school cannot get a link to this school's file", { skip: skipB }, async () => {
  const { file } = await (await upload(await teacherA(), "mine.pdf", PDF)).json() as { file: { id: string } };
  const res = await sign(await teacherB(), file.id);
  assert.equal(res.status, 404);
});

// 0009: a student writes to {school}/submissions/{their own user id}/{file id}-{name}

test("a student's submission lands in their own folder and the link opens", { skip: skipS }, async () => {
  const t = await studentA();
  const res = await upload(t, "essay.pdf", PDF, "submissions");
  assert.equal(res.status, 201);
  const { file } = await res.json() as { file: { id: string; storage_path: string; original_name: string } };
  const school = env.SCHOOL_A_ID!.toLowerCase();
  assert.match(file.storage_path, new RegExp(`^${school}/submissions/[0-9a-f-]{36}/${file.id}-essay\\.pdf$`));
  assert.notEqual(file.storage_path.split("/")[2], file.id); // folder is the user id, not the file id
  assert.equal(file.original_name, "essay.pdf");

  const link = await sign(t, file.id);
  assert.equal(link.status, 200);
  const { url } = await link.json() as { url: string };
  assert.equal((await fetch(localUrl(url))).status, 200);
});

test("a student cannot upload lesson materials", { skip: skipS }, async () => {
  const res = await upload(await studentA(), "notes.pdf", PDF, "materials");
  assert.equal(res.status, 403);
});