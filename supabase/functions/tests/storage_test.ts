/** NF-03.6 unit tests. They run without a database: the Supabase client is a
 * fake that behaves like the 0007 storage policies (own school's folder only).
 * The real-database versions are in tests/storage_integration_test.ts.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertMayUpload,
  BUCKETS,
  buildStoragePath,
  checkFile,
  getDownloadUrl,
  MAX_LINK_SECONDS,
  pathBelongsToTenant,
  readBodyCapped,
  sniffFileType,
  StorageError,
  uploadFile,
} from "../_shared/storage.ts";
import type { StorageClient } from "../_shared/storage.ts";

const SCHOOL_A = "11111111-1111-4111-8111-111111111111";
const SCHOOL_B = "22222222-2222-4222-8222-222222222222";
const FILE_ID = "33333333-3333-4333-8333-333333333333";

// --------------------------------------------------------------------------
// Sample files, built from real signatures
// --------------------------------------------------------------------------

const enc = new TextEncoder();
const bytes = (...parts: (number[] | string)[]) =>
  Uint8Array.from(
    parts.flatMap((p) => typeof p === "string" ? [...enc.encode(p)] : p),
  );
const pad = (n: number) => new Array(n).fill(0);

const PDF = bytes("%PDF-1.7\n", pad(64));
const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0], pad(64));
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], pad(64));
const WEBP = bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 ", pad(32));
const EXE = bytes("MZ", [0x90, 0, 3, 0], "This program cannot be run in DOS mode.", pad(64));
const ELF = bytes([0x7f], "ELF", pad(64));
const SCRIPT = bytes("#!/bin/sh\nrm -rf /\n");
const DOC = bytes(
  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  pad(512),
  [...enc.encode("WordDocument")].flatMap((c) => [c, 0]),
  pad(64),
);
const XLS = bytes(
  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  pad(512),
  [...enc.encode("Workbook")].flatMap((c) => [c, 0]),
  pad(64),
);

/** Minimal zip (stored, no compression) with the given entry names. */
function zip(names: string[]): Uint8Array {
  const locals: number[][] = [];
  const centrals: number[][] = [];
  let offset = 0;
  const u16 = (n: number) => [n & 255, (n >> 8) & 255];
  const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const name of names) {
    const nb = [...enc.encode(name)];
    const local = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(0), ...u32(0), ...u16(nb.length), ...u16(0), ...nb,
    ];
    centrals.push([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(0), ...u32(0), ...u16(nb.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nb,
    ]);
    locals.push(local);
    offset += local.length;
  }
  const cd = centrals.flat();
  const eocd = [
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(names.length), ...u16(names.length),
    ...u32(cd.length), ...u32(offset), ...u16(0),
  ];
  return Uint8Array.from([...locals.flat(), ...cd, ...eocd]);
}
const DOCX = zip(["[Content_Types].xml", "word/document.xml", "_rels/.rels"]);
const XLSX = zip(["[Content_Types].xml", "xl/workbook.xml"]);
const PLAIN_ZIP = zip(["readme.txt"]);

// --------------------------------------------------------------------------
// A fake Supabase client that applies the 0007 rules
// --------------------------------------------------------------------------

