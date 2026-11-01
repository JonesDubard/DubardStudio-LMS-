// The service-role client. It skips RLS, so it is only ever created inside an
// Edge Function. The key is set by Supabase on the server and never sent to a browser.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export function serviceClient(): SupabaseClient {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
