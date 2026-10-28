// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { AxiosError } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, type PropType } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/modules/identity/auth";
import type {
  RatesArtistLastfmResponseDto,
  RatesArtistLastfmCatalogDiscDto,
  RatesArtistSummaryDiscDto,
  RatesArtistSummaryResponseDto,
  RatesTopArtistDto,
} from "@services/rates/rates";

const { getRatesArtistSummary, getRatesArtistLastfm, resolveSpotifyAlbum, getSpotifyAlbumDetails } = vi.hoisted(() => ({
  getRatesArtistSummary: vi.fn(),
  getRatesArtistLastfm: vi.fn(),
  resolveSpotifyAlbum: vi.fn(),
  getSpotifyAlbumDetails: vi.fn(),
}));
vi.mock("@services/rates/rates", async (importOriginal) => {
  const original = await importOriginal<typeof import("@services/rates/rates")>();
  return { ...original, getRatesArtistSummary, getRatesArtistLastfm };
});
vi.mock("@services/spotify/spotifyLookup", () => ({ resolveSpotifyAlbum, getSpotifyAlbumDetails }));

import DashboardFavoriteArtistModal from "./DashboardFavoriteArtistModal.vue";

const artist: RatesTopArtistDto = {
  id: "00000000-0000-4000-8000-000000000023",
  name: "Artista inicial",
  image: "https://images.example/artist.jpg",
  ratingCount: 12,
  averageRate: 8.45,
};

function disc(index: number): RatesArtistSummaryDiscDto {
  return {
    id: `00000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
    name: `Disco ${index}`,
    image: index === 1 ? null : `https://images.example/disc-${index}.jpg`,
    releaseDate: index === 3 ? null : `202${index}-05-04`,
    rate: index === 0 ? 0 : 10 - index / 10,
    cover: index === 0 ? null : 8.5,
    rateId: `rate-${index}`,
    lastActivityAt: `2026-10-${String(index + 1).padStart(2, "0")}T18:30:00.123456`,
  };
}

function response(
  page = 1,
  changes: Partial<RatesArtistSummaryResponseDto> = {},
  totalDiscs = 3,
): RatesArtistSummaryResponseDto {
  const allDiscs = Array.from({ length: totalDiscs }, (_, index) => disc(index));
  const limit = 100;
  return {
    artist: {
      id: artist.id,
      name: "Artista de catálogo",
      image: "https://images.example/catalog-artist.jpg",
      country: { id: "country-1", name: "España", isoCode: "ES" },
      genres: [
        { id: "genre-rock", name: "Rock" },
        { id: "genre-post", name: "Post-punk" },
      ],
    },
    stats: {
      ratedDiscCount: totalDiscs,
      averageRate: 7.85,
      highestRatedDisc: { id: disc(1).id, name: "Mejor disco", rate: 10 },
      lowestRatedDisc: { id: disc(0).id, name: "Peor disco", rate: 0 },
      firstAvailableActivityAt: "2020-08-01T12:30:00.123456",
      lastAvailableActivityAt: "2026-10-27T18:30:00.123456",
    },
    discs: {
      data: allDiscs.slice((page - 1) * limit, page * limit),
      total: totalDiscs,
      page,
      limit,
      totalPages: Math.ceil(totalDiscs / limit),
    },
    ...changes,
  };
}

function lastfmResponse(
  artistId = artist.id,
  changes: Partial<RatesArtistLastfmResponseDto> = {},
): RatesArtistLastfmResponseDto {
  return {
    artistId,
    status: "available",
    biography: { summary: "Biografía real de Last.fm.\nSegundo párrafo.", url: "https://www.last.fm/music/Artista/+wiki" },
    tags: [
      { name: "Rock", url: "https://www.last.fm/tag/rock" },
      { name: "Post-punk", url: null },
    ],
    similarArtists: [
      {
        name: "Artista similar",
        url: "https://www.last.fm/music/Artista+similar",
        catalogArtistId: null,
        catalogDiscCount: 0,
        catalogDiscs: [],
      },
    ],
    listeners: 12_400,
    playCount: 85_000,
    lastfmUrl: "https://www.last.fm/music/Artista",
    ...changes,
  };
}

function similarArtist(overrides: Partial<RatesArtistLastfmResponseDto["similarArtists"][number]> = {}) {
  return {
    name: "Similar",
    url: "https://www.last.fm/music/Similar",
    catalogArtistId: null,
    catalogDiscCount: 0,
    catalogDiscs: [],
    ...overrides,
  };
}

function catalogDisc(overrides: Partial<RatesArtistLastfmCatalogDiscDto> & Pick<RatesArtistLastfmCatalogDiscDto, "id" | "name">): RatesArtistLastfmCatalogDiscDto {
  return {
    id: overrides.id,
    name: overrides.name,
    image: null,
    releaseYear: null,
    releaseDate: null,
    link: null,
    ep: false,
    debut: false,
    genre: null,
    averageRate: null,
    averageCover: null,
    voteCount: 0,
    commentCount: 0,
    userRate: null,
    favoriteId: null,
    pendingId: null,
    ...overrides,
  };
}

type DiscDetailPayload = {
  id: string;
  name: string;
  image: string | null;
  artist: { name: string };
};
const DiscDetailStub = defineComponent({
  name: "DiscDetail",
  props: { disc: { type: Object as PropType<DiscDetailPayload>, required: true } },
  emits: ["close"],
  setup(props, { emit }) {
    return () => h("div", { "data-test": "disc-detail-stub", "data-disc-id": props.disc.id }, [
      h("span", props.disc.name),
      h("button", { type: "button", onClick: () => emit("close") }, "Cerrar disco"),
    ]);
  },
});

const wrappers: Array<{ unmount: () => void }> = [];

function authenticatedPinia() {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore(pinia).$patch({
    token: "token",
    userId: "user-a",
    authStatus: "authenticated",
    role: "user",
  });
  return pinia;
}

function mountModal(selectedArtist = artist, pinia = authenticatedPinia(), useRealDiscDetail = false) {
  const wrapper = mount(DashboardFavoriteArtistModal, {
    props: { artist: selectedArtist },
    attachTo: document.body,
    global: { plugins: [pinia], stubs: useRealDiscDetail ? {} : { DiscDetail: DiscDetailStub } },
  });
  wrappers.push(wrapper);
  return { wrapper, pinia };
}

function bodyElement<T extends HTMLElement>(selector: string): T {
  const element = document.body.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element ${selector}`);
  return element;
}

describe("DashboardFavoriteArtistModal", () => {
  beforeEach(() => {
    getRatesArtistSummary.mockReset().mockResolvedValue(response());
    getRatesArtistLastfm.mockReset().mockResolvedValue(lastfmResponse());
    resolveSpotifyAlbum.mockReset().mockResolvedValue(null);
    getSpotifyAlbumDetails.mockReset();
    document.body.style.overflow = "";
  });

  afterEach(() => {
    for (const wrapper of wrappers.splice(0)) wrapper.unmount();
    document.body.querySelectorAll("[data-test='favorite-artist-dialog']").forEach((element) => element.remove());
    document.body.style.overflow = "";
  });

  it("loads only after opening, requests the selected UUID and displays the artist identity", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    let resolveSummary: ((value: RatesArtistSummaryResponseDto) => void) | undefined;
    getRatesArtistSummary.mockImplementationOnce(() => new Promise((resolve) => { resolveSummary = resolve; }));
    const { wrapper } = mountModal();
    await flushPromises();
    expect(getRatesArtistSummary).toHaveBeenCalledOnce();
    expect(getRatesArtistLastfm).toHaveBeenCalledOnce();
    expect(getRatesArtistLastfm.mock.calls[0]?.[0]).toBe(artist.id);
    expect(getRatesArtistLastfm.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
    const [id, params, signal] = getRatesArtistSummary.mock.calls[0] as [string, { page: number; limit: number }, AbortSignal];
    expect(id).toBe(artist.id);
    expect(params).toEqual({ page: 1, limit: 100 });
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(bodyElement("[data-test='artist-summary-loading']")).toBeTruthy();
    resolveSummary?.(response());
    await flushPromises();

    expect(bodyElement("#favorite-artist-modal-title").textContent).toBe("Tu historia con Artista de catálogo");
    expect(bodyElement<HTMLImageElement>("[aria-label='Identidad del artista'] img").src)
      .toBe("https://images.example/catalog-artist.jpg");
    expect(bodyElement("[aria-label='Identidad del artista']").textContent).toContain("España");
    expect(bodyElement("[aria-label='Identidad del artista']").textContent).toContain("Rock");
    expect(bodyElement("[aria-label='Identidad del artista']").textContent).toContain("Post-punk");
    expect(getRatesArtistSummary).toHaveBeenCalledOnce();
    wrapper.unmount();
    opener.remove();
  });

  it("integrates the three personal statistics into the artist header", async () => {
    mountModal();
    await flushPromises();
    const stats = bodyElement("[data-test='artist-summary-stats']");
    expect(stats.textContent).toContain("3");
    expect(stats.textContent).toContain("7,85");
    expect(stats.textContent).toContain("10");
    expect(stats.textContent).toContain("Mejor disco");
    expect(stats.textContent).not.toContain("score bayesiano");
    expect(bodyElement("[data-test='artist-header']").contains(stats)).toBe(true);
    expect(bodyElement("[data-test='favorite-artist-dialog']").querySelectorAll("[data-test='artist-summary-stats']")).toHaveLength(1);
    expect(document.body.querySelector("[data-test='artist-summary-stats'] article")).toBeNull();
    expect(bodyElement("[data-test='favorite-artist-dialog']").textContent).not.toContain("Peor nota");
    expect(bodyElement("[data-test='favorite-artist-dialog']").textContent).not.toContain("Primera actividad registrada");
    expect(bodyElement("[data-test='favorite-artist-dialog']").textContent).not.toContain("Última actividad registrada");
    expect(bodyElement("[data-test='favorite-artist-dialog']").textContent).not.toContain("primer o último voto musical histórico");
    expect(bodyElement("[data-test='artist-lastfm'] h3").textContent).toBe("Sobre el artista");
  });

  it("shows Catalog genres only when present and leaves optional artist fields clean", async () => {
    getRatesArtistSummary.mockResolvedValueOnce(response(1, {
      artist: { ...response().artist, image: null, country: null, genres: [] },
    }));
    mountModal({ ...artist, image: null });
    await flushPromises();
    const identity = bodyElement("[aria-label='Identidad del artista']");
    expect(identity.querySelector("img")).toBeNull();
    expect(identity.querySelector(".fa-music")).not.toBeNull();
    expect(identity.textContent).not.toContain("España");
    expect(identity.textContent).not.toContain("Rock");
    expect(bodyElement("[data-test='favorite-artist-dialog']").textContent).toContain("Artista de catálogo");
  });

  it("renders the sanitized biography as text with paragraphs and a safe profile link", async () => {
    getRatesArtistLastfm.mockResolvedValueOnce(lastfmResponse(artist.id, {
      biography: {
        summary: "<b>Texto recibido</b>\nSegundo párrafo.",
        url: "https://www.last.fm/music/Artista/+wiki",
      },
    }));
    mountModal();
    await flushPromises();
    const biography = bodyElement("[data-test='artist-lastfm-biography']");
    expect(biography.textContent).toBe("<b>Texto recibido</b>\nSegundo párrafo.");
    expect(biography.querySelector("b,script")).toBeNull();
    const profile = bodyElement<HTMLAnchorElement>("a[aria-label='Ver perfil del artista en Last.fm']");
    expect(profile.href).toBe("https://www.last.fm/music/Artista");
    expect(profile.target).toBe("_blank");
    expect(profile.rel).toContain("noopener");
    expect(profile.rel).toContain("noreferrer");
    expect(profile.textContent).toBe("Ver en Last.fm");
  });

  it("renders Last.fm tags and similar artists in backend order with only safe links", async () => {
    getRatesArtistLastfm.mockResolvedValueOnce(lastfmResponse(artist.id, {
      tags: [
        { name: "Rock", url: "https://www.last.fm/tag/rock" },
        { name: "Rock", url: "https://www.last.fm/tag/duplicate" },
        { name: "Sin enlace", url: null },
        { name: "No segura", url: "https://evil.example/tag" },
      ],
      similarArtists: [
        similarArtist({ name: "Similar 1", url: "https://www.last.fm/music/Similar+1" }),
        similarArtist({ name: "Similar 2", url: null }),
      ],
    }));
    mountModal();
    await flushPromises();
    const tagContainer = bodyElement("[data-test='artist-lastfm-tags']");
    expect([...tagContainer.querySelectorAll("a")].map(({ textContent }) => textContent)).toEqual(["Rock"]);
    expect(tagContainer.textContent).toContain("Sin enlace");
    expect(tagContainer.textContent).toContain("No segura");
    expect(tagContainer.querySelector("a[href*='evil.example']")).toBeNull();
    const similar = bodyElement("[data-test='artist-lastfm-similar']");
    expect(similar.textContent).toContain("Similar 1");
    expect(similar.textContent).toContain("Similar 2");
    expect(similar.querySelectorAll("a")).toHaveLength(1);
    expect(similar.querySelector("a[aria-label='Ver Similar 1 en Last.fm']")?.getAttribute("href"))
      .toBe("https://www.last.fm/music/Similar+1");
    expect(similar.querySelector("a[aria-label='Ver Similar 2 en Last.fm']")).toBeNull();
  });

  it("shows the singular count and expands the card for one unambiguous disc without another request", async () => {
    const oneDisc = catalogDisc({
      id: "00000000-0000-4000-8000-000000000101",
      name: "Álbum único",
      image: "https://images.example/unique.jpg",
      releaseYear: 2024,
    });
    getRatesArtistLastfm.mockResolvedValueOnce(lastfmResponse(artist.id, {
      similarArtists: [similarArtist({
        catalogArtistId: "00000000-0000-4000-8000-000000000100",
        catalogDiscCount: 1,
        catalogDiscs: [oneDisc],
      })],
    }));
    const { wrapper } = mountModal();
    await flushPromises();
    const toggle = bodyElement<HTMLButtonElement>("[data-test='similar-artist-toggle']");
    expect(bodyElement("[data-test='artist-lastfm-similar']").textContent).toContain("1 disco en Riff Valley");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toContain("Mostrar disco");
    toggle.click();
    await flushPromises();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(bodyElement("[data-test='similar-artist-disc-name']").textContent).toBe(oneDisc.name);
    expect(wrapper.emitted("close")).toBeUndefined();
    toggle.click();
    await flushPromises();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(getRatesArtistLastfm).toHaveBeenCalledOnce();
  });

  it("expands multiple Catalog discs in backend order with artwork fallback and accessible release years", async () => {
    const multiple = [
      catalogDisc({ id: "00000000-0000-4000-8000-000000000111", name: "Segundo", link: "https://greyhaven.bandcamp.com/album/ep" }),
      catalogDisc({
        id: "00000000-0000-4000-8000-000000000112",
        name: "Primero",
        image: "https://images.example/cover.jpg",
        releaseYear: 1999,
        releaseDate: "1999-06-15",
        link: "https://open.spotify.com/album/4abc123",
        ep: true,
        debut: true,
        genre: { name: "Metal", color: "#991b1b" },
        averageRate: 8.75,
        averageCover: 7.5,
        voteCount: 12,
        commentCount: 3,
        userRate: { id: "user-rate-1", rate: 9, cover: null },
      }),
    ];
    getRatesArtistLastfm.mockResolvedValueOnce(lastfmResponse(artist.id, {
      similarArtists: [similarArtist({
        catalogArtistId: "00000000-0000-4000-8000-000000000110",
        catalogDiscCount: 5,
        catalogDiscs: multiple,
      })],
    }));
    const { wrapper } = mountModal();
    await flushPromises();
    const toggle = bodyElement<HTMLButtonElement>("[data-test='similar-artist-toggle']");
    expect(bodyElement("[data-test='artist-lastfm-similar']").textContent).toContain("5 discos en Riff Valley");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.focus();
    toggle.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    toggle.click();
    await flushPromises();
    const list = bodyElement("[data-test='similar-artist-discs']");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(list.getAttribute("aria-labelledby")).toBe(toggle.getAttribute("id"));
    expect([...list.querySelectorAll("[data-test='similar-artist-disc-name']")].map((name) => name.textContent))
      .toEqual(["Segundo", "Primero"]);
    expect([...list.querySelectorAll("[data-test='similar-artist-disc-artist']")].map((name) => name.textContent))
      .toEqual(["Similar", "Similar"]);
    expect(list.querySelectorAll("[data-test='similar-artist-disc-year']")[1]?.textContent).toContain("1999");
    expect(list.querySelector("img")?.getAttribute("src")).toContain("disco.png");
    const bandcampLink = list.querySelector<HTMLAnchorElement>("[data-test='similar-artist-platform-link']");
    expect(bandcampLink?.getAttribute("href")).toBe("https://greyhaven.bandcamp.com/album/ep");
    expect(bandcampLink?.getAttribute("aria-label")).toContain("Escuchar en Bandcamp");
    expect(list.querySelector("img[alt='Portada de Primero']")?.getAttribute("src")).toBe(multiple[1]?.image);
    expect(list.querySelector("[data-test='similar-artist-disc-average-rate']")?.textContent).toBe("—");
    const populatedCard = list.querySelectorAll("[data-test='similar-artist-disc']")[1];
    expect(populatedCard?.querySelector("[data-test='similar-artist-disc-average-rate']")?.textContent).toBe("8.75");
    expect(populatedCard?.querySelector("[data-test='similar-artist-disc-average-cover']")?.textContent).toBe("7.50");
    expect(populatedCard?.textContent).toContain("EP");
    expect(populatedCard?.textContent).toContain("Álbum debut");
    expect(populatedCard?.textContent).toContain("Metal");
    expect(populatedCard?.textContent).toContain("12 votos");
    expect(populatedCard?.textContent).toContain("3 comentarios");
    expect(populatedCard?.textContent).toContain("Tu nota: 9.00");
    expect(populatedCard?.querySelector("[data-test='similar-artist-disc-year']")?.textContent).toContain("1999");
    expect(populatedCard?.querySelectorAll("button")).toHaveLength(0);
    const spotifyLink = populatedCard?.querySelector<HTMLAnchorElement>("[data-test='similar-artist-platform-link']");
    expect(spotifyLink?.getAttribute("href")).toBe("https://open.spotify.com/album/4abc123");
    expect(spotifyLink?.getAttribute("target")).toBe("_blank");
    expect(spotifyLink?.getAttribute("rel")).toContain("noopener noreferrer");
    expect(spotifyLink?.getAttribute("aria-label")).toContain("Escuchar en Spotify");
    bodyElement("[data-test='similar-artist-disc']").click();
    await flushPromises();
    expect(wrapper.emitted("selectCatalogDisc")).toBeUndefined();
    expect(wrapper.emitted("close")).toBeUndefined();
    expect(getRatesArtistLastfm).toHaveBeenCalledOnce();
  });

  it("keeps only one similar-artist selector open and lets the same button close it", async () => {
    getRatesArtistLastfm.mockResolvedValueOnce(lastfmResponse(artist.id, {
      similarArtists: [
        similarArtist({ name: "Primera", catalogArtistId: "00000000-0000-4000-8000-000000000120", catalogDiscCount: 2, catalogDiscs: [
          catalogDisc({ id: "00000000-0000-4000-8000-000000000121", name: "A" }),
          catalogDisc({ id: "00000000-0000-4000-8000-000000000122", name: "B" }),
        ] }),
        similarArtist({ name: "Segunda", catalogArtistId: "00000000-0000-4000-8000-000000000123", catalogDiscCount: 2, catalogDiscs: [
          catalogDisc({ id: "00000000-0000-4000-8000-000000000124", name: "C" }),
          catalogDisc({ id: "00000000-0000-4000-8000-000000000125", name: "D" }),
        ] }),
      ],
    }));
    const { wrapper } = mountModal();
    await flushPromises();
    const toggles = [...document.body.querySelectorAll<HTMLButtonElement>("[data-test='similar-artist-toggle']")];
    toggles[0]?.click();
    await flushPromises();
    expect(toggles[0]?.getAttribute("aria-expanded")).toBe("true");
    toggles[1]?.click();
    await flushPromises();
    expect(toggles[0]?.getAttribute("aria-expanded")).toBe("false");
    expect(toggles[1]?.getAttribute("aria-expanded")).toBe("true");
    toggles[1]?.click();
    await flushPromises();
    expect(toggles[1]?.getAttribute("aria-expanded")).toBe("false");
    expect(wrapper.findAll("[data-test='similar-artist-discs']")).toHaveLength(0);
  });

  it("does not offer internal navigation for no-match, ambiguous, invalid-ID, or inconsistent Catalog data", async () => {
    getRatesArtistLastfm.mockResolvedValueOnce(lastfmResponse(artist.id, {
      similarArtists: [
        similarArtist({ name: "Sin discos" }),
        similarArtist({ name: "Sin artista único", catalogDiscCount: 1, catalogDiscs: [
          catalogDisc({ id: "00000000-0000-4000-8000-000000000131", name: "Ambiguo" }),
        ] }),
        similarArtist({ name: "ID inválido", catalogArtistId: "invalid", catalogDiscCount: 1, catalogDiscs: [
          catalogDisc({ id: "00000000-0000-4000-8000-000000000132", name: "No navegable" }),
        ] }),
        similarArtist({ name: "Disco sin ID", catalogArtistId: "00000000-0000-4000-8000-000000000133", catalogDiscCount: 1, catalogDiscs: [
          catalogDisc({ id: "", name: "No navegable" }),
        ] }),
        similarArtist({ name: "Lista incompleta", url: null, catalogArtistId: "00000000-0000-4000-8000-000000000134", catalogDiscCount: 4, catalogDiscs: [
          catalogDisc({ id: "00000000-0000-4000-8000-000000000135", name: "Solo uno real" }),
        ] }),
      ],
    }));
    mountModal();
    await flushPromises();
    const similar = bodyElement("[data-test='artist-lastfm-similar']");
    expect(similar.querySelectorAll("[data-test='similar-artist-toggle']")).toHaveLength(0);
    expect(similar.textContent).toContain("4 discos en Riff Valley");
    expect(similar.querySelector("a[aria-label='Ver Sin discos en Last.fm']")?.getAttribute("rel")).toContain("noopener noreferrer");
    expect(similar.querySelector("a[aria-label='Ver Lista incompleta en Last.fm']")).toBeNull();
    expect(similar.querySelectorAll("[data-test='similar-artist-discs']")).toHaveLength(0);
  });

  it("shows names without external links when Last.fm omits URLs and closes expanded content when the artist changes", async () => {
    const oldId = artist.id;
    const nextArtist = { ...artist, id: "00000000-0000-4000-8000-000000000024", name: "Otro artista" };
    getRatesArtistLastfm.mockReset()
      .mockResolvedValueOnce(lastfmResponse(oldId, {
        similarArtists: [similarArtist({
          catalogArtistId: "00000000-0000-4000-8000-000000000140",
          catalogDiscCount: 2,
          catalogDiscs: [
            catalogDisc({ id: "00000000-0000-4000-8000-000000000141", name: "A" }),
            catalogDisc({ id: "00000000-0000-4000-8000-000000000142", name: "B" }),
          ],
        })],
      }))
      .mockResolvedValueOnce(lastfmResponse(nextArtist.id, {
        similarArtists: [similarArtist({ name: "Sin URL", url: null })],
      }));
    const { wrapper } = mountModal();
    await flushPromises();
    bodyElement<HTMLButtonElement>("[data-test='similar-artist-toggle']").click();
    await flushPromises();
    expect(document.body.querySelector("[data-test='similar-artist-discs']")).not.toBeNull();
    await wrapper.setProps({ artist: nextArtist });
    await flushPromises();
    expect(document.body.querySelector("[data-test='similar-artist-discs']")).toBeNull();
    expect(getRatesArtistLastfm).toHaveBeenCalledTimes(2);
    expect(document.body.querySelector("a[aria-label='Ver Sin URL en Last.fm']")).toBeNull();
    expect(document.body.querySelector("[data-test='artist-lastfm-similar']")?.textContent).toContain("Sin URL");
  });

  it("formats external listener and play counts and supports partial responses", async () => {
    getRatesArtistLastfm.mockResolvedValueOnce(lastfmResponse(artist.id, {
      biography: null,
      tags: [],
      similarArtists: [],
      listeners: 12_400,
      playCount: 85_000,
      lastfmUrl: null,
    }));
    mountModal();
    await flushPromises();
    expect(bodyElement("[data-test='artist-lastfm-counts']").textContent).toContain("12.400 oyentes");
    expect(bodyElement("[data-test='artist-lastfm-counts']").textContent).toContain("85.000 reproducciones");
    expect(document.body.querySelector("[data-test='artist-lastfm-biography']")).toBeNull();
    expect(document.body.querySelector("[data-test='artist-lastfm-tags']")).toBeNull();
    expect(document.body.querySelector("[data-test='artist-lastfm-similar']")).toBeNull();
    expect(document.body.querySelector("a[aria-label='Ver perfil del artista en Last.fm']")).toBeNull();
  });

  it("shows a no-data state without inventing biography, tags, similar artists, metrics or links", async () => {
    getRatesArtistLastfm.mockResolvedValueOnce(lastfmResponse(artist.id, {
      biography: null,
      tags: [],
      similarArtists: [],
      listeners: null,
      playCount: null,
      lastfmUrl: null,
    }));
    mountModal();
    await flushPromises();
    expect(bodyElement("[data-test='artist-lastfm-content']").textContent)
      .toContain("No hay más información disponible en Last.fm.");
    expect(document.body.querySelector("[data-test='artist-lastfm-biography']")).toBeNull();
    expect(document.body.querySelector("[data-test='artist-lastfm-counts']")).toBeNull();
    expect(document.body.querySelector("a[href*='last.fm']")).toBeNull();
  });

  it.each([
    ["not_found", "No encontramos información de este artista en Last.fm.", false],
    ["unavailable", "Last.fm no está disponible en este momento.", true],
    ["not_configured", "Información externa no disponible.", false],
    ["invalid_response", "No se pudo validar la información recibida.", true],
  ] as const)("handles the Last.fm status %s without hiding Rates data", async (status, message, canRetry) => {
    getRatesArtistLastfm.mockResolvedValueOnce(lastfmResponse(artist.id, {
      status,
      biography: null,
      tags: [],
      similarArtists: [],
      listeners: null,
      playCount: null,
      lastfmUrl: null,
    }));
    mountModal();
    await flushPromises();
    expect(bodyElement("[data-test='artist-lastfm-content']").textContent).toContain(message);
    expect(bodyElement("[data-test='artist-summary-stats']").textContent).toContain("7,85");
    expect(document.body.querySelectorAll("[data-test='artist-disc-row']")).toHaveLength(3);
    expect(document.body.querySelector("[data-test='artist-lastfm-content'] button") !== null).toBe(canRetry);
  });

  it("retries only the Last.fm request when Last.fm returns unavailable", async () => {
    getRatesArtistLastfm.mockResolvedValueOnce(lastfmResponse(artist.id, { status: "unavailable" }))
      .mockResolvedValueOnce(lastfmResponse());
    mountModal();
    await flushPromises();
    bodyElement<HTMLButtonElement>("[data-test='artist-lastfm-content'] button").click();
    await flushPromises();
    expect(getRatesArtistLastfm).toHaveBeenCalledTimes(2);
    expect(getRatesArtistSummary).toHaveBeenCalledOnce();
    expect(bodyElement("[data-test='artist-lastfm-biography']").textContent).toContain("Biografía real");
  });

  it("shows an isolated HTTP/network error and retries without affecting personal data", async () => {
    getRatesArtistLastfm.mockRejectedValueOnce(new AxiosError("offline", "ERR_NETWORK"))
      .mockResolvedValueOnce(lastfmResponse());
    mountModal();
    await flushPromises();
    expect(bodyElement("[data-test='artist-lastfm-error']").textContent).toContain("No se pudo cargar la información");
    expect(bodyElement("[data-test='artist-summary-stats']").textContent).toContain("7,85");
    expect(document.body.querySelectorAll("[data-test='artist-disc-row']")).toHaveLength(3);
    bodyElement<HTMLButtonElement>("[data-test='artist-lastfm-error'] button").click();
    await flushPromises();
    expect(getRatesArtistLastfm).toHaveBeenCalledTimes(2);
    expect(getRatesArtistSummary).toHaveBeenCalledOnce();
    expect(document.body.querySelector("[data-test='artist-lastfm-error']")).toBeNull();
  });

  it("shows an empty artist as zero data without treating it as an HTTP error", async () => {
    getRatesArtistSummary.mockResolvedValueOnce(response(1, {
      stats: {
        ratedDiscCount: 0,
        averageRate: null,
        highestRatedDisc: null,
        lowestRatedDisc: null,
        firstAvailableActivityAt: null,
        lastAvailableActivityAt: null,
      },
      discs: { data: [], total: 0, page: 1, limit: 100, totalPages: 0 },
    }));
    mountModal();
    await flushPromises();
    expect(bodyElement("[data-test='artist-no-rates']").textContent).toContain("Todavía no has valorado discos");
    expect(bodyElement("[data-test='artist-summary-stats']").textContent).toContain("Discos valorados0");
    expect(bodyElement("[data-test='artist-summary-stats']").textContent).toContain("Nota media—");
    expect(document.body.querySelector("[role='alert']")).toBeNull();
    expect(document.body.querySelector("nav[aria-label='Paginación de discos valorados']")).toBeNull();
  });

  it("renders the backend page in its original order with release years, zero rates, null cover and fallbacks", async () => {
    mountModal();
    await flushPromises();
    const rows = [...document.body.querySelectorAll<HTMLElement>("[data-test='artist-disc-row']")];
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.querySelector("button[aria-label]")?.textContent)).toEqual(Array.from({ length: 3 }, (_, index) => `Disco ${index}`));
    expect(rows[0]?.textContent).toContain("0");
    expect(rows[0]?.textContent).toContain("—");
    expect(rows[0]?.textContent).toContain("2020");
    expect(rows[1]?.querySelector("img")?.src).toContain("disco.png");
    expect(bodyElement("[data-test='artist-disc-list']").textContent).toContain("(3)");
    expect(document.body.querySelector("nav[aria-label='Paginación de discos valorados']")).toBeNull();
    expect(document.body.textContent).not.toContain("Página 1 de");
  });

  it("opens the existing disc detail action with the Catalog disc ID", async () => {
    mountModal();
    await flushPromises();
    bodyElement<HTMLButtonElement>("button[aria-label='Abrir detalle de Disco 0']").click();
    await flushPromises();
    expect(bodyElement("[data-test='disc-detail-stub']").getAttribute("data-disc-id")).toBe(disc(0).id);
    expect(bodyElement("[data-test='disc-detail-stub']").textContent).toContain("Disco 0");
    bodyElement<HTMLButtonElement>("[data-test='disc-detail-stub'] button").click();
    await flushPromises();
    expect(document.body.querySelector("[data-test='disc-detail-stub']")).toBeNull();
  });

  it("closes the real disc dialog with Escape and returns focus without closing the artist dialog", async () => {
    mountModal(artist, authenticatedPinia(), true);
    await flushPromises();
    const opener = bodyElement<HTMLButtonElement>("button[aria-label='Abrir detalle de Disco 0']");
    opener.focus();
    opener.click();
    await flushPromises();

    const detail = bodyElement<HTMLElement>("[role='dialog'][aria-label='Detalle del disco Disco 0']");
    expect(detail).toBeTruthy();
    const closeButton = detail.querySelector<HTMLButtonElement>("button[aria-label='Cerrar detalle del disco']");
    expect(closeButton).toBeTruthy();
    closeButton!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await flushPromises();

    expect(document.body.querySelector("[aria-label='Detalle del disco Disco 0']")).toBeNull();
    expect(document.body.querySelector("[data-test='favorite-artist-dialog']")).not.toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it.each([1, 2, 3])("loads all %i usual discs in one request with limit 100 and no pagination UI", async (count) => {
    getRatesArtistSummary.mockResolvedValueOnce(response(1, {}, count));
    mountModal();
    await flushPromises();
    expect(getRatesArtistSummary.mock.calls[0]?.[1]).toEqual({ page: 1, limit: 100 });
    expect(document.body.querySelectorAll("[data-test='artist-disc-row']")).toHaveLength(count);
    expect(document.body.querySelector("nav[aria-label='Paginación de discos valorados']")).toBeNull();
    expect(document.body.textContent).not.toContain("Página 1 de");
    expect(document.body.querySelector("[data-test='artist-more-button']")).toBeNull();
  });

  it("loads over 100 discs on demand, preserving backend order and avoiding duplicates", async () => {
    getRatesArtistSummary.mockResolvedValueOnce(response(1, {}, 150))
      .mockResolvedValueOnce(response(2, {
        discs: {
          ...response(2, {}, 150).discs,
          data: [disc(99), ...Array.from({ length: 50 }, (_, index) => disc(index + 100))],
        },
      }, 150));
    mountModal();
    await flushPromises();
    expect(getRatesArtistSummary.mock.calls[0]?.[1]).toEqual({ page: 1, limit: 100 });
    expect(document.body.querySelectorAll("[data-test='artist-disc-row']")).toHaveLength(100);
    expect(bodyElement("[data-test='artist-disc-list']").textContent).toContain("(150)");
    expect(getRatesArtistSummary).toHaveBeenCalledOnce();
    bodyElement<HTMLButtonElement>("[data-test='artist-more-button']").click();
    await flushPromises();
    expect(getRatesArtistSummary.mock.calls[1]?.[1]).toEqual({ page: 2, limit: 100 });
    const rows = [...document.body.querySelectorAll<HTMLElement>("[data-test='artist-disc-row']")];
    expect(rows).toHaveLength(150);
    expect(rows[99]?.textContent).toContain("Disco 99");
    expect(rows[100]?.textContent).toContain("Disco 100");
    expect(new Set(rows.map((row) => row.querySelector("button[aria-label]")?.getAttribute("aria-label"))).size).toBe(150);
    expect(document.body.querySelector("[data-test='artist-more-button']")).toBeNull();
  });

  it("keeps loaded discs after a load-more error and retries the failed page", async () => {
    getRatesArtistSummary.mockResolvedValueOnce(response(1, {}, 101))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response(2, {}, 101));
    mountModal();
    await flushPromises();
    bodyElement<HTMLButtonElement>("[data-test='artist-more-button']").click();
    await flushPromises();
    expect(document.body.querySelectorAll("[data-test='artist-disc-row']")).toHaveLength(100);
    expect(bodyElement("[data-test='artist-more-error']").textContent).toContain("No se pudieron cargar");
    bodyElement<HTMLButtonElement>("[data-test='artist-more-error'] button").click();
    await flushPromises();
    expect(getRatesArtistSummary.mock.calls[2]?.[1]).toEqual({ page: 2, limit: 100 });
    expect(document.body.querySelectorAll("[data-test='artist-disc-row']")).toHaveLength(101);
    expect(document.body.querySelector("[data-test='artist-more-error']")).toBeNull();
  });

  it("retries an initial failure and displays a separate not-found response", async () => {
    getRatesArtistSummary.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response());
    mountModal();
    await flushPromises();
    expect(document.body.querySelector("[data-test='artist-summary-error']")).not.toBeNull();
    bodyElement<HTMLButtonElement>("[data-test='artist-summary-error'] button").click();
    await flushPromises();
    expect(getRatesArtistSummary).toHaveBeenCalledTimes(2);
    expect(document.body.querySelector("[data-test='artist-summary-error']")).toBeNull();

    const notFound = new AxiosError("missing", "404", undefined, undefined, {
      status: 404,
      statusText: "Not Found",
      headers: {},
      config: { headers: {} },
      data: {},
    });
    getRatesArtistSummary.mockRejectedValueOnce(notFound);
    mountModal();
    await flushPromises();
    expect(bodyElement("[data-test='artist-summary-not-found']").textContent).toContain("ya no está disponible");
    expect(document.body.querySelector("[data-test='artist-no-rates']")).toBeNull();
  });

  it("cancels an old artist request and resets to page one when the selected artist changes", async () => {
    let oldSignal: AbortSignal | undefined;
    let resolveOld: ((value: RatesArtistSummaryResponseDto) => void) | undefined;
    getRatesArtistSummary.mockImplementationOnce((_id: string, _params: unknown, signal: AbortSignal) => {
      oldSignal = signal;
      return new Promise((resolve) => { resolveOld = resolve; });
    }).mockResolvedValueOnce(response(1, { artist: { ...response().artist, name: "Artista nuevo" } }));
    const { wrapper } = mountModal();
    await flushPromises();
    const anotherArtist = { ...artist, id: "00000000-0000-4000-8000-000000000024", name: "Artista nuevo" };
    await wrapper.setProps({ artist: anotherArtist });
    await flushPromises();
    resolveOld?.(response());
    await flushPromises();
    expect(oldSignal?.aborted).toBe(true);
    expect(getRatesArtistSummary.mock.calls[1]?.[0]).toBe(anotherArtist.id);
    expect(getRatesArtistSummary.mock.calls[1]?.[1]).toEqual({ page: 1, limit: 100 });
    expect(bodyElement("[data-test='favorite-artist-dialog']").textContent).toContain("Artista nuevo");
    expect(bodyElement("[data-test='favorite-artist-dialog']").textContent).not.toContain("Artista de catálogo");
  });

  it("cancels Last.fm for the previous artist and ignores its late response", async () => {
    let oldSignal: AbortSignal | undefined;
    let resolveOld: ((value: RatesArtistLastfmResponseDto) => void) | undefined;
    getRatesArtistLastfm.mockImplementationOnce((id: string, signal: AbortSignal) => {
      oldSignal = signal;
      return new Promise((resolve) => { resolveOld = resolve; });
    }).mockImplementationOnce(async (id: string) => lastfmResponse(id, {
      biography: { summary: "Biografía del artista nuevo", url: null },
      tags: [],
      similarArtists: [],
      listeners: null,
      playCount: null,
      lastfmUrl: null,
    }));
    const { wrapper } = mountModal();
    await flushPromises();
    const anotherArtist = { ...artist, id: "00000000-0000-4000-8000-000000000024", name: "Artista nuevo" };
    await wrapper.setProps({ artist: anotherArtist });
    await flushPromises();
    resolveOld?.(lastfmResponse(artist.id, {
      biography: { summary: "Biografía obsoleta", url: null },
      tags: [],
      similarArtists: [],
      listeners: null,
      playCount: null,
      lastfmUrl: null,
    }));
    await flushPromises();
    expect(oldSignal?.aborted).toBe(true);
    expect(getRatesArtistLastfm).toHaveBeenCalledTimes(2);
    expect(getRatesArtistLastfm.mock.calls[1]?.[0]).toBe(anotherArtist.id);
    expect(bodyElement("[data-test='artist-lastfm-biography']").textContent).toBe("Biografía del artista nuevo");
    expect(document.body.textContent).not.toContain("Biografía obsoleta");
  });

  it("cancels load-more and discards its response when the artist changes", async () => {
    let oldSignal: AbortSignal | undefined;
    let resolveOldPage: ((value: RatesArtistSummaryResponseDto) => void) | undefined;
    getRatesArtistSummary.mockResolvedValueOnce(response(1, {}, 150)).mockImplementationOnce(
      (_id: string, _params: unknown, signal: AbortSignal) => {
        oldSignal = signal;
        return new Promise((resolve) => { resolveOldPage = resolve; });
      },
    ).mockResolvedValueOnce(response(1, { artist: { ...response().artist, name: "Artista nuevo" } }, 2));
    const { wrapper } = mountModal();
    await flushPromises();
    bodyElement<HTMLButtonElement>("[data-test='artist-more-button']").click();
    await flushPromises();
    const anotherArtist = { ...artist, id: "00000000-0000-4000-8000-000000000024", name: "Artista nuevo" };
    await wrapper.setProps({ artist: anotherArtist });
    await flushPromises();
    resolveOldPage?.(response(2, {}, 150));
    await flushPromises();
    expect(oldSignal?.aborted).toBe(true);
    expect(getRatesArtistSummary.mock.calls[2]?.[1]).toEqual({ page: 1, limit: 100 });
    expect(document.body.querySelectorAll("[data-test='artist-disc-row']")).toHaveLength(2);
    expect(bodyElement("[data-test='favorite-artist-dialog']").textContent).toContain("Artista nuevo");
  });

  it("clears personal data and reloads after a session change", async () => {
    let oldSignal: AbortSignal | undefined;
    getRatesArtistSummary.mockImplementationOnce((_id: string, _params: unknown, signal: AbortSignal) => {
      oldSignal = signal;
      return new Promise(() => undefined);
    }).mockResolvedValueOnce(response());
    const pinia = authenticatedPinia();
    const auth = useAuthStore(pinia);
    mountModal(artist, pinia);
    await flushPromises();
    auth.$patch({ userId: "user-b", authSessionGeneration: auth.authSessionGeneration + 1 });
    await flushPromises();
    expect(oldSignal?.aborted).toBe(true);
    expect(getRatesArtistSummary).toHaveBeenCalledTimes(2);
    expect(bodyElement("[data-test='favorite-artist-dialog']").textContent).toContain("Artista de catálogo");
    expect(getRatesArtistSummary.mock.calls[1]?.[0]).toBe(artist.id);
  });

  it("cancels and refreshes Last.fm when the user session changes", async () => {
    let oldSignal: AbortSignal | undefined;
    getRatesArtistLastfm.mockImplementationOnce((_id: string, signal: AbortSignal) => {
      oldSignal = signal;
      return new Promise(() => undefined);
    }).mockImplementationOnce(async (id: string) => lastfmResponse(id, {
      biography: { summary: "Información de la nueva sesión", url: null },
      tags: [],
      similarArtists: [],
      listeners: null,
      playCount: null,
      lastfmUrl: null,
    }));
    const pinia = authenticatedPinia();
    const auth = useAuthStore(pinia);
    mountModal(artist, pinia);
    await flushPromises();
    auth.$patch({ userId: "user-b", authSessionGeneration: auth.authSessionGeneration + 1 });
    await flushPromises();
    expect(oldSignal?.aborted).toBe(true);
    expect(getRatesArtistLastfm).toHaveBeenCalledTimes(2);
    expect(bodyElement("[data-test='artist-lastfm-biography']").textContent).toBe("Información de la nueva sesión");
  });

  it("cancels an in-flight load-more request and discards its response after a session change", async () => {
    let resolveOldPage: ((value: RatesArtistSummaryResponseDto) => void) | undefined;
    let oldPageSignal: AbortSignal | undefined;
    getRatesArtistSummary.mockResolvedValueOnce(response(1, {}, 150)).mockImplementationOnce(
      (_id: string, _params: unknown, signal: AbortSignal) => {
        oldPageSignal = signal;
        return new Promise((resolve) => { resolveOldPage = resolve; });
      },
    ).mockResolvedValueOnce(response(1, {
      artist: { ...response().artist, name: "Artista del usuario B" },
    }, 2));
    const pinia = authenticatedPinia();
    const auth = useAuthStore(pinia);
    mountModal(artist, pinia);
    await flushPromises();
    bodyElement<HTMLButtonElement>("[data-test='artist-more-button']").click();
    auth.$patch({ userId: "user-b", authSessionGeneration: auth.authSessionGeneration + 1 });
    await flushPromises();
    resolveOldPage?.(response(2, {}, 150));
    await flushPromises();
    expect(oldPageSignal?.aborted).toBe(true);
    expect(bodyElement("[data-test='favorite-artist-dialog']").textContent).toContain("Artista del usuario B");
    expect(document.body.querySelectorAll("[data-test='artist-disc-row']")).toHaveLength(2);
    expect(bodyElement("[data-test='favorite-artist-dialog']").textContent).not.toContain("Disco 100");
  });

  it("closes on Escape, restores focus, and cancels its request when unmounted", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    let signal: AbortSignal | undefined;
    let lastfmSignal: AbortSignal | undefined;
    getRatesArtistSummary.mockImplementationOnce((_id: string, _params: unknown, requestSignal: AbortSignal) => {
      signal = requestSignal;
      return new Promise(() => undefined);
    });
    getRatesArtistLastfm.mockImplementationOnce((_id: string, requestSignal: AbortSignal) => {
      lastfmSignal = requestSignal;
      return new Promise(() => undefined);
    });
    const { wrapper } = mountModal();
    await flushPromises();
    expect(document.activeElement).toBe(bodyElement("[aria-label='Cerrar historia del artista']"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
    await flushPromises();
    expect(signal?.aborted).toBe(true);
    expect(lastfmSignal?.aborted).toBe(true);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("cancels an in-flight load-more request when Escape closes the modal", async () => {
    let signal: AbortSignal | undefined;
    getRatesArtistSummary.mockResolvedValueOnce(response(1, {}, 150)).mockImplementationOnce(
      (_id: string, _params: unknown, requestSignal: AbortSignal) => {
        signal = requestSignal;
        return new Promise(() => undefined);
      },
    );
    const { wrapper } = mountModal();
    await flushPromises();
    bodyElement<HTMLButtonElement>("[data-test='artist-more-button']").click();
    await flushPromises();
    expect(signal?.aborted).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    wrapper.unmount();
    await flushPromises();
    expect(signal?.aborted).toBe(true);
  });

  it("is responsive and never calls the public Last.fm API from the browser", async () => {
    mountModal();
    await flushPromises();
    expect(bodyElement("[role='dialog']").classList.contains("max-w-4xl")).toBe(true);
    expect(bodyElement("main").classList.contains("overflow-y-auto")).toBe(true);
    const source = await import("node:fs").then(({ readFileSync }) =>
      readFileSync("src/modules/dashboard/widgets/artists/components/DashboardFavoriteArtistModal.vue", "utf8"),
    );
    expect(source).not.toContain("ws.audioscrobbler.com");
    expect(getRatesArtistSummary).toHaveBeenCalledOnce();
    expect(getRatesArtistLastfm).toHaveBeenCalledOnce();
  });
});