function fakeClient(sessionTenant: string | null, opts: { failRecord?: boolean } = {}) {
  const objects = new Map<string, { contentType: string; size: number }>();
  const rows: Record<string, unknown>[] = [];
  const signed: { path: string; ttl: number; expiresAt: number }[] = [];
  let now = 1_000_000; // fake clock, in ms
  const client: StorageClient = {
    storage: {
      from: (_bucket: string) => ({
        upload: (path, body, options) => {
          // tenant_files_upload: first folder must be the caller's school
          if (path.split("/")[0] !== sessionTenant) {
            return Promise.resolve({
              data: null,
              error: { message: "new row violates row-level security policy", statusCode: "403" },
            });
          }
          objects.set(path, { contentType: options.contentType, size: body.length });
          return Promise.resolve({ data: { path }, error: null });
        },
        remove: (paths) => {
          paths.forEach((p) => objects.delete(p));
          return Promise.resolve({ data: null, error: null });
        },
        createSignedUrl: (path, ttl) => {
          if (path.split("/")[0] !== sessionTenant || !objects.has(path)) {
            return Promise.resolve({ data: null, error: { message: "Object not found", statusCode: "404" } });
          }
          signed.push({ path, ttl, expiresAt: now + ttl * 1000 });
          return Promise.resolve({
            data: { signedUrl: `https://x.supabase.co/storage/v1/object/sign/tenant-files/${path}?token=t${signed.length}` },
            error: null,
          });
        },
      }),
    },
    from: (_table: string) => ({
      insert: (row) => {
        if (opts.failRecord) return Promise.resolve({ error: { message: "boom" } });
        rows.push(row);
        return Promise.resolve({ error: null });
      },
    }),
  };
  return {
    client,
    objects,
    rows,
    signed,
    advance: (ms: number) => (now += ms),
    /** What the storage server does when someone opens a link. */
    open: (url: string) => {
      const n = Number(new URL(url).searchParams.get("token")!.slice(1));
      return signed[n - 1].expiresAt > now ? 200 : 400;
    },
  };
}

const rejects = (p: Promise<unknown>, code: string) =>
  assert.rejects(p, (e: unknown) => e instanceof StorageError && e.code === code);

// --------------------------------------------------------------------------
// NF-03.1 paths
// --------------------------------------------------------------------------

test("path is {tenant_id}/{type}/{id}/{file} with no leading slash", () => {
  assert.equal(
    buildStoragePath(SCHOOL_A, "materials", FILE_ID, "Week 1 notes.pdf"),
    `${SCHOOL_A}/materials/${FILE_ID}/Week 1 notes.pdf`,
  );
});

test("path accepts the three upload types and nothing else", () => {
  for (const t of ["logos", "materials", "submissions"] as const) {
    assert.ok(buildStoragePath(SCHOOL_A, t, FILE_ID, "a.png").includes(`/${t}/`));
  }
  assert.throws(() => buildStoragePath(SCHOOL_A, "../x" as never, FILE_ID, "a.png"));
});

test("file names cannot climb out of the folder", () => {
  const p = buildStoragePath(SCHOOL_A, "materials", FILE_ID, "../../../" + SCHOOL_B + "/materials/x/evil.pdf");
  assert.equal(p, `${SCHOOL_A}/materials/${FILE_ID}/evil.pdf`);
  assert.ok(pathBelongsToTenant(p, SCHOOL_A));
  assert.ok(!pathBelongsToTenant(p, SCHOOL_B));
});

test("tenant and id must be UUIDs", () => {
  assert.throws(() => buildStoragePath("not-a-uuid", "logos", FILE_ID, "a.png"));
  assert.throws(() => buildStoragePath(SCHOOL_A, "logos", "../etc", "a.png"));
});

// --------------------------------------------------------------------------
// NF-03.2 real type from the first bytes
// --------------------------------------------------------------------------

test("each accepted type is recognised from its content", () => {
  assert.equal(sniffFileType(PDF), "pdf");
  assert.equal(sniffFileType(JPEG), "jpeg");
  assert.equal(sniffFileType(PNG), "png");
  assert.equal(sniffFileType(WEBP), "webp");
  assert.equal(sniffFileType(DOC), "doc");
  assert.equal(sniffFileType(DOCX), "docx");
});

test("NF-03.6: a renamed .exe is refused, whatever it is called", async () => {
  for (const name of ["virus.exe", "notes.pdf", "photo.png", "essay.docx", "logo.jpg"]) {
    await rejects(checkFile(EXE, name, "tenant-files"), "unsupported_type");
  }
});

test("other disguised files are refused too", async () => {
  await rejects(checkFile(ELF, "tool.pdf", "tenant-files"), "unsupported_type");
  await rejects(checkFile(SCRIPT, "run.pdf", "tenant-files"), "unsupported_type");
  await rejects(checkFile(PLAIN_ZIP, "essay.docx", "tenant-files"), "unsupported_type");
  await rejects(checkFile(XLSX, "essay.docx", "tenant-files"), "unsupported_type");
  await rejects(checkFile(XLS, "essay.doc", "tenant-files"), "unsupported_type");
});

test("a real file with the wrong extension is refused with a fix-it message", async () => {
  await assert.rejects(checkFile(PNG, "scan.pdf", "tenant-files"), (e: unknown) =>
    e instanceof StorageError && e.code === "type_mismatch" && /Rename it to \.png/.test(e.message));
  await rejects(checkFile(PDF, "noextension", "tenant-files"), "type_mismatch");
});

test("the error message names the accepted types", async () => {
  await assert.rejects(checkFile(EXE, "a.exe", "tenant-files"), (e: unknown) =>
    e instanceof StorageError && e.status === 415 && /PDF, JPEG, PNG, WebP/.test(e.message));
});

// --------------------------------------------------------------------------
// NF-03.3 / NF-03.4 size
// --------------------------------------------------------------------------

test("a file over the bucket limit is refused with sizes in the message", async () => {
  const big = new Uint8Array(BUCKETS["tenant-files"].maxBytes + 1);
  big.set(PDF);
  await assert.rejects(checkFile(big, "big.pdf", "tenant-files"), (e: unknown) =>
    e instanceof StorageError && e.code === "file_too_large" && e.status === 413 &&
    /10\.0 MB|10 MB/.test(e.message));
});

test("a file exactly at the limit is accepted, and an empty file is not", async () => {
  const exact = new Uint8Array(BUCKETS["tenant-files"].maxBytes);
  exact.set(PDF);
  assert.equal((await checkFile(exact, "ok.pdf", "tenant-files")).sizeBytes, exact.length);
  await rejects(checkFile(new Uint8Array(0), "empty.pdf", "tenant-files"), "empty_file");
});

test("a Blob over the limit is refused before it is read", async () => {
  const blob = new Blob([new Uint8Array(BUCKETS["tenant-files"].maxBytes + 1)]);
  let read = false;
  blob.arrayBuffer = () => { read = true; return Promise.resolve(new ArrayBuffer(0)); };
  await rejects(checkFile(blob, "big.pdf", "tenant-files"), "file_too_large");
  assert.equal(read, false);
});

// --------------------------------------------------------------------------
// Upload
// --------------------------------------------------------------------------

test("NF-03.6: upload to your own school works", async () => {
  const f = fakeClient(SCHOOL_A);
  const r = await uploadFile(f.client, {
    tenantId: SCHOOL_A, type: "materials", file: PDF, fileName: "Week 1.pdf", id: FILE_ID,
  });
  assert.equal(r.storagePath, `${SCHOOL_A}/materials/${FILE_ID}/Week 1.pdf`);
  assert.ok(f.objects.has(r.storagePath));
  assert.deepEqual(f.rows[0], {
    id: FILE_ID, tenant_id: SCHOOL_A, storage_path: r.storagePath,
    original_name: "Week 1.pdf", mime_type: "application/pdf", size_bytes: PDF.length,
  });
});

test("the stored content type comes from the bytes, not from the caller", async () => {
  const f = fakeClient(SCHOOL_A);
  const r = await uploadFile(f.client, { tenantId: SCHOOL_A, type: "logos", file: PNG, fileName: "logo.png" });
  assert.equal(f.objects.get(r.storagePath)!.contentType, "image/png");
});

