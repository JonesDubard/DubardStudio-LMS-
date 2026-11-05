/** The school is NEVER taken from the request: it comes from the tenant_id claim
 * in the verified token. Every check lives in _shared/storage.ts.
 */

import {
  assertMayUpload,
  BUCKETS,
  readBodyCapped,
  StorageError,
  UPLOAD_TYPES,
  uploadFile,
} from "../_shared/storage.ts";
import type { UploadType } from "../_shared/storage.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") {
      throw new StorageError("invalid_input", 405, "Use POST.");
    }
    const caller = await authenticate(req);

    const type = req.headers.get("x-upload-type") ?? "";
    if (!(UPLOAD_TYPES as readonly string[]).includes(type)) {
      throw new StorageError(
        "invalid_input",
        400,
        `x-upload-type must be one of: ${UPLOAD_TYPES.join(", ")}.`,
      );
    }
    assertMayUpload(type as UploadType, caller.roles);

    let fileName = "";
    try {
      fileName = decodeURIComponent(req.headers.get("x-file-name") ?? "");
    } catch {
      throw new StorageError("invalid_input", 400, "x-file-name must be percent-encoded.");
    }

    /** Stops reading as soon as the bucket limit is passed. */
    const bytes = await readBodyCapped(
      req.body,
      BUCKETS["tenant-files"].maxBytes,
      req.headers.get("content-length"),
    );

    const result = await uploadFile(caller.client, {
      tenantId: caller.tenantId,
      type: type as UploadType,
      file: bytes,
      fileName,
    });

    return json({
      file: {
        id: result.fileId,
        storage_path: result.storagePath,
        original_name: result.originalName,
        mime_type: result.mimeType,
        size_bytes: result.sizeBytes,
      },
    }, 201);
  } catch (e) {
    return errorResponse(e);
  }
});