import { expect, test } from "@playwright/test";
import { mockApi, seedSession } from "./sessionFixtures";

for (const { path, role } of [
  { path: "/calendar", role: "user" },
  { path: "/calendar-baby", role: "babyUser" },
]) {
  test(`artist Spotify detail opens, closes and reopens from ${path}`, async ({ page }) => {
    await mockApi(page);
    await seedSession(page, JSON.stringify([role]));
    await page.route((url) => url.pathname.endsWith("/discs/date"), (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ totalItems: 1, data: [{ releaseDate: "2026-09-30", discs: [{
        id: "disc-artist-detail", name: "Disco de artista", artist: { id: "artist-1", name: "Banda de prueba" },
        genre: { id: "rock", name: "Rock", color: "#334455" }, releaseDate: "2026-09-30",
        image: null, link: "https://open.spotify.com/album/album-1", ep: false, debut: false,
        verified: false, pinned: false, pendingId: null, nationalReleaseId: null,
      }] }] }),
    }));
    await page.route("https://accounts.spotify.com/api/token", (route) => route.fulfill({
      contentType: "application/json", body: JSON.stringify({ access_token: "spotify-test-token" }),
    }));
    await page.route("https://api.spotify.com/v1/search?**", (route) => route.fulfill({
      contentType: "application/json", body: JSON.stringify({ albums: { items: [{ artists: [{ id: "artist-spotify-1" }] }] } }),
    }));
    await page.route("https://api.spotify.com/v1/artists/artist-spotify-1", (route) => route.fulfill({
      contentType: "application/json", body: JSON.stringify({
        name: "Banda de prueba en Spotify", images: [], genres: ["rock"], followers: { total: 125 },
        popularity: 77, external_urls: { spotify: "https://open.spotify.com/artist/artist-spotify-1" },
      }),
    }));
    await page.route("https://api.spotify.com/v1/artists/artist-spotify-1/top-tracks?market=US", (route) => route.fulfill({
      contentType: "application/json", body: JSON.stringify({ tracks: [{
        id: "track-1", name: "Canción de prueba", album: { name: "Disco de prueba", images: [] },
        preview_url: null, external_urls: { spotify: "https://open.spotify.com/track/track-1" }, duration_ms: 61000,
      }] }),
    }));
    await page.route("https://ws.audioscrobbler.com/**", (route) => route.fulfill({
      contentType: "application/json", body: JSON.stringify({ artist: { bio: { summary: "Biografía Last.fm" }, tags: { tag: [] } } }),
    }));

    await page.goto(path);
    await expect(page).toHaveURL(path);
    await page.locator("h3").first().click();
    await page.getByText("Banda de prueba", { exact: true }).click();
    const detail = page.locator("div.fixed.inset-0.bg-black\\/60").last();
    const heading = detail.getByRole("heading", { name: "Banda de prueba en Spotify" });
    await expect(heading).toBeVisible();
    await expect(detail.getByText("Canción de prueba", { exact: true })).toBeVisible();
    await expect(detail.getByText("Biografía Last.fm", { exact: true })).toBeVisible();
    await detail.getByRole("button").click();
    await expect(heading).toHaveCount(0);
    await page.getByText("Banda de prueba", { exact: true }).click();
    await expect(heading).toBeVisible();
    await detail.click({ position: { x: 4, y: 4 } });
    await expect(heading).toHaveCount(0);
  });
}
