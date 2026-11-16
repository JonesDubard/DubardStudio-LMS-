/** NF-03: the one helper every upload and download goes through.
 *
 *   NF-03.1  path is {tenant_id}/{type}/{id}/{file}   (no leading slash, see 0007)
 *            for submissions {id} is the student's own user id and the file
 *            name starts with the file id: {tenant_id}/submissions/{user_id}/{file_id}-{name}
 *            (the 0009 policies only allow that folder)
 *   NF-03.2  the real type is read from the first bytes, not the file name
 *   NF-03.3  the size limit of each bucket is enforced
 *   NF-03.4  anything else is refused with a StorageError (code + plain message)
 *   NF-03.5  downloads are short-lived signed links, never public URLs
*/


/** Errors */
 
export type StorageErrorCode =
  | "invalid_input"
  | "empty_file"
  | "file_too_large"
  | "unsupported_type"
  | "type_mismatch"
  | "wrong_school"
  | "unauthenticated"
  | "not_allowed"
  | "upload_failed"
  | "record_failed"
  | "download_failed";

export class StorageError extends Error {
  code: StorageErrorCode;
  status: number;
  constructor(code: StorageErrorCode, status: number, message: string) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.status = status;
  }
}

/** Buckets and file types */
export type FileKind = "pdf" | "jpeg" | "png" | "webp" | "doc" | "docx";

interface KindInfo {
  mime: string;
  extensions: string[];
  label: string;
}

export const KINDS: Record<FileKind, KindInfo> = {
  pdf: { mime: "application/pdf", extensions: ["pdf"], label: "PDF" },
  jpeg: { mime: "image/jpeg", extensions: ["jpg", "jpeg"], label: "JPEG" },
  png: { mime: "image/png", extensions: ["png"], label: "PNG" },
  webp: { mime: "image/webp", extensions: ["webp"], label: "WebP" },
  doc: { mime: "application/msword", extensions: ["doc"], label: "Word (.doc)" },
  docx: {
    mime:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: ["docx"],
    label: "Word (.docx)",
  },
};

export interface BucketRule {
  /** Largest file in bytes. Keep equal to storage.buckets.file_size_limit. */
  maxBytes: number;
  allowed: FileKind[];
}

/** Keep in step with the bucket created in migration 0007. */
export const BUCKETS: Record<string, BucketRule> = {
  "tenant-files": {
    maxBytes: 10 * 1024 * 1024,
    allowed: ["pdf", "jpeg", "png", "webp", "doc", "docx"],
  },
};

/** {type} segment of the path: logos, lesson materials, submissions. */
export const UPLOAD_TYPES = ["logos", "materials", "submissions"] as const;
export type UploadType = (typeof UPLOAD_TYPES)[number];

export interface UploadTypeRule {
  /** File types this kind of upload accepts (on top of the bucket's own list). */
  kinds: FileKind[];
  /** Roles (JWT app_roles) allowed to upload it. The storage policies still apply. */
  roles: string[];
}

/**
 * What each {type} may contain and who may upload it.
 * Roles mirror the permission matrix; submissions also need the 0009 policies
 * before storage lets a student in.
 */
export const UPLOAD_TYPE_RULES: Record<UploadType, UploadTypeRule> = {
  logos: { kinds: ["jpeg", "png", "webp"], roles: ["school_admin"] },
  materials: {
    kinds: ["pdf", "jpeg", "png", "webp", "doc", "docx"],
    roles: ["school_admin", "teacher"],
  },
  submissions: {
    kinds: ["pdf", "jpeg", "png", "webp", "doc", "docx"],
    roles: ["student"],
  },
};

/** Early, readable refusal when the caller's role can never upload this type. */
export function assertMayUpload(type: UploadType, roles: string[]): void {
  const rule = UPLOAD_TYPE_RULES[type];
  if (!rule) {
    throw new StorageError(
      "invalid_input",
      400,
      `Upload type must be one of: ${UPLOAD_TYPES.join(", ")}.`,
    );
  }
  if (!roles.some((r) => rule.roles.includes(r))) {
    throw new StorageError(
      "not_allowed",
      403,
      `Your role is not allowed to upload ${type}.`,
    );
  }
}

/** Signed links: 60 s by default, never more than 5 minutes. */
export const DEFAULT_LINK_SECONDS = 60;
export const MAX_LINK_SECONDS = 300;

const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** NF-03.1  paths */

