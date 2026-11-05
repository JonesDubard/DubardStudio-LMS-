/** 200 -> { url, expires_in }   a signed link, 60 s by default, 300 s at most
 * 404 -> the file does not exist OR belongs to another school (same answer, so
 *        nobody can tell which). Row-level security on public.files decides.
 *
 * There is no public URL anywhere: the bucket is private.
 */

import {
  DEFAULT_LINK_SECONDS,
  getDownloadUrl,
  StorageError,
} from "../_shared/storage.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";

const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") {
      throw new StorageError("invalid_input", 405, "Use POST.");
    }
    const caller = await authenticate(req);

    const body = await req.json().catch(() => null) as
      | { file_id?: unknown; expires_in?: unknown }
      | null;
    const fileId = body?.file_id;
    if (typeof fileId !== "string" || !UUID_FORMAT.test(fileId)) {
      throw new StorageError("invalid_input", 400, "file_id must be a UUID.");
    }
    const expiresIn = body?.expires_in === undefined
      ? DEFAULT_LINK_SECONDS
      : Number(body.expires_in);

    /** RLS on public.files: other schools' rows, and rows a student or parent
     * may not see, simply are not returned.
     */
    const { data: file, error } = await caller.db
      .from("files")
      .select("storage_path, scan_status")
      .eq("id", fileId)
      .maybeSingle();
    if (error) throw new StorageError("download_failed", 404, "That file could not be found or you cannot open it.");
    if (!file) throw new StorageError("download_failed", 404, "That file could not be found or you cannot open it.");

    if (file.scan_status === "blocked") {
      throw new StorageError("not_allowed", 403, "This file was blocked by the virus scan and cannot be opened.");
    }

    const link = await getDownloadUrl(caller.client, {
      tenantId: caller.tenantId,
      storagePath: String(file.storage_path),
      expiresInSeconds: expiresIn,
    });
    return json({ url: link.url, expires_in: link.expiresInSeconds });
  } catch (e) {
    return errorResponse(e);
  }
});