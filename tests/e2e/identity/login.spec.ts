import { expect, test } from "@playwright/test";

test("la página pública de login se renderiza con la API simulada", async ({ page }) => {
  const apiRequests: string[] = [];
  await page.route(
    (url) => /\/(?:api\/)?(?:catalog|versions\/production\/latest)$/.test(url.pathname),
    async (route) => {
    const url = new URL(route.request().url());
    apiRequests.push(url.pathname);
    const body = url.pathname.endsWith("/catalog")
      ? { genres: [], countries: [] }
      : null;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    },
  );

  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);

  await expect(page.getByPlaceholder("Usuario")).toBeVisible();
  await expect(page.getByPlaceholder("Contraseña")).toBeVisible();
  expect(apiRequests.length).toBeGreaterThan(0);
});
