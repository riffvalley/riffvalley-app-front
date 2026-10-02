import { expect, test } from "@playwright/test";
import { loginResponse, mockApi, seedSession } from "../sessionFixtures";

test.beforeEach(async ({ page }) => { await mockApi(page); });

test("login preserves stored formats and restoration sends the token", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Usuario").fill("ana");
  await page.getByPlaceholder("Contraseña").fill("secret");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL("/");
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toMatchObject({
    token: loginResponse.token, userId: "7", username: "ana", roles: '["user"]', image: "",
    dashboardButtonsEnabled: "true", dashboardConfig: '[{"id":"artistas","enabled":false}]', mobileDashboardConfig: "[]",
  });
  const catalogRequest = page.waitForRequest((request) => /\/(?:api\/)?catalog$/.test(new URL(request.url()).pathname));
  await page.goto("/password");
  expect((await catalogRequest).headers().authorization).toBe("Bearer test-token");
  await expect(page).toHaveURL("/password");
  // The toggle is restricted to riffValley/superUser; ordinary user preferences still restore.
  await expect(page.getByText("Botones del menú activados", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL("/password");
});

test("invalid login shows legacy error and remains public", async ({ page }) => {
  await page.route("**/auth/login", (route) => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
  await page.goto("/login");
  await page.getByPlaceholder("Usuario").fill("ana");
  await page.getByPlaceholder("Contraseña").fill("wrong");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByText("Acceso fallido. Revisa tus credenciales.")).toBeVisible();
  await expect(page).toHaveURL("/login");
});

test("public form and unauthenticated protected route retain their routing", async ({ page }) => {
  await page.goto("/national-releases/form");
  await expect(page).toHaveURL("/national-releases/form");
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0);
  await page.goto("/password?source=legacy");
  await expect(page).toHaveURL("/login");
});

test("old comma separated roles restore permissions and preferences", async ({ page }) => {
  await seedSession(page, "user, superUser");
  await page.goto("/users");
  await expect(page).toHaveURL("/users");
  await page.goto("/password?source=legacy");
  await expect(page).toHaveURL("/password?source=legacy");
  await expect(page.getByText("Botones del menú activados", { exact: true })).toBeVisible();
});

test("logout clears session and dashboard keys while retaining unrelated preferences", async ({ page }) => {
  await seedSession(page);
  await page.goto("/password");
  await page.getByRole("complementary").last().getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/login");
  const saved = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  for (const key of ["token", "username", "userId", "image", "roles", "dashboardButtonsEnabled", "dashboardConfig", "mobileDashboardConfig"])
    expect(saved).not.toHaveProperty(key);
  expect(saved.theme).toBe("dark");
});

test("concurrent and late 401s clear session and settle on login", async ({ page }) => {
  await seedSession(page);
  await page.goto("/password");
  let requests = 0;
  let release!: () => void;
  const batch = new Promise<void>((resolve) => { release = resolve; });
  await page.route((url) => url.pathname.endsWith("/discs/homeDiscs"), async (route) => {
    const index = ++requests;
    if (index === 1 || index > 4) return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ discs: [], totalDiscs: 0, totalVotes: 0, ratingDistribution: [], topUsersByRates: [], topUsersByCover: [] }) });
    if (index === 4) release();
    await batch;
    await route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
  });
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(page.getByPlaceholder("Usuario")).toBeVisible();
  expect(requests).toBeGreaterThanOrEqual(4);
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
});

for (const { role, allowed, denied } of [
  { role: "user", allowed: "/calendar", denied: "/users" },
  { role: "babyUser", allowed: "/calendar-baby", denied: "/import" },
  { role: "riffValley", allowed: "/petitions", denied: "/users" },
  { role: "superUser", allowed: "/users", denied: "/calendar" },
]) {
  test(`navigation for ${role} retains exact permissions`, async ({ page }) => {
    await seedSession(page, JSON.stringify([role]));
    await page.goto(allowed);
    await expect(page).toHaveURL(allowed);
    await page.goto(denied);
    await expect(page).toHaveURL("/");
  });
}

test("maintenance route redirects home when maintenance is disabled", async ({ page }) => {
  await page.goto("/maintenance");
  await expect(page).toHaveURL("/login");
});
