import { expect, test } from "@playwright/test";
import { mockApi, seedSession } from "./sessionFixtures";

test("maintenance supersedes login, public form and authenticated role routes", async ({ page }) => {
  await mockApi(page);
  for (const path of ["/login", "/national-releases/form", "/maintenance"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/maintenance");
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0);
  }
  await seedSession(page, '["superUser"]');
  await page.goto("/users");
  await expect(page).toHaveURL("/maintenance");
});
