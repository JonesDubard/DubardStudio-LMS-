import { expect, test } from "@playwright/test";
import { signIn } from "./sign-in";

test("admin can invite a teacher and save branding colors", async ({ page }) => {
  test.setTimeout(120_000);

  await signIn(page, "admin@pilot1.test");
  await expect(page.getByText("School Administration")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pilot School #1" })).toBeVisible();
  await expect(page.getByText(/academic year/)).toBeVisible();

  const email = `e2e.teacher.${Date.now()}@pilot1.test`;
  await page.getByRole("link", { name: "People", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Teachers", exact: true })).toBeVisible();
  await expect(page.getByText("Tom Teacher (School 1)")).toBeVisible();
  await page.getByLabel("Teacher email").fill(email);
  await page.getByRole("button", { name: "Invite teacher" }).click();
  await expect(page.getByText("Invitation saved. No email was sent.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("cell", { name: email })).toBeVisible();
  await expect(page.getByText("PENDING").first()).toBeVisible();

  await page.goto("/admin/branding");
  await expect(page.getByRole("heading", { name: "Branding Settings" })).toBeVisible();
  const primary = page.locator("#primary-color");
  const original = await primary.inputValue();
  const next = original.toLowerCase() === "#112233" ? "#223344" : "#112233";
  try {
    await primary.fill(next);
    await page.getByRole("button", { name: "Save Branding" }).click();
    await expect(page.getByRole("button", { name: "Save Branding" })).toBeEnabled();
    await expect(page.getByText(/permission denied/i)).toHaveCount(0);
    await page.reload();
    await expect(page.locator("#primary-color")).toHaveValue(next);
  } finally {
    await page.goto("/admin/branding");
    await page.locator("#primary-color").fill(original);
    await page.getByRole("button", { name: "Save Branding" }).click();
    await expect(page.getByRole("button", { name: "Save Branding" })).toBeEnabled();
  }
});
