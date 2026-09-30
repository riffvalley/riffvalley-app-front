import { expect, test } from "@playwright/test";
import { mockApi, seedSession } from "./sessionFixtures";

for (const { path, role } of [
  { path: "/calendar", role: "user" },
  { path: "/calendar-baby", role: "babyUser" },
]) {
  test(`disc detail retains opening and closing from ${path}`, async ({ page }) => {
    await mockApi(page);
    await seedSession(page, JSON.stringify([role]));
    await page.route((url) => url.pathname.endsWith("/discs/date"), (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ totalItems: 1, data: [{
        releaseDate: "2026-09-30",
        discs: [{
          id: "disc-1", name: "Disco de prueba", artist: { id: "artist-1", name: "Banda de prueba" },
          genre: { id: "rock", name: "Rock", color: "#334455" },
          releaseDate: "2026-09-30", image: null, link: "https://open.spotify.com/album/1",
          ep: false, debut: false, verified: false, pinned: false,
          pendingId: null, nationalReleaseId: null,
        }],
      }] }),
    }));
    await page.route("https://accounts.spotify.com/api/token", (route) => route.fulfill({
      contentType: "application/json", body: JSON.stringify({ access_token: "spotify-test-token" }),
    }));
    await page.route("https://api.spotify.com/v1/search?**", (route) => route.fulfill({
      contentType: "application/json", body: JSON.stringify({ albums: { items: [{ id: "1" }] } }),
    }));
    await page.route("https://api.spotify.com/v1/albums/1", (route) => route.fulfill({
      contentType: "application/json", body: JSON.stringify({
        name: "Álbum de Spotify", artists: [{ name: "Banda de prueba" }], images: [],
        release_date: "2026-09-30", total_tracks: 1, external_urls: { spotify: "https://open.spotify.com/album/1" },
        tracks: { items: [{ id: "track-1", name: "Canción de prueba", track_number: 1, duration_ms: 61000, preview_url: null }] },
      }),
    }));
    await page.goto(path);
    await expect(page).toHaveURL(path);
    await page.locator("h3").first().click();
    await page.getByText("Disco de prueba", { exact: true }).click();
    const overlay = page.locator("div.fixed.inset-0.bg-black\\/60");
    await expect(overlay.getByRole("heading", { name: "Álbum de Spotify" })).toBeVisible();
    await expect(overlay.getByText("Canción de prueba", { exact: true })).toBeVisible();
    await expect(overlay.getByText("1m 1s", { exact: true })).toBeVisible();
    await expect(overlay.getByRole("link", { name: "Escuchar en Spotify" }))
      .toHaveAttribute("href", "https://open.spotify.com/album/1");
    await overlay.getByRole("button").click();
    await expect(overlay).toHaveCount(0);
    await expect(page).toHaveURL(path);
    await page.getByText("Disco de prueba", { exact: true }).click();
    await expect(overlay.getByRole("heading", { name: "Álbum de Spotify" })).toBeVisible();
    await overlay.click({ position: { x: 4, y: 4 } });
    await expect(overlay).toHaveCount(0);
  });
}
