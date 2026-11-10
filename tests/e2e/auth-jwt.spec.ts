import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "../../scripts/load-env";

loadLocalEnv();

const TEST_TENANT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";

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
    app_roles: claims.app_roles ?? null,
    tenant_id: claims.tenant_id ?? null,
    aud: claims.aud ?? null,
    sub: claims.sub ?? null,
  };
}

test("JWT tenant_id and app_roles claims are issued for a school user", async ({ page }) => {
  test.setTimeout(120_000);

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
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
      full_name: "Auth Spike Student",
      email,
    });
    if (profileError) throw profileError;

    const { error: membershipError } = await admin.from("memberships").insert({
      tenant_id: TEST_TENANT_ID,
      profile_id: userId,
      role: "student",
    });
    if (membershipError) throw membershipError;

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
    expect(claims.app_roles, JSON.stringify(claimSummary(claims))).toEqual(
      expect.arrayContaining(["student"]),
    );
  } finally {
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
    await admin.from("profiles").delete().eq("tenant_id", TEST_TENANT_ID);
    await admin.from("tenants").delete().eq("id", TEST_TENANT_ID);
  }
});
