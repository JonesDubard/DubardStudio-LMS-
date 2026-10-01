import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "../../scripts/load-env";

loadLocalEnv();

const TENANT_A = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const TENANT_B = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";

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

async function removeTenant(admin: SupabaseClient, tenantId: string) {
  await admin.from("academic_years").delete().eq("tenant_id", tenantId);
  await admin.from("profiles").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
}

test("academic_years RLS returns only the signed-in tenant", async ({ page }) => {
  test.setTimeout(120_000);

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = `rls-academic-${Date.now()}@pilotschool.test`;
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
      if (user.email?.startsWith("rls-academic-")) {
        await admin.auth.admin.deleteUser(user.id);
      }
    }

    await removeTenant(admin, TENANT_A);
    await removeTenant(admin, TENANT_B);

    const { error: tenantError } = await admin.from("tenants").insert([
      { id: TENANT_A, name: "RLS Academic A", subdomain: "rls-academic-a" },
      { id: TENANT_B, name: "RLS Academic B", subdomain: "rls-academic-b" },
    ]);
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
      tenant_id: TENANT_A,
      role: "student",
      full_name: "RLS Academic Student",
      email,
    });
    if (profileError) throw profileError;

    const { data: years, error: yearError } = await admin
      .from("academic_years")
      .insert([
        {
          tenant_id: TENANT_A,
          name: "Tenant A Year",
          start_date: "2026-09-01",
          end_date: "2027-06-30",
          is_current: true,
        },
        {
          tenant_id: TENANT_B,
          name: "Tenant B Year",
          start_date: "2026-09-01",
          end_date: "2027-06-30",
          is_current: true,
        },
      ])
      .select("id, tenant_id, name");
    if (yearError) throw yearError;
    const yearA = years?.find((row) => row.tenant_id === TENANT_A);
    const yearB = years?.find((row) => row.tenant_id === TENANT_B);
    if (!yearA || !yearB) {
      throw new Error("Service role insert did not return both academic years");
    }

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
    const userClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: sessionError } = await userClient.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    });
    if (sessionError) throw sessionError;

    const listedYears = await userClient
      .from("academic_years")
      .select("id, tenant_id, name");
    const blocked = await userClient
      .from("academic_years")
      .select("id, tenant_id, name")
      .eq("id", yearB.id);

    const debug = JSON.stringify(
      {
        jwt: {
          app_role: claims.app_role ?? null,
          tenant_id: claims.tenant_id ?? null,
          role: claims.role ?? null,
        },
        policy: "tenant_id = (auth.jwt() ->> 'tenant_id')::uuid",
        listQuery: "select id, tenant_id, name from academic_years",
        listError: listedYears.error,
        byIdQuery: `select id, tenant_id, name from academic_years where id = '${yearB.id}'`,
        byIdError: blocked.error,
      },
      null,
      2,
    );

    expect(listedYears.error, debug).toBeNull();
    expect(listedYears.data, debug).toEqual([
      {
        id: yearA.id,
        tenant_id: TENANT_A,
        name: "Tenant A Year",
      },
    ]);
    expect(blocked.error, debug).toBeNull();
    expect(blocked.data, debug).toEqual([]);
  } finally {
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
    await removeTenant(admin, TENANT_A);
    await removeTenant(admin, TENANT_B);
  }
});
