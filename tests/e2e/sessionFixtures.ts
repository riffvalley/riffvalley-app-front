import type { Page } from "@playwright/test";

export const loginResponse = {
  id: "7", username: "ana", token: "test-token", roles: ["user"], image: "",
  dashboardButtonsEnabled: true,
  dashboardConfig: [{ id: "artistas", enabled: false }], mobileDashboardConfig: [],
};

export async function mockApi(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    // Keep all API traffic simulated, including API requests on a local base URL.
    if (url.hostname === "127.0.0.1" && !url.pathname.startsWith("/api/")) return route.continue();
    if (route.request().resourceType() !== "xhr" && route.request().resourceType() !== "fetch") return route.abort();
    const path = url.pathname.replace(/^\/api/, "");
    let body: unknown = [];
    if (path === "/catalog") body = { genres: [], countries: [] };
    else if (path === "/auth/login") body = loginResponse;
    else if (path === "/versions/production/latest") body = null;
    else if (path === "/discs/homeDiscs") body = {
      discs: [], totalDiscs: 0, totalVotes: 0, ratingDistribution: [], topUsersByRates: [], topUsersByCover: [],
    };
    else if (["/discs", "/discs/date", "/rates", "/news", "/suggestions/my"].includes(path))
      body = { data: [], totalItems: 0, totalPages: 0, currentPage: 1, limit: 20 };
    else if (path === "/news/feed" || path === "/news/source-feed") body = { data: [], news: [] };
    else if (path.startsWith("/rates/history")) body = { data: [], totalItems: 0 };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

export async function seedSession(page: Page, roles = '["user"]') {
  await page.addInitScript(({ roles }) => {
    // Seed once; logout/401 and subsequent reload must be able to clear storage.
    if (sessionStorage.getItem("session-seeded")) return;
    sessionStorage.setItem("session-seeded", "true");
    localStorage.setItem("token", "restored-token");
    localStorage.setItem("username", "ana");
    localStorage.setItem("userId", "7");
    localStorage.setItem("image", "");
    localStorage.setItem("roles", roles);
    localStorage.setItem("dashboardButtonsEnabled", "true");
    localStorage.setItem("dashboardConfig", '[{"id":"artistas","enabled":false}]');
    localStorage.setItem("mobileDashboardConfig", "[]");
    localStorage.setItem("theme", "dark");
  }, { roles });
}
