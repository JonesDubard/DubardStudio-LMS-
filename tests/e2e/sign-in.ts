import type { Page } from "@playwright/test";

/** Password from supabase/seed.sql for every pilot1 persona. */
const PASSWORD = "Pilot-School-1";

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
}
