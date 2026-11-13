import { expect, test } from "@playwright/test";
import { signIn } from "./sign-in";

test("teacher can draft a lesson, duplicate it, and release a grade", async ({ page }) => {
  test.setTimeout(180_000);

  await signIn(page, "teacher@pilot1.test");
  await expect(page.getByText("Teacher Home")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Tom/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grade 5" }).first()).toBeVisible();

  const title = `E2E draft ${Date.now()}`;
  await page.getByRole("link", { name: "Create Lesson" }).click();
  await page.waitForURL("**/teacher/lessons/new");
  await expect(page.getByRole("heading", { name: "Create Lesson" })).toBeVisible();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("Created by the teacher journey.");
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page).toHaveURL(/\/teacher\/lessons$/, { timeout: 90_000 });
  await page.getByRole("link", { name: title, exact: true }).click();
  await page.waitForURL(/\/teacher\/lessons\/[0-9a-f-]{36}$/);
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();

  const sourceUrl = page.url();
  await page.getByRole("link", { name: "Duplicate" }).click();
  await page.waitForURL(/\/reuse$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/teacher\/lessons\/[0-9a-f-]{36}$/);
  expect(page.url()).not.toBe(sourceUrl);
  await expect(page.getByLabel("Title")).toHaveValue(title);
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();

  await page.goto("/teacher/home");
  await page.getByRole("link", { name: "Assignment: Fractions: Introduction" }).click();
  await expect(page.getByRole("heading", { name: /Sam Student/ })).toBeVisible();
  const feedback = `E2E grade ${Date.now()}`;
  await page.getByLabel("Grade").fill("16");
  await page.getByLabel("Feedback").fill(feedback);
  await page.getByRole("button", { name: "Release" }).click();
  await expect(page.getByRole("button", { name: "Release" })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("link", { name: /Released · 16/ })).toBeVisible();
  await expect(page.getByLabel("Feedback")).toHaveValue(feedback);
  await expect(page.getByLabel("Grade")).toHaveValue(/^16(\.0+)?$/);
});
