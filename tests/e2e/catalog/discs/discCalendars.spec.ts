import { expect, test } from "@playwright/test";
import { mockApi, seedSession } from "../../sessionFixtures";

test.use({ timezoneId: "Europe/Madrid" });

for (const { path, role } of [
  { path: "/calendar", role: "user" },
  { path: "/calendar-baby", role: "babyUser" },
]) {
  test(`calendar preserves pages, filters, month navigation and controls: ${path}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-30T12:00:00Z"));
    await mockApi(page);
    await seedSession(page, JSON.stringify([role]));
    const requests: URL[] = [];
    await page.route((url) => url.pathname.endsWith("/discs/date"), async (route) => {
      const url = new URL(route.request().url());
      requests.push(url);
      const offset = Number(url.searchParams.get("offset"));
      const month = url.searchParams.get("dateRange[]")?.slice(5, 7) ?? "09";
      const date = `2026-${month}-15`;
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({
        totalItems: 201, data: [{ releaseDate: date, discs: [{
          id: `disc-${offset}`, name: offset ? "Segundo disco" : "Álbum Único",
          artist: { id: "artist-1", name: "Bánda", countryId: null },
          genre: { id: "rock", name: "Rock", color: "#334455" },
          releaseDate: date, image: null, link: "https://open.spotify.com/album/1",
          ep: false, debut: false, verified: false, pinned: false,
          pendingId: null, nationalReleaseId: null,
        }] }],
      }) });
    });
    await page.goto(path);
    await expect(page).toHaveURL(path);
    await expect(page.locator("h3")).toHaveCount(1);
    await expect(page.getByText("2 discos", { exact: true })).toBeVisible();
    expect(requests.slice(0, 2).map((url) => url.searchParams.get("offset"))).toEqual(["0", "200"]);
    expect(requests[0].searchParams.getAll("dateRange[]")).toEqual([
      "2026-09-01T00:00:00.000Z", "2026-09-30T21:59:59.999Z",
    ]);
    await page.locator("h3").click();
    await expect(page.getByText("Álbum Único", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar HTML" })).toHaveCount(role === "user" ? 1 : 0);
    await expect(page.getByRole("button", { name: "Buscar en Spotify", exact: true })).toHaveCount(role === "user" ? 1 : 0);
    await expect(page.getByTitle("Editar nombre")).toHaveCount(role === "user" ? 2 : 0);
    await expect(page.getByRole("button", { name: "Last.fm búsqueda" })).toHaveCount(0);
    await page.getByPlaceholder("Buscar álbum o artista...").fill("album");
    await expect(page.locator("h3")).toHaveCount(role === "user" ? 1 : 0);
    await page.getByPlaceholder("Buscar álbum o artista...").fill("");
    await page.route((url) => url.pathname.endsWith("/pendings"), async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "pending-1" }) });
      } else {
        await route.continue();
      }
    });
    await page.route((url) => url.pathname.endsWith("/pendings/pending-1"), async (route) => {
      await route.fulfill({ status: 204, body: "" });
    });
    await page.getByRole("button", { name: "Septiembre", exact: true }).click();
    await page.locator("h3").click();
    const card = path === "/calendar"
      ? page.locator("#disc-disc-0")
      : page.locator("li").filter({ hasText: "Álbum Único" }).first();
    const bookmark = card.getByRole("button", { name: "Pendiente", exact: true });
    await expect(bookmark).toBeVisible();
    await bookmark.click();
    const savedBookmark = card.getByRole("button", { name: "¡Añadido!", exact: true });
    await expect(savedBookmark).toBeVisible();
    await page.clock.runFor(1600);
    await card.getByRole("button", { name: "Guardado", exact: true }).click();
    await expect(card.getByRole("button", { name: "Pendiente", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Octubre", exact: true }).click();
    await expect(page.locator("h3")).toContainText("15/10/2026");
    await expect(page.getByRole("button", { name: "Octubre", exact: true })).toHaveClass(/bg-rv-navy/);
    await expect(page).toHaveURL(path);
  });
}

test("calendar routes keep their role restrictions", async ({ page }) => {
  await mockApi(page);
  await seedSession(page, '["babyUser"]');
  await page.goto("/calendar");
  await expect(page).toHaveURL("/");
  await page.goto("/calendar-baby");
  await expect(page).toHaveURL("/calendar-baby");
});
