import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "../../scripts/load-env";

loadLocalEnv();

const TEST_TENANT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const OTHER_TENANT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const TABLE = "auth_spike_rows";
const POLICY_SQL =
  "tenant_id = (auth.jwt() ->> 'tenant_id')::uuid";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} in .env.local`);
  }
  return value;
}

function decodeJwt(accessToken: string): Record<string, unknown> {
  const segment = accessToken.split(".")[1];
  if (!segment) {
    throw new Error("Access token has no payload");
  }
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
}

function claimSummary(claims: Record<string, unknown>) {
  return {
    app_role: claims.app_role ?? null,
    tenant_id: claims.tenant_id ?? null,
    aud: claims.aud ?? null,
    sub: claims.sub ?? null,
  };
}

async function exec(admin: SupabaseClient, statement: string) {
  const { error } = await admin.rpc("auth_spike_exec", { statement });
  if (error) {
    throw new Error(`auth_spike_exec failed for: ${statement}\n${error.message}`);
  }
}

async function waitForTable(admin: SupabaseClient) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { error } = await admin.from(TABLE).select("id").limit(1);
    if (!error) return;
    if (!error.message.toLowerCase().includes("schema cache") && error.code !== "PGRST205") {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`PostgREST schema cache did not pick up ${TABLE}`);
}

test("JWT tenant_id claim is what RLS reads", async ({ page }) => {
  test.setTimeout(120_000);

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = `auth-spike-${Date.now()}@pilotschool.test`;
  const password = "Spike-Password-1";

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId: string | undefined;

  try {
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) throw listError;
    for (const user of listed.users) {
      if (user.email?.startsWith("auth-spike-")) {
        await admin.auth.admin.deleteUser(user.id);
      }
    }

    await admin.from("profiles").delete().eq("tenant_id", TEST_TENANT_ID);
    await admin.from("tenants").delete().eq("id", TEST_TENANT_ID);

    const { error: tenantError } = await admin.from("tenants").insert({
      id: TEST_TENANT_ID,
      name: "Auth Spike Tenant",
      subdomain: "auth-spike-jwt",
    });
    if (tenantError) throw tenantError;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      throw createError ?? new Error("Admin API did not return a user");
    }
    userId = created.user.id;

    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      tenant_id: TEST_TENANT_ID,
      role: "student",
      full_name: "Auth Spike Student",
      email,
    });
    if (profileError) throw profileError;

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);

    const tokenResponse = page.waitForResponse((response) => {
      return (
        response.url().includes("/auth/v1/token") && response.request().method() === "POST"
      );
    });
    await page.getByRole("button", { name: "Sign in" }).click();
    const response = await tokenResponse;
    const body = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      error_description?: string;
      msg?: string;
      error?: string;
    };
    expect(
      response.ok(),
      body.error_description ?? body.msg ?? body.error ?? "login failed",
    ).toBeTruthy();
    if (!body.access_token || !body.refresh_token) {
      throw new Error("Token response did not include an access token");
    }

    const claims = decodeJwt(body.access_token);
    expect(claims.tenant_id, JSON.stringify(claimSummary(claims))).toBe(TEST_TENANT_ID);
    expect(claims.app_role, JSON.stringify(claimSummary(claims))).toBe("student");

    await exec(admin, `drop table if exists public.${TABLE}`);
    await exec(
      admin,
      `create table public.${TABLE} (
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null,
        label text not null
      )`,
    );
    await exec(admin, `alter table public.${TABLE} enable row level security`);
    await exec(
      admin,
      `create policy tenant_isolation on public.${TABLE}
        for all
        using (${POLICY_SQL})`,
    );
    await exec(
      admin,
      `grant select, insert, update, delete on public.${TABLE} to service_role`,
    );
    await exec(admin, `grant select on public.${TABLE} to authenticated`);
    await exec(
      admin,
      `create or replace function public.auth_spike_jwt()
        returns jsonb
        language sql
        stable
        as $fn$ select auth.jwt() $fn$`,
    );
    await exec(admin, `grant execute on function public.auth_spike_jwt() to authenticated`);
    await exec(admin, `notify pgrst, 'reload schema'`);
    await waitForTable(admin);

    const { data: inserted, error: insertError } = await admin
      .from(TABLE)
      .insert([
        { tenant_id: TEST_TENANT_ID, label: "own" },
        { tenant_id: OTHER_TENANT_ID, label: "other" },
      ])
      .select("id, label, tenant_id");
    if (insertError) throw insertError;
    const own = inserted?.find((row) => row.label === "own");
    const other = inserted?.find((row) => row.label === "other");
    if (!own || !other) {
      throw new Error("Service role insert did not return both rows");
    }

    const userClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: sessionError } = await userClient.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    });
    if (sessionError) throw sessionError;

    const listedRows = await userClient.from(TABLE).select("id, label, tenant_id");
    const blocked = await userClient
      .from(TABLE)
      .select("id, label, tenant_id")
      .eq("id", other.id);
    const seenByRls = await userClient.rpc("auth_spike_jwt");

    const debug = JSON.stringify(
      {
        jwt: claimSummary(claims),
        policy: POLICY_SQL,
        listQuery: `select id, label, tenant_id from ${TABLE}`,
        listError: listedRows.error,
        byIdQuery: `select id, label, tenant_id from ${TABLE} where id = '${other.id}'`,
        byIdError: blocked.error,
        authJwt: seenByRls.data,
        authJwtError: seenByRls.error,
      },
      null,
      2,
    );

    expect(listedRows.error, debug).toBeNull();
    expect(listedRows.data, debug).toEqual([
      expect.objectContaining({
        id: own.id,
        label: "own",
        tenant_id: TEST_TENANT_ID,
      }),
    ]);
    expect(blocked.error, debug).toBeNull();
    expect(blocked.data, debug).toEqual([]);
  } finally {
    await admin.rpc("auth_spike_exec", {
      statement: `drop function if exists public.auth_spike_jwt()`,
    });
    await admin.rpc("auth_spike_exec", {
      statement: `drop table if exists public.${TABLE}`,
    });
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
    await admin.from("profiles").delete().eq("tenant_id", TEST_TENANT_ID);
    await admin.from("tenants").delete().eq("id", TEST_TENANT_ID);
  }
});