test("NF-03.6: another school's folder is refused, and nothing is recorded", async () => {
  const f = fakeClient(SCHOOL_A); // signed in at school A
  await rejects(
    uploadFile(f.client, { tenantId: SCHOOL_B, type: "materials", file: PDF, fileName: "x.pdf" }),
    "wrong_school",
  );
  assert.equal(f.objects.size, 0);
  assert.equal(f.rows.length, 0);
});

test("a refused file never reaches storage", async () => {
  const f = fakeClient(SCHOOL_A);
  await rejects(
    uploadFile(f.client, { tenantId: SCHOOL_A, type: "materials", file: EXE, fileName: "notes.pdf" }),
    "unsupported_type",
  );
  assert.equal(f.objects.size, 0);
});

test("if the files row cannot be saved, the uploaded object is removed", async () => {
  const f = fakeClient(SCHOOL_A, { failRecord: true });
  await rejects(
    uploadFile(f.client, { tenantId: SCHOOL_A, type: "materials", file: PDF, fileName: "a.pdf" }),
    "record_failed",
  );
  assert.equal(f.objects.size, 0);
});

test("two uploads of the same name do not overwrite each other", async () => {
  const f = fakeClient(SCHOOL_A);
  const a = await uploadFile(f.client, { tenantId: SCHOOL_A, type: "materials", file: PDF, fileName: "a.pdf" });
  const b = await uploadFile(f.client, { tenantId: SCHOOL_A, type: "materials", file: PDF, fileName: "a.pdf" });
  assert.notEqual(a.storagePath, b.storagePath);
  assert.equal(f.objects.size, 2);
});

// --------------------------------------------------------------------------
// NF-03.5 downloads
// --------------------------------------------------------------------------

test("downloads use a signed link of 60 seconds by default", async () => {
  const f = fakeClient(SCHOOL_A);
  const up = await uploadFile(f.client, { tenantId: SCHOOL_A, type: "materials", file: PDF, fileName: "a.pdf" });
  const d = await getDownloadUrl(f.client, { tenantId: SCHOOL_A, storagePath: up.storagePath });
  assert.equal(d.expiresInSeconds, 60);
  assert.equal(f.signed[0].ttl, 60);
  assert.match(d.url, /\/object\/sign\//);
});

test("link lifetime is capped", async () => {
  const f = fakeClient(SCHOOL_A);
  const up = await uploadFile(f.client, { tenantId: SCHOOL_A, type: "materials", file: PDF, fileName: "a.pdf" });
  for (const bad of [0, -5, 1.5, MAX_LINK_SECONDS + 1, 86400]) {
    await rejects(
      getDownloadUrl(f.client, { tenantId: SCHOOL_A, storagePath: up.storagePath, expiresInSeconds: bad }),
      "invalid_input",
    );
  }
  assert.equal(f.signed.length, 0);
});

test("a path in another school's folder is refused before a link is made", async () => {
  const f = fakeClient(SCHOOL_A);
  await rejects(
    getDownloadUrl(f.client, { tenantId: SCHOOL_A, storagePath: `${SCHOOL_B}/materials/${FILE_ID}/a.pdf` }),
    "wrong_school",
  );
  assert.equal(f.signed.length, 0);
});

test("NF-03.6: an expired link stops working (behaviour of the contract)", async () => {
  const f = fakeClient(SCHOOL_A);
  const up = await uploadFile(f.client, { tenantId: SCHOOL_A, type: "materials", file: PDF, fileName: "a.pdf" });
  const { url } = await getDownloadUrl(f.client, { tenantId: SCHOOL_A, storagePath: up.storagePath, expiresInSeconds: 60 });
  assert.equal(f.open(url), 200);
  f.advance(61_000);
  assert.equal(f.open(url), 400);
});

test("the helper never builds a public URL", () => {
  const src = readFileSync(new URL("../_shared/storage.ts", import.meta.url), "utf8");
  const code = src.split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");
  assert.ok(!/getPublicUrl/.test(code));
  assert.ok(/createSignedUrl/.test(code));
});

// --------------------------------------------------------------------------
// Per-type rules, roles and capped reading (used by the Edge Functions)
// --------------------------------------------------------------------------

test("a logo must be an image: a real PDF is refused as a logo", async () => {
  await rejects(checkFile(PDF, "logo.pdf", "tenant-files", "logos"), "unsupported_type");
  await rejects(checkFile(DOCX, "logo.docx", "tenant-files", "logos"), "unsupported_type");
  assert.equal((await checkFile(PNG, "logo.png", "tenant-files", "logos")).kind, "png");
  // the same PDF is fine as lesson material
  assert.equal((await checkFile(PDF, "a.pdf", "tenant-files", "materials")).kind, "pdf");
});

test("the logo error lists only the image types", async () => {
  await assert.rejects(checkFile(PDF, "logo.pdf", "tenant-files", "logos"), (e: unknown) =>
    e instanceof StorageError && /JPEG, PNG, WebP/.test(e.message) && !/PDF,/.test(e.message));
});

test("uploadFile applies the per-type rule before anything reaches storage", async () => {
  const f = fakeClient(SCHOOL_A);
  await rejects(uploadFile(f.client, { tenantId: SCHOOL_A, type: "logos", file: PDF, fileName: "logo.pdf" }), "unsupported_type");
  assert.equal(f.objects.size, 0);
});

test("roles: admin uploads logos, teacher uploads materials, a student cannot upload materials", () => {
  assert.doesNotThrow(() => assertMayUpload("logos", ["school_admin"]));
  assert.doesNotThrow(() => assertMayUpload("materials", ["teacher"]));
  assert.doesNotThrow(() => assertMayUpload("submissions", ["student"]));
  for (const [type, roles] of [["logos", ["teacher"]], ["materials", ["student"]], ["materials", ["parent"]], ["materials", []]] as const) {
    assert.throws(() => assertMayUpload(type, [...roles]), (e: unknown) => e instanceof StorageError && e.code === "not_allowed" && e.status === 403);
  }
});

function streamOf(total: number, chunk = 64 * 1024): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream({
    pull(c) {
      if (sent >= total) return c.close();
      const n = Math.min(chunk, total - sent);
      c.enqueue(new Uint8Array(n));
      sent += n;
    },
  });
}

