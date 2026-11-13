import { expect, test } from "@playwright/test";
import { signIn } from "./sign-in";

test("parent can see the linked child's assignments and grades", async ({ page }) => {
  test.setTimeout(90_000);

  await signIn(page, "parent@pilot1.test");
  await expect(page.getByRole("banner").getByText("Parent Home")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Pat/ })).toBeVisible();
  await expect(page.getByText(/Sam Student/)).toBeVisible();
  await expect(page.getByText("Fractions practice check").first()).toBeVisible();

  await page.getByRole("link", { name: "Assignments" }).click();
  await page.waitForURL("**/parent/assignments");
  await expect(page.getByRole("heading", { name: "Assignments", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fractions practice check" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assignment: Fractions: Introduction" })).toBeVisible();
  await expect(page.getByText(/Sam Student/)).toBeVisible();

  await page.getByRole("link", { name: "Grades" }).click();
  await page.waitForURL("**/parent/grades");
  await expect(page.getByRole("heading", { name: "Grades", exact: true })).toBeVisible();
  await expect(page.getByText("18 / 20")).toBeVisible();
  await expect(page.getByText("Clear working.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Assignment: Fractions: Introduction" }),
  ).toBeVisible();
});
