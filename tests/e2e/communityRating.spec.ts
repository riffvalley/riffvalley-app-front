import { expect, test } from "@playwright/test";
import { mockApi, seedSession } from "./sessionFixtures";

test("submits a disc vote from the disc listing and refreshes its summary after success", async ({ page }) => {
  await mockApi(page);
  await seedSession(page);
  await page.route((url) => url.pathname.endsWith("/discs") && url.search.length > 0, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalItems: 1, totalPages: 1, currentPage: 1, limit: 20,
        data: [{
          id: "disc-1", name: "Disco de voto", releaseDate: "2026-09-30",
          image: "https://images.test/disc-1.jpg", link: null,
          ep: false, debut: false, averageRate: 6, averageCover: 7, voteCount: 1, commentCount: 0,
          userRate: null, artist: { id: "artist-1", name: "Banda de voto", country: null },
          genre: { id: "rock", name: "Rock", color: "#334455" },
        }],
      }),
    }),
  );
  let storedVote: { id: string; rate: number; cover: number | null } | null = null;
  await page.route("**/api/rates", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    storedVote = { id: "rate-1", rate: 8, cover: 9 };
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "rate-1" }),
    });
  });
  await page.route((url) => url.pathname.endsWith("/rates/disc/disc-1"), (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(storedVote ? [{
        ...storedVote, user: { id: "7", username: "ana" },
      }] : []),
    }),
  );

  await page.goto("/disc-list");
  const card = page.locator(".card").filter({ hasText: "Disco de voto" }).first();
  await expect(card).toBeVisible();
  const inputs = card.locator('input[type="number"]');
  await inputs.nth(0).fill("8");
  await inputs.nth(1).fill("9");

  const request = page.waitForRequest((req) => req.url().endsWith("/rates") && req.method() === "POST");
  await card.getByRole("button", { name: "Votar" }).click();
  await request;
  await expect(card.getByRole("button", { name: "Editar" })).toBeVisible();
  await expect(card).toContainText("(1)");

  await card.getByRole("button", { name: /Votos/ }).click();
  await expect(page.getByText("ana", { exact: true })).toBeVisible();
});