test("readBodyCapped: a body at the limit is read, one byte over is refused", async () => {
  const max = 1024;
  assert.equal((await readBodyCapped(streamOf(max, 100), max)).length, max);
  await rejects(readBodyCapped(streamOf(max + 1, 100), max), "file_too_large");
});

test("readBodyCapped: stops reading once the limit is passed", async () => {
  let pulled = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(c) { pulled++; c.enqueue(new Uint8Array(1024)); }, // never ends
  });
  await rejects(readBodyCapped(body, 4096), "file_too_large");
  assert.ok(pulled < 20, `kept reading (${pulled} chunks)`);
});

test("readBodyCapped: Content-Length over the limit is refused without reading, with sizes in the message", async () => {
  const body = new ReadableStream<Uint8Array>({ pull() {} });
  await assert.rejects(readBodyCapped(body, BUCKETS["tenant-files"].maxBytes, String(25 * 1024 * 1024)), (e: unknown) =>
    e instanceof StorageError && e.status === 413 && /25 MB/.test(e.message) && /10 MB/.test(e.message));
  assert.equal(body.locked, false); // nobody took a reader, so nothing was read
});

test("readBodyCapped: no body gives an empty array (checkFile then says the file is empty)", async () => {
  assert.equal((await readBodyCapped(null, 10)).length, 0);
});

test("neither Edge Function builds a public URL or uses the service role key", () => {
  for (const f of ["files-upload/index.ts", "files-sign/index.ts", "_shared/auth.ts", "_shared/http.ts"]) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    const code = src.split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");
    assert.ok(!/getPublicUrl/.test(code), f);
    assert.ok(!/SERVICE_ROLE/i.test(code), f);
  }
});