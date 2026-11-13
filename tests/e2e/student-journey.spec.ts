import { expect, test } from "@playwright/test";
import { signIn } from "./sign-in";

test("student can read classes, grades, a lesson, and save a display name", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await signIn(page, "student@pilot1.test");
  await expect(page.getByRole("banner").getByText("Student Home")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Sam/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Lesson" }).first()).toBeVisible();

  await page.getByRole("link", { name: "Classes" }).click();
  await page.waitForURL("**/classes");
  await expect(page.getByRole("heading", { name: "Classes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grade 5" })).toBeVisible();
  await expect(page.getByText("2026/2027")).toBeVisible();

  await page.getByRole("link", { name: "Grades" }).click();
  await page.waitForURL("**/grades");
  await expect(page.getByRole("heading", { name: "Grades" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grade 5 · Mathematics" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fractions practice check" })).toBeVisible();
  await expect(page.getByText("18 / 20")).toBeVisible();
  await expect(page.getByText("Clear working.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Assignment: Fractions: Introduction" }),
  ).toBeVisible();
  await expect(page.getByText("Paper quiz")).toHaveCount(0);

  await page.getByRole("link", { name: "Home" }).click();
  await page.waitForURL("**/feed");
  await page.getByRole("link", { name: "Open Lesson" }).first().click();
  await page.waitForURL(/\/lessons\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Fractions: Introduction", exact: true })).toBeVisible();
  await expect(page.getByText("Seeded lesson 1")).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  const name = page.getByLabel("Display name");
  const original = await name.inputValue();
  const updated = "Riley Student (School 1)";
  try {
    await name.fill(updated);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");
    await page.reload();
    await expect(page.getByLabel("Display name")).toHaveValue(updated);
    await page.goto("/feed");
    await expect(page.getByRole("heading", { name: /Riley/ })).toBeVisible();
  } finally {
    await page.goto("/settings");
    await page.getByLabel("Display name").fill(original);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");
  }
});