/** Keeps the file name readable but safe as the last path segment. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    // deno-lint-ignore no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  if (!cleaned) {
    throw new StorageError(
      "invalid_input",
      400,
      "The file needs a name.",
    );
  }
  if (cleaned.length <= 100) return cleaned;
  const dot = cleaned.lastIndexOf(".");
  const ext = dot > 0 ? cleaned.slice(dot).slice(0, 10) : "";
  return cleaned.slice(0, 100 - ext.length) + ext;
}

/**
 * {tenant_id}/{type}/{id}/{file}. Used by logos, lesson materials and submissions.
 * For logos and materials {id} is the file id; for submissions the caller passes
 * the student's own user id (see uploadFile).
 */
export function buildStoragePath(
  tenantId: string,
  type: UploadType,
  id: string,
  fileName: string,
): string {
  if (!UUID_FORMAT.test(tenantId)) {
    throw new StorageError("invalid_input", 400, "tenant_id must be a UUID.");
  }
  if (!UUID_FORMAT.test(id)) {
    throw new StorageError("invalid_input", 400, "id must be a UUID.");
  }
  if (!(UPLOAD_TYPES as readonly string[]).includes(type)) {
    throw new StorageError(
      "invalid_input",
      400,
      `Upload type must be one of: ${UPLOAD_TYPES.join(", ")}.`,
    );
  }
  return `${tenantId.toLowerCase()}/${type}/${id.toLowerCase()}/${
    sanitizeFileName(fileName)
  }`;
}

/** True when a stored path really belongs to this school (used before signing). */
export function pathBelongsToTenant(path: string, tenantId: string): boolean {
  const parts = path.split("/");
  return (
    parts.length === 4 &&
    UUID_FORMAT.test(tenantId) &&
    parts[0] === tenantId.toLowerCase() &&
    (UPLOAD_TYPES as readonly string[]).includes(parts[1]) &&
    UUID_FORMAT.test(parts[2]) &&
    parts[3].length > 0 &&
    !parts.some((p) => p === "." || p === "..")
  );
}

/** NF-03.2  real type from the first bytes */

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (bytes[offset + i] !== sig[i]) return false;
  }
  return true;
}

function ascii(s: string): number[] {
  return Array.from(s, (c) => c.charCodeAt(0));
}

function indexOfBytes(hay: Uint8Array, needle: number[]): number {
  const n = needle.length;
  outer: for (let i = 0; i <= hay.length - n; i++) {
    for (let j = 0; j < n; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/** Names of the entries in a zip file, read from its central directory. */
function zipEntryNames(bytes: Uint8Array): string[] | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minEocd = 22;
  if (bytes.length < minEocd) return null;
  let eocd = -1;
  const stop = Math.max(0, bytes.length - minEocd - 0xffff);
  for (let i = bytes.length - minEocd; i >= stop; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const entries = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const names: string[] = [];
  const decoder = new TextDecoder();
  for (let i = 0; i < entries; i++) {
    if (p + 46 > bytes.length || view.getUint32(p, true) !== 0x02014b50) {
      return null;
    }
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    if (p + 46 + nameLen > bytes.length) return null;
    names.push(decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen)));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}

const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
// "WordDocument" as UTF-16LE: the stream name every .doc file has in its directory.
const WORD_STREAM = ascii("WordDocument").flatMap((c) => [c, 0]);

/**
 * The real type of the file, from its content. Returns null for anything that
 * is not one of the supported types (an .exe, a script, a renamed zip, ...).
 */
export function sniffFileType(bytes: Uint8Array): FileKind | null {
  if (startsWith(bytes, ascii("%PDF-"))) return "pdf";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) {
    return "webp";
  }
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    const names = zipEntryNames(bytes);
    if (
      names &&
      names.includes("[Content_Types].xml") &&
      names.includes("word/document.xml")
    ) return "docx";
    return null; // a plain zip, .xlsx, .jar, ... is not accepted
  }
  if (startsWith(bytes, OLE_MAGIC)) {
    // .xls and .ppt share this header; only accept it when it is a Word file.
    return indexOfBytes(bytes, WORD_STREAM) >= 0 ? "doc" : null;
  }
  return null;
}

/** NF-03.3 / NF-03.4  checks and clear errors */

function megabytes(n: number): string {
  return `${Math.round((n / (1024 * 1024)) * 10) / 10} MB`;
}

