import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "../../scripts/load-env";

loadLocalEnv();

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

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

async function deleteTenantRows(admin: SupabaseClient, table: string, tenantId: string) {
  const { error } = await admin.from(table).delete().eq("tenant_id", tenantId);
  if (!error) return;
  const message = error.message.toLowerCase();
  if (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    error.code === "PGRST205"
  ) {
    return;
  }
  throw error;
}

async function removeTenant(admin: SupabaseClient, tenantId: string) {
  await deleteTenantRows(admin, "files", tenantId);
  await deleteTenantRows(admin, "profiles", tenantId);
  const { error } = await admin.from("tenants").delete().eq("id", tenantId);
  if (error && !/schema cache|does not exist/i.test(error.message)) throw error;
}

test("files RLS returns only the signed-in tenant", async ({ page }) => {
  test.setTimeout(120_000);

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = `rls-files-${Date.now()}@pilotschool.test`;
  const password = "Spike-Password-1";

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId: string | undefined;

  try {
    await removeTenant(admin, TENANT_A);
    await removeTenant(admin, TENANT_B);

    const { error: tenantError } = await admin.from("tenants").insert([
      { id: TENANT_A, name: "RLS Files A", subdomain: "rls-files-a" },
      { id: TENANT_B, name: "RLS Files B", subdomain: "rls-files-b" },
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
      role: "teacher",
      full_name: "RLS Files Teacher",
      email,
    });
    if (profileError) throw profileError;

    const { data: files, error: fileError } = await admin
      .from("files")
      .insert([
        {
          tenant_id: TENANT_A,
          storage_path: `${TENANT_A}/lessons/sample/a.pdf`,
          original_name: "tenant-a.pdf",
          mime_type: "application/pdf",
          size_bytes: 100000,
        },
        {
          tenant_id: TENANT_B,
          storage_path: `${TENANT_B}/lessons/sample/b.pdf`,
          original_name: "tenant-b.pdf",
          mime_type: "application/pdf",
          size_bytes: 100000,
        },
      ])
      .select("id, tenant_id, original_name");
    if (fileError) throw fileError;
    const fileA = files?.find((row) => row.tenant_id === TENANT_A);
    const fileB = files?.find((row) => row.tenant_id === TENANT_B);
    if (!fileA || !fileB) {
      throw new Error("Service role insert did not return both files");
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

    const listed = await userClient.from("files").select("id, tenant_id, original_name");
    const blocked = await userClient
      .from("files")
      .select("id, tenant_id, original_name")
      .eq("id", fileB.id);

    const debug = JSON.stringify(
      {
        jwt: {
          app_role: claims.app_role ?? null,
          tenant_id: claims.tenant_id ?? null,
        },
        policy: "tenant_id = (auth.jwt() ->> 'tenant_id')::uuid",
        listError: listed.error,
        byIdError: blocked.error,
      },
      null,
      2,
    );

    expect(claims.app_role, debug).toBe("teacher");
    expect(claims.tenant_id, debug).toBe(TENANT_A);
    expect(listed.error, debug).toBeNull();
    expect(listed.data, debug).toEqual([
      {
        id: fileA.id,
        tenant_id: TENANT_A,
        original_name: "tenant-a.pdf",
      },
    ]);
    expect(blocked.error, debug).toBeNull();
    expect(blocked.data, debug).toEqual([]);
  } finally {
    await removeTenant(admin, TENANT_A);
    await removeTenant(admin, TENANT_B);
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
});
