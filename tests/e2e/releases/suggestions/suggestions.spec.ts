import { expect, test } from "@playwright/test";
import { mockApi, seedSession } from "../../sessionFixtures";

test("an authenticated user can send a suggestion and see it in their list", async ({ page }) => {
  await mockApi(page);
  await seedSession(page);

  const createdSuggestion = {
    id: "suggestion-e2e",
    title: "",
    description: "",
    type: "bug",
    status: "in_progress",
    priority: "medium",
    rejectionReason: null,
    userId: "7",
    user: { id: "7", username: "ana", image: "" },
    versionItemId: null,
    versionItem: null,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
  let submittedPayload: unknown;
  let created = false;

  await page.route((url) => url.pathname.endsWith("/suggestions/my"), (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      data: created ? [{ ...createdSuggestion, ...submittedPayload as object }] : [],
      counts: { in_progress: created ? 1 : 0, done: 0, rejected: 0 },
    }),
  }));
  await page.route("**/suggestions", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    submittedPayload = route.request().postDataJSON();
    created = true;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(createdSuggestion) });
  });

  await page.goto("/suggestions");
  await expect(page.getByText("Sin envíos todavía")).toBeVisible();
  await page.getByRole("button", { name: "Bug" }).click();
  await page.locator("input[type=text]").fill("No carga el perfil");
  await page.locator("textarea").fill("La pantalla queda en blanco");
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(page.getByText("Enviado correctamente")).toBeVisible();
  await expect(page.getByText("No carga el perfil")).toBeVisible();
  await expect(page.getByText("1 pendiente")).toBeVisible();
  expect(submittedPayload).toEqual({
    title: "No carga el perfil",
    description: "La pantalla queda en blanco",
    type: "bug",
  });
});