function allowedList(kinds: FileKind[]): string {
  return kinds.map((k) => KINDS[k].label).join(", ");
}

/**
 * Reads a request body but stops as soon as it passes the limit, so a huge
 * upload is never held in memory. `declaredLength` is the Content-Length header.
 */
export async function readBodyCapped(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  declaredLength?: string | number | null,
): Promise<Uint8Array> {
  const tooLarge = (size?: number) =>
    new StorageError(
      "file_too_large",
      413,
      size
        ? `The file is ${megabytes(size)}. The limit is ${megabytes(maxBytes)}.`
        : `The file is larger than the ${megabytes(maxBytes)} limit.`,
    );

  const declared = Number(declaredLength);
  if (Number.isFinite(declared) && declared > maxBytes) throw tooLarge(declared);
  if (!body) return new Uint8Array(0);

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw tooLarge();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

export interface CheckedFile {
  bytes: Uint8Array;
  kind: FileKind;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
}

export type FileInput = Uint8Array | ArrayBuffer | Blob;

export async function checkFile(
  input: FileInput,
  fileName: string,
  bucket: string,
  /** When given, the file must also be one of the types this upload type accepts. */
  type?: UploadType,
): Promise<CheckedFile> {
  const rule = BUCKETS[bucket];
  if (!rule) {
    throw new StorageError("invalid_input", 400, `Unknown bucket "${bucket}".`);
  }
  const allowedKinds = type
    ? rule.allowed.filter((k) => UPLOAD_TYPE_RULES[type].kinds.includes(k))
    : rule.allowed;

  // Size first, before reading a huge Blob into memory.
  const declaredSize = input instanceof Blob
    ? input.size
    : input.byteLength;
  if (declaredSize === 0) {
    throw new StorageError("empty_file", 400, "The file is empty.");
  }
  if (declaredSize > rule.maxBytes) {
    throw new StorageError(
      "file_too_large",
      413,
      `The file is ${megabytes(declaredSize)}. The limit is ${
        megabytes(rule.maxBytes)
      }.`,
    );
  }

  const bytes = input instanceof Blob
    ? new Uint8Array(await input.arrayBuffer())
    : input instanceof Uint8Array
    ? input
    : new Uint8Array(input);

  const safeName = sanitizeFileName(fileName);
  const kind = sniffFileType(bytes);
  if (!kind || !allowedKinds.includes(kind)) {
    throw new StorageError(
      "unsupported_type",
      415,
      `"${safeName}" is not an accepted file type. Accepted: ${
        allowedList(allowedKinds)
      }.`,
    );
  }

  const dot = safeName.lastIndexOf(".");
  const ext = dot >= 0 ? safeName.slice(dot + 1).toLowerCase() : "";
  if (!KINDS[kind].extensions.includes(ext)) {
    throw new StorageError(
      "type_mismatch",
      415,
      `"${safeName}" is a ${KINDS[kind].label} file but its name ends in ${
        ext ? `.${ext}` : "nothing"
      }. Rename it to .${KINDS[kind].extensions[0]}.`,
    );
  }

  return {
    bytes,
    kind,
    mimeType: KINDS[kind].mime,
    sizeBytes: bytes.length,
    fileName: safeName,
  };
}

/** Client shape (what the helper needs from supabase-js) */

interface StorageApiError {
  message: string;
  statusCode?: string | number;
  status?: number;
}

export interface StorageBucketApi {
  upload(
    path: string,
    body: Uint8Array,
    options: { contentType: string; upsert: boolean },
  ): Promise<{ data: unknown; error: StorageApiError | null }>;
  remove(paths: string[]): Promise<{ data: unknown; error: StorageApiError | null }>;
  createSignedUrl(
    path: string,
    expiresIn: number,
  ): Promise<{
    data: { signedUrl: string } | null;
    error: StorageApiError | null;
  }>;
}

export interface StorageClient {
  storage: { from(bucket: string): StorageBucketApi };
  from(table: string): {
    insert(
      row: Record<string, unknown>,
    ): PromiseLike<{ error: { message: string } | null }>;
  };
}

function isDenied(e: StorageApiError): boolean {
  const code = String(e.statusCode ?? e.status ?? "");
  return code === "403" || code === "401" ||
    /row-level security|not authorized|unauthorized|permission/i.test(e.message);
}

/** Upload */

export interface UploadOptions {
  bucket?: string;
  tenantId: string;
  type: UploadType;
  file: FileInput;
  fileName: string;
  /** Becomes public.files.id. Generated when omitted. */
  id?: string;
  /**
   * The signed-in user's id, taken from the verified token (never from a header
   * or the body). Required for submissions: it is the {id} folder in the path,
   * because the 0009 policies only let a student write to their own folder.
   */
  userId?: string;
}

export interface UploadResult {
  fileId: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
}

export async function uploadFile(
  client: StorageClient,
  opts: UploadOptions,
): Promise<UploadResult> {
  const bucket = opts.bucket ?? "tenant-files";
  const id = opts.id ?? crypto.randomUUID(); // stays as public.files.id

  const isSubmission = opts.type === "submissions";
  if (isSubmission && !(opts.userId && UUID_FORMAT.test(opts.userId))) {
    throw new StorageError(
      "invalid_input",
      400,
      "A submission needs the signed-in user's id.",
    );
  }

  const checked = await checkFile(opts.file, opts.fileName, bucket, opts.type);

  // Submissions: {tenant}/submissions/{user id}/{file id}-{name}
  // Everything else: {tenant}/{type}/{file id}/{name}
  const folderId = isSubmission ? opts.userId! : id;
  const nameInPath = isSubmission
    ? `${id}-${checked.fileName}`
    : checked.fileName;
  const path = buildStoragePath(opts.tenantId, opts.type, folderId, nameInPath);

  const objects = client.storage.from(bucket);
  const { error: uploadError } = await objects.upload(path, checked.bytes, {
    contentType: checked.mimeType, // from the bytes, never from the caller
    upsert: false, // files are never overwritten in place
  });
  if (uploadError) {
    if (isDenied(uploadError)) {
      throw new StorageError(
        "wrong_school",
        403,
        "The upload was refused: you can only upload into your own school's folder, and only if your role allows it.",
      );
    }
    throw new StorageError(
      "upload_failed",
      502,
      `The upload failed: ${uploadError.message}`,
    );
  }

  /** storage.objects read policy (0007) only shows objects that have a files row,
   * so the row is part of the upload. If it fails, the object is removed again.
   * original_name is the name the user sees, without the file id prefix.
   */
  const { error: rowError } = await client.from("files").insert({
    id,
    tenant_id: opts.tenantId.toLowerCase(),
    storage_path: path,
    original_name: checked.fileName,
    mime_type: checked.mimeType,
    size_bytes: checked.sizeBytes,
  });
  if (rowError) {
    await objects.remove([path]).catch(() => undefined);
    throw new StorageError(
      "record_failed",
      500,
      `The file was uploaded but could not be recorded, so it was removed: ${rowError.message}`,
    );
  }

  return {
    fileId: id,
    storagePath: path,
    mimeType: checked.mimeType,
    sizeBytes: checked.sizeBytes,
    originalName: checked.fileName,
  };
}

/** NF-03.5  downloads: signed links only */

export interface DownloadOptions {
  bucket?: string;
  /** The caller's school. The path must be inside this school's folder. */
  tenantId: string;
  storagePath: string;
  /** Seconds the link works. Default 60, at most 300. */
  expiresInSeconds?: number;
}

export async function getDownloadUrl(
  client: Pick<StorageClient, "storage">,
  opts: DownloadOptions,
): Promise<{ url: string; expiresInSeconds: number }> {
  const bucket = opts.bucket ?? "tenant-files";
  if (!BUCKETS[bucket]) {
    throw new StorageError("invalid_input", 400, `Unknown bucket "${bucket}".`);
  }
  const ttl = opts.expiresInSeconds ?? DEFAULT_LINK_SECONDS;
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > MAX_LINK_SECONDS) {
    throw new StorageError(
      "invalid_input",
      400,
      `A download link can last 1 to ${MAX_LINK_SECONDS} seconds.`,
    );
  }
  if (!pathBelongsToTenant(opts.storagePath, opts.tenantId)) {
    throw new StorageError(
      "wrong_school",
      403,
      "That file is not in your school's folder.",
    );
  }

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(opts.storagePath, ttl);
  if (error || !data?.signedUrl) {
    if (error && isDenied(error)) {
      throw new StorageError(
        "wrong_school",
        403,
        "You do not have access to that file.",
      );
    }
    throw new StorageError(
      "download_failed",
      404,
      "That file could not be found or you cannot open it.",
    );
  }
  return { url: data.signedUrl, expiresInSeconds: ttl };
}