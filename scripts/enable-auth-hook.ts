/**
 * Prints the manual step Supabase requires before JWT claims appear.
 * Do not automate this. The dashboard is the only supported registration path.
 *
 * Run: npx tsx scripts/enable-auth-hook.ts
 */
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const projectRef = projectUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log(`
Register the custom access token hook (manual, one-time)

1. Apply supabase/migrations/0001_custom_access_token_hook.sql
   in the Supabase SQL editor. That creates public.custom_access_token_hook.
2. Open the Supabase Dashboard for this project${projectRef ? ` (${projectRef})` : ""}.
3. Go to Authentication → Hooks.
4. Open "Custom Access Token".
5. Select the Postgres function public.custom_access_token_hook.
6. Save.

Until that hook is enabled, sign-in still works, but the access token has
no tenant_id claim and no app_role claim. The reserved role claim stays
"authenticated". RLS then cannot read the school id. Re-login after
saving the hook so a new token is issued.

This script does not call the Management API. Supabase requires the
dashboard click.
`);
