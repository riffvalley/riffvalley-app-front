// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { computed, defineComponent, h, nextTick, shallowRef, type PropType } from "vue";
import { discCardDialogKey } from "@/composables/discCardDialog";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtistDetailsDto } from "../../types/artistApi";
import type { RatesArtistLastfmResponseDto, RatesArtistSummaryResponseDto } from "@services/rates/rates";

vi.mock("../../application/useArtistDetails", () => ({ useArtistDetails: vi.fn() }));
vi.mock("../../application/useArtistDetailInsights", () => ({ useArtistDetailInsights: vi.fn() }));
import { useArtistDetails } from "../../application/useArtistDetails";
import { useArtistDetailInsights } from "../../application/useArtistDetailInsights";
import ArtistDetailsModal from "./ArtistDetailsModal.vue";

const artistId = "00000000-0000-4000-8000-000000000001";
const relatedId = "00000000-0000-4000-8000-000000000002";
const catalog: ArtistDetailsDto = {
  id: artistId, name: "Catalog artist", image: null, description: "Catalog biography", country: { id: "es", name: "España" }, genres: [{ id: "rock", name: "Rock" }],
  discs: [{ id: "d1", name: "Disco uno", image: null, releaseDate: "2024-01-01", genre: { id: "rock", name: "Rock", color: null }, rateCount: 4, averageRate: 6.4375 }, { id: "d2", name: "Disco dos", image: null, releaseDate: null, genre: null, rateCount: 0, averageRate: null }],
};
const lastfm: RatesArtistLastfmResponseDto = { artistId, status: "available", biography: { summary: "Last.fm bio", url: null }, tags: [], similarArtists: [{ name: "Related", url: null, catalogArtistId: relatedId, catalogDiscCount: 0, catalogDiscs: [] }], listeners: 100, playCount: 300, lastfmUrl: null };

const DiscDetailStub = defineComponent({
  props: { disc: { type: Object as PropType<{ id: string; name: string; image: string | null; artist: { name: string } }>, required: true } },
  emits: ["close"],
  setup(props, { emit }) { return () => h("div", { "data-test": "disc-detail", "data-id": props.disc.id }, h("button", { onClick: () => emit("close") }, "Close disc")); },
});

function mockComposableData(options: { favorite?: boolean; summary?: RatesArtistSummaryResponseDto | null; lastfmResponse?: RatesArtistLastfmResponseDto } = {}) {
  vi.mocked(useArtistDetails).mockReturnValue({ detail: shallowRef(catalog), loading: shallowRef(false), error: shallowRef(false), notFound: shallowRef(false), load: vi.fn(), clear: vi.fn() } as never);
  vi.mocked(useArtistDetailInsights).mockReturnValue({
    detail: shallowRef(options.summary ?? null), lastfmDetail: shallowRef(options.lastfmResponse ?? lastfm), summaryLoading: shallowRef(false), summaryError: shallowRef(false), summaryNotFound: shallowRef(false), lastfmLoading: shallowRef(false), lastfmError: shallowRef(false), moreLoading: shallowRef(false), moreError: shallowRef(false), hasMoreDiscs: shallowRef(false), retrySummary: vi.fn(), retryLastfm: vi.fn(), loadMoreDiscs: vi.fn(), retryMoreDiscs: vi.fn(),
  } as never);
}

const wrappers: Array<{ unmount: () => void }> = [];
function mountModal(favoriteArtist: { id: string; name: string; image: string | null; ratingCount: number; averageRate: number } | null = null, provide: Record<symbol, unknown> = {}) {
  const wrapper = mount(ArtistDetailsModal, { props: { artistId, favoriteArtist }, attachTo: document.body, global: { plugins: [createPinia()], stubs: { DiscDetail: DiscDetailStub }, provide } });
  wrappers.push(wrapper);
  return wrapper;
}
function bodyText(): string { return document.body.textContent ?? ""; }
function bodyGet(selector: string): HTMLElement {
  const element = document.body.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}

beforeEach(() => { document.body.innerHTML = "<button id='opener'>Open</button>"; document.querySelector<HTMLButtonElement>("#opener")!.focus(); });
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); vi.clearAllMocks(); });

