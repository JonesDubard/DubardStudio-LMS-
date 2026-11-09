// GET /functions/v1/health  (no sign-in needed)
//
// What the uptime check calls (NF-17.3). 200 means the Edge Functions are
// running AND the Supabase auth service answers; 503 means one of them is down.
// It returns nothing about the project, users or schools.
//
// Deploy without JWT verification so the monitor needs no key:
//   supabase functions deploy health --no-verify-jwt
// (or add  [functions.health] verify_jwt = false  to supabase/config.toml)

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(null, { status: 405 });
  }
  let authOk = false;
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/health`, {
      headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
      signal: AbortSignal.timeout(3000),
    });
    authOk = res.ok;
  } catch {
    authOk = false;
  }
  const status = authOk ? 200 : 503;
  return new Response(
    req.method === "HEAD" ? null : JSON.stringify({ ok: authOk }),
    { status, headers },
  );
});