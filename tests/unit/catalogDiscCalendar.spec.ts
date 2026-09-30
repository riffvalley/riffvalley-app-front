import { afterEach, describe, expect, it, vi } from "vitest";
import { applyCalendarArtistUpdate, calendarMonthRange, removeCalendarDisc, sameLocalCalendarDay, type CalendarDisc, type CalendarGroup } from "../../src/modules/catalog/domain/discCalendar";
import { createCalendarPager, type CalendarLoadState, type CalendarPage } from "../../src/modules/catalog/application/discCalendar";
import { exportCalendarHtml } from "../../src/modules/catalog/application/calendarTools";
import { discCalendarApi } from "../../src/modules/catalog/infrastructure/discCalendarApi";
import { enrichCalendarDiscs, searchCalendarImages } from "../../src/app/dependencies/discCalendar";

const { get, patch, post, providerGet, token } = vi.hoisted(() => ({
  get: vi.fn(), patch: vi.fn(), post: vi.fn(), providerGet: vi.fn(), token: vi.fn(),
}));
vi.mock("@services/api/api.ts", () => ({ default: { get, patch, post } }));
vi.mock("axios", () => ({ default: { get: providerGet } }));
vi.mock("@helpers/SpotifyFunctions.ts", () => ({ obtenerTokenSpotify: token }));

const disc = (id: string): CalendarDisc => ({
  id, name: `Álbum ${id}`, releaseDate: "2026-09-18", artist: { id: "artist", name: "Banda" },
  genre: { id: "rock", name: "Rock", color: "#123456" }, image: null, link: null,
  ep: false, debut: false, verified: false, pinned: false, pendingId: null, nationalReleaseId: null,
});
const group = (...ids: string[]): CalendarGroup => ({ releaseDate: "2026-09-18", discs: ids.map(disc) });
const page = (...ids: string[]): CalendarPage => ({ data: [group(...ids)], totalItems: ids.length });
const selection = { year: 2026, month: 8 };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness(getPage = vi.fn()) {
  let state: CalendarLoadState = { groups: [], loading: false, offset: 0, hasMore: true, totalItems: 0 };
  const publish = vi.fn((next: CalendarLoadState) => { state = next; });
  return { pager: createCalendarPager({ getPage }, publish), getPage, publish, state: () => state };
}

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllEnvs(); });

describe("calendar rules and loading", () => {
  it("updates the calendar projection for every disc belonging to the artist", () => {
    const first = { ...disc("first"), artist: { id: "artist", name: "Banda" } };
    const other = { ...disc("other"), artist: { id: "other-artist", name: "Otra banda" } };
    const source = [
      { releaseDate: "2026-09-18", discs: [first, other] },
      { releaseDate: "2026-09-25", discs: [{ ...disc("third"), artist: { id: "artist", name: "Banda" } }] },
    ];

    const updated = applyCalendarArtistUpdate(source, "artist", { name: "Nombre nuevo", countryId: "fr" });

    expect(updated.flatMap((item) => item.discs).filter((item) => item.artist.id === "artist")
      .map((item) => item.artist)).toEqual([
      { id: "artist", name: "Nombre nuevo", countryId: "fr" },
      { id: "artist", name: "Nombre nuevo", countryId: "fr" },
    ]);
    expect(updated[0].discs[1].artist.name).toBe("Otra banda");
    expect(source[0].discs[0].artist.name).toBe("Banda");
  });

  it.each([
    ["UTC", 2, "2026-03-31T23:59:59.999Z"],
    ["Europe/Madrid", 2, "2026-03-31T21:59:59.999Z"],
    ["Europe/Madrid", 9, "2026-10-31T22:59:59.999Z"],
    ["America/New_York", 2, "2026-04-01T03:59:59.999Z"],
  ])("keeps UTC start and local end in %s, month %i", (timezone, month, end) => {
    vi.stubEnv("TZ", timezone);
    expect(calendarMonthRange(2026, month)).toEqual([`2026-${String(month + 1).padStart(2, "0")}-01T00:00:00.000Z`, end]);
  });

  it("keeps API order, exact group keys, duplicate entries, and drains all pages without observer races", async () => {
    const first = deferred<CalendarPage>();
    const h = harness(vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce({
      data: [{ ...group("b"), releaseDate: "2026-09-19" }, group("a")], totalItems: 201,
    }));
    const loading = h.pager.selectMonth(selection);
    expect(await h.pager.fetchNext()).toBe("idle");
    first.resolve({ ...page("a"), totalItems: 201 });
    expect(await loading).toBe("loaded");
    expect(h.getPage.mock.calls.map(([query]) => query.offset)).toEqual([0, 200]);
    expect(h.state().groups.map((item) => item.discs.map((entry) => entry.id))).toEqual([["a", "a"], ["b"]]);
    expect(h.state()).toMatchObject({ offset: 400, loading: false, hasMore: false });
    expect(h.state().groups[0].discs[0].genreId).toBeUndefined(); // baby first page stays unchanged
    expect(h.state().groups[0].discs[1].genreId).toBe("rock");
  });

  it("finishes an empty month with no further requests", async () => {
    const h = harness(vi.fn().mockResolvedValue({ data: [], totalItems: 0 }));
    await h.pager.selectMonth(selection);
    expect(h.state()).toMatchObject({ groups: [], hasMore: false, loading: false });
    expect(await h.pager.fetchNext()).toBe("idle");
    expect(h.getPage).toHaveBeenCalledTimes(1);
  });

  it.each(["resolve", "reject"] as const)("discards an obsolete first-page %s without clearing the newer loading state", async (finish) => {
    const old = deferred<CalendarPage>();
    const recent = deferred<CalendarPage>();
    const h = harness(vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise));
    const previous = h.pager.selectMonth(selection);
    const current = h.pager.selectMonth({ ...selection, month: 9, country: "ES" });
    if (finish === "resolve") old.resolve(page("old")); else old.reject(new Error("old failure"));
    expect(await previous).toBe("obsolete");
    expect(h.state()).toMatchObject({ loading: true, groups: [] });
    recent.resolve(page("new"));
    expect(await current).toBe("loaded");
    expect(h.state().groups[0].discs[0].id).toBe("new");
    expect(h.getPage.mock.calls[1][0]).toMatchObject({ offset: 0, country: "ES" });
  });

  it("discards obsolete subsequent pages and cancels updates on disposal", async () => {
    const later = deferred<CalendarPage>();
    const h = harness(vi.fn().mockResolvedValueOnce({ ...page("first"), totalItems: 201 }).mockReturnValueOnce(later.promise).mockResolvedValueOnce(page("new")));
    const old = h.pager.selectMonth(selection);
    await vi.waitFor(() => expect(h.getPage).toHaveBeenCalledTimes(2));
    await h.pager.selectMonth({ ...selection, month: 9 });
    later.resolve(page("obsolete"));
    expect(await old).toBe("obsolete");
    expect(h.state().groups[0].discs[0].id).toBe("new");
    const pending = deferred<CalendarPage>();
    h.getPage.mockReturnValueOnce(pending.promise);
    const disposed = h.pager.selectMonth(selection);
    h.pager.dispose();
    const calls = h.publish.mock.calls.length;
    pending.resolve(page("unmounted"));
    expect(await disposed).toBe("obsolete");
    expect(h.publish).toHaveBeenCalledTimes(calls);
  });

  it.each([0, 1])("stops failures on page %i without an endless loop, retaining partial data and allowing reselection", async (failurePage) => {
    const getPage = vi.fn();
    if (failurePage) getPage.mockResolvedValueOnce({ ...page("partial"), totalItems: 201 });
    getPage.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(page("retry"));
    const h = harness(getPage);
    expect(await h.pager.selectMonth(selection)).toBe("failed");
    expect(getPage).toHaveBeenCalledTimes(failurePage + 1);
    expect(h.state().loading).toBe(false);
    expect(await h.pager.fetchNext()).toBe("idle");
    expect(getPage).toHaveBeenCalledTimes(failurePage + 1);
    expect(h.state().groups.flatMap((item) => item.discs.map((entry) => entry.id))).toEqual(failurePage ? ["partial"] : []);
    expect(await h.pager.selectMonth(selection)).toBe("loaded");
    expect(h.state().groups[0].discs[0].id).toBe("retry");
  });

  it("removes a deleted/date-changed disc once and drops its empty group", () => {
    const groups = [group("a"), { ...group("a", "b"), releaseDate: "2026-09-19" }];
    expect(removeCalendarDisc(groups, "a").map((item) => item.discs.map((entry) => entry.id))).toEqual([["a"], ["b"]]);
    expect(groups[0].discs).toHaveLength(1);
    expect(removeCalendarDisc([group("a")], "a")).toEqual([]);
  });

  it("matches embedded dates by local day, rather than UTC strings", () => {
    vi.stubEnv("TZ", "America/New_York");
    expect(sameLocalCalendarDay("2026-09-18T01:00:00Z", new Date("2026-09-17T23:00:00Z"))).toBe(true);
    expect(sameLocalCalendarDay("2026-09-18T12:00:00Z", new Date("2026-09-17T23:00:00Z"))).toBe(false);
  });

  it("preserves HTML markup, link attributes, genre fallback and API order", () => {
    const items = [disc("one"), { ...disc("two"), genre: null }, { ...disc("three"), genre: { id: "other", name: "Jazz", color: "" } }];
    items[0].link = "https://listen.test";
    const html = exportCalendarHtml({ releaseDate: "2026-09-18", discs: items }, [{ id: "rock", name: "", color: "" }]);
    expect(html).toContain('class="wp-block-table is-style-stripes"');
    expect(html).toContain('(Sin nombre)</td>');
    expect(html).toContain('target="_blank" rel="noreferrer noopener"');
    expect(html).toContain('Sin género</td>');
    expect(html).toContain('Jazz</td>');
    expect(html.indexOf("Álbum one")).toBeLessThan(html.indexOf("Álbum two"));
  });
});

describe("calendar infrastructure and tool composition", () => {
  it("sends both country keys only when selected and hides transport errors", async () => {
    get.mockResolvedValueOnce({ data: page("a") }).mockResolvedValueOnce({ data: page("b") }).mockRejectedValueOnce({ response: { status: 503 } });
    const query = { limit: 200, offset: 0, dateRange: calendarMonthRange(2026, 8) };
    await discCalendarApi.getPage({ ...query, country: "ES" });
    expect(get).toHaveBeenLastCalledWith("/discs/date", { params: { ...query, country: "ES", countryId: "ES" } });
    await discCalendarApi.getPage(query);
    expect(get).toHaveBeenLastCalledWith("/discs/date", { params: query });
    await expect(discCalendarApi.getPage(query)).rejects.toThrow("calendar-load-failed");
  });

  it("searches sequentially with one token and keeps patch payloads and failure labels", async () => {
    token.mockResolvedValueOnce("token");
    providerGet.mockResolvedValueOnce({ data: { albums: { items: [{ external_urls: { spotify: "https://spotify.test" }, images: [{ url: "cover" }] }] } } })
      .mockResolvedValueOnce({ data: { albums: { items: [] } } }).mockRejectedValueOnce(new Error("provider failure"))
      .mockResolvedValueOnce({ data: { albums: { items: [{ external_urls: { spotify: "https://patch-fails.test" } }] } } });
    patch.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("patch failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const discs = [disc("one"), disc("two"), disc("three"), disc("four")];
    await enrichCalendarDiscs(discs);
    expect(token).toHaveBeenCalledTimes(1);
    expect(providerGet).toHaveBeenCalledTimes(4);
    expect(patch).toHaveBeenNthCalledWith(1, "/discs/one", { link: "https://spotify.test", image: "cover", verified: true, genreId: "rock" });
    expect(discs.map((item) => item.link)).toEqual(["https://spotify.test", "No se encontró el álbum", "Error al realizar la búsqueda", "Error al realizar la búsqueda"]);
    expect(discs[0].verified).toBe(false); // original UI changed link/image, not verified flag
    expect(discs[3].image).toBe(null);
  });

  it("does not search or patch when a token is unavailable", async () => {
    token.mockResolvedValueOnce(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await enrichCalendarDiscs([disc("a")]);
    expect(providerGet).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it("retains local Last.fm month/year and the day-of-month week calculation", async () => {
    vi.stubEnv("TZ", "Europe/Madrid");
    post.mockResolvedValueOnce({ data: { updated: 2 } });
    await searchCalendarImages("2026-09-14T23:30:00Z");
    expect(post).toHaveBeenCalledWith("/lastfm/fill-images", {}, { params: { month: 9, year: 2026, week: 3 } });
  });
});