describe("ArtistDetailsModal", () => {
  it("shows Catalog identity and the complete Catalog discography without requiring personal Rates", () => {
    mockComposableData();
    mountModal();
    expect(bodyGet("[data-test=artist-catalog-header]").textContent).toContain("Catalog artist");
    expect(bodyText()).toContain("Discos en la app");
    expect(document.body.querySelectorAll("[data-test=artist-catalog-disc]")).toHaveLength(2);
    expect(bodyText()).toContain("4votos");
    expect(bodyText()).toContain("media6,44");
    expect(bodyGet("[data-test=artist-disc-community-stats]").classList.contains("ml-auto")).toBe(true);
    expect(bodyGet("[data-test=artist-disc-community-stats]").querySelector(".text-amber-900")).not.toBeNull();
    expect(document.body.querySelector("[data-test=artist-personal-summary]")).toBeNull();
  });

  it("renders genre pills using the color included in Catalog disc details", () => {
    const detailWithDiscGenreColor: ArtistDetailsDto = {
      ...catalog,
      genres: undefined,
      discs: [{
        ...catalog.discs[0]!,
        genre: { id: "post-hardcore", name: "Post-hardcore", color: "PaleVioletRed" },
      }],
    };
    mockComposableData();
    vi.mocked(useArtistDetails).mockReturnValue({
      detail: shallowRef(detailWithDiscGenreColor), loading: shallowRef(false), error: shallowRef(false), notFound: shallowRef(false), load: vi.fn(), clear: vi.fn(),
    } as never);
    mountModal();

    const pill = bodyGet('[data-test="artist-genre-pill"]');
    expect(pill.textContent).toBe("Post-hardcore");
    const background = pill.getAttribute("style")?.match(/#([\da-f]{6})/i)?.[1];
    expect(background).toBeDefined();
    const [red, green, blue] = [0, 2, 4].map((offset) => Number.parseInt(background!.slice(offset, offset + 2), 16));
    expect(red).toBeGreaterThan(green);
    expect(blue).toBeGreaterThan(green);
  });

  it("offers ID based related navigation, keeps the Catalog biography if Last.fm is absent, opens DiscDetail and restores focus", async () => {
    mockComposableData();
    const wrapper = mountModal();
    expect(bodyText()).toContain("Last.fm bio");
    expect(bodyGet("[data-test=related-artists] ul").classList.contains("flex")).toBe(true);
    expect(bodyText()).not.toContain("disco en Riff Valley");
    bodyGet("[data-test=artist-catalog-disc] button").click();
    await nextTick();
    expect(bodyGet("[data-test=disc-detail]").getAttribute("data-id")).toBe("d1");
    bodyGet("[data-test=disc-detail] button").click();
    await nextTick();
    expect(document.body.querySelector("[data-test=disc-detail]")).toBeNull();
    bodyGet("[data-test=related-artists] li button").click();
    await nextTick();
    expect(wrapper.emitted("open-related-artist")?.[0]).toEqual([relatedId]);
    bodyGet("[aria-label='Cerrar ficha del artista']").click();
    wrapper.unmount();
    await Promise.resolve();
    expect(document.activeElement?.id).toBe("opener");
  });

  it("shows Rates when supplied, but keeps Catalog content independent", () => {
    mockComposableData({ favorite: true, summary: null });
    mountModal({ id: artistId, name: "Favorite", image: null, ratingCount: 1, averageRate: 8 });
    expect(document.body.querySelector("[data-test=artist-personal-summary]")).not.toBeNull();
    expect(document.body.querySelectorAll("[data-test=artist-catalog-disc]")).toHaveLength(2);
  });

  it("shows the personal history for any artist once the user has rated one of its discs", () => {
    const ratedSummary = {
      artist: { id: artistId, name: "Catalog artist", image: null, country: null, genres: [] },
      stats: { ratedDiscCount: 1, averageRate: 7, highestRatedDisc: null, lowestRatedDisc: null, firstAvailableActivityAt: null, lastAvailableActivityAt: null },
      discs: { data: [], total: 1, page: 1, limit: 100, totalPages: 1 },
    } as RatesArtistSummaryResponseDto;
    mockComposableData({ summary: ratedSummary });
    mountModal();
    expect(vi.mocked(useArtistDetailInsights).mock.calls[0]![2].value).toBe(true);
    expect(bodyGet("[data-test=artist-personal-summary]").textContent).toContain("Tu historia con Catalog artist");
    expect(document.body.querySelector("[data-test=artist-rated-discs]")).not.toBeNull();
  });

  it("hides the personal history outside the Dashboard when the user has not rated the artist", () => {
    const emptySummary = {
      artist: { id: artistId, name: "Catalog artist", image: null, country: null, genres: [] },
      stats: { ratedDiscCount: 0, averageRate: null, highestRatedDisc: null, lowestRatedDisc: null, firstAvailableActivityAt: null, lastAvailableActivityAt: null },
      discs: { data: [], total: 0, page: 1, limit: 100, totalPages: 0 },
    } as RatesArtistSummaryResponseDto;
    mockComposableData({ summary: emptySummary });
    mountModal();
    expect(document.body.querySelector("[data-test=artist-personal-summary]")).toBeNull();
    expect(document.body.querySelector("[data-test=artist-rated-discs]")).toBeNull();
  });

  it("keeps Catalog description and related names when Last.fm has no match or no reliable ID", () => {
    mockComposableData({ lastfmResponse: { ...lastfm, status: "not_found", biography: null, similarArtists: [{ ...lastfm.similarArtists[0]!, catalogArtistId: null, url: "https://www.last.fm/music/Related" }] } });
    mountModal();
    expect(bodyGet("[data-test=artist-catalog-description]").textContent).toBe("Catalog biography");
    expect(bodyText()).toContain("No encontramos información de este artista en Last.fm.");
    expect(bodyGet("[data-test=related-artists] a").getAttribute("href")).toBe("https://www.last.fm/music/Related");
  });

  it("closes on Escape and restores focus to its opener", async () => {
    mockComposableData();
    const wrapper = mountModal();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await nextTick();
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
    await nextTick();
    expect(document.activeElement?.id).toBe("opener");
  });

  it("closes when clicking the backdrop but not when clicking inside the dialog", async () => {
    mockComposableData();
    const wrapper = mountModal();
    bodyGet('[data-test="artist-details-dialog"]').click();
    await nextTick();
    expect(wrapper.emitted("close")).toBeUndefined();
    bodyGet('[data-test="artist-details-overlay"]').click();
    await nextTick();
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("opens the votable disc card from both disc lists, labelled by whether the disc is rated", async () => {
    const ratedSummary = {
      artist: { id: artistId, name: "Catalog artist", image: null, country: null, genres: [] },
      stats: { ratedDiscCount: 1, averageRate: 7, highestRatedDisc: null, lowestRatedDisc: null, firstAvailableActivityAt: null, lastAvailableActivityAt: null },
      discs: { data: [{ id: "d1", name: "Disco uno", image: null, releaseDate: "2024-01-01", rate: 7, cover: 8 }], total: 1, page: 1, limit: 100, totalPages: 1 },
    } as unknown as RatesArtistSummaryResponseDto;
    mockComposableData({ summary: ratedSummary });
    const openedDisc = shallowRef<string | null>(null);
    let onClose: ((changed: boolean) => void) | undefined;
    const opener = {
      isOpen: computed(() => openedDisc.value !== null),
      open: vi.fn((discId: string, options?: { onClose?: (changed: boolean) => void }) => { openedDisc.value = discId; onClose = options?.onClose; }),
    };
    const wrapper = mountModal(null, { [discCardDialogKey as symbol]: opener });
    const insights = vi.mocked(useArtistDetailInsights).mock.results[0]!.value as { retrySummary: ReturnType<typeof vi.fn> };
    const voteButtons = [...document.body.querySelectorAll<HTMLButtonElement>("[data-test=artist-disc-vote]")];
    expect(voteButtons.map((button) => button.textContent?.trim())).toEqual(["Editar nota", "Votar disco"]);
    expect(voteButtons[1]!.getAttribute("aria-label")).toBe("Votar Disco dos");
    expect(bodyGet("[data-test=artist-rated-disc-edit]").textContent?.trim()).toBe("Editar nota");

    voteButtons[1]!.click();
    expect(opener.open).toHaveBeenLastCalledWith("d2", expect.any(Object));
    // Con la ficha abierta, Escape le corresponde a ella: el modal del artista sigue abierto.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await nextTick();
    expect(wrapper.emitted("close")).toBeUndefined();
    openedDisc.value = null;
    onClose?.(false);
    expect(insights.retrySummary).not.toHaveBeenCalled();

    bodyGet("[data-test=artist-rated-disc-edit]").click();
    expect(opener.open).toHaveBeenLastCalledWith("d1", expect.any(Object));
    openedDisc.value = null;
    onClose?.(true);
    expect(insights.retrySummary).toHaveBeenCalledTimes(1);
  });

  it("hides the disc card actions when no disc card host is provided", () => {
    mockComposableData();
    mountModal();
    expect(document.body.querySelector("[data-test=artist-disc-vote]")).toBeNull();
  });
});
