/** Builds the Supabase client that acts AS THE CALLER, so the 0007 row-level
 * security and storage policies decide what is allowed. The service role key
 * is never used for uploads or downloads.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { StorageError } from "./storage.ts";
import type { StorageClient } from "./storage.ts";
import { bearerToken, claimsFromToken } from "./http.ts";
import type { TokenClaims } from "./http.ts";

/** The one query files-sign needs: read a public.files row (RLS applies). */
export interface FilesReader {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

export interface Caller extends TokenClaims {
  userId: string;
  /** For uploadFile / getDownloadUrl. */
  client: StorageClient;
  /** For reading public.files rows. Same underlying client. */
  db: FilesReader;
}

export async function authenticate(req: Request): Promise<Caller> {
  const token = bearerToken(req);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  /** Asks the auth server, so a forged or expired token is refused here. */
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new StorageError("unauthenticated", 401, "Your session has expired. Sign in again.");
  }

  const claims = claimsFromToken(token);
  return {
    ...claims,
    userId: data.user.id,
    client: supabase as unknown as StorageClient,
    db: supabase as unknown as FilesReader,
  };
}