// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { AxiosError } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, shallowRef } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/modules/identity/auth";
import type {
  RatesArtistLastfmResponseDto,
  RatesArtistSummaryDiscDto,
  RatesArtistSummaryResponseDto,
} from "@services/rates/rates";

const { getRatesArtistSummary, getRatesArtistLastfm } = vi.hoisted(() => ({
  getRatesArtistSummary: vi.fn(),
  getRatesArtistLastfm: vi.fn(),
}));
vi.mock("@services/rates/rates", async (importOriginal) => {
  const original = await importOriginal<typeof import("@services/rates/rates")>();
  return { ...original, getRatesArtistSummary, getRatesArtistLastfm };
});

import { useFavoriteArtistDetails } from "./useFavoriteArtistDetails";

const artistId = "00000000-0000-4000-8000-000000000023";

function disc(id: string, name = id): RatesArtistSummaryDiscDto {
  return {
    id,
    name,
    image: null,
    releaseDate: null,
    rate: 8,
    cover: null,
    rateId: `rate-${id}`,
    lastActivityAt: "2026-10-27T18:30:00.123456",
  };
}

function summary(
  data: RatesArtistSummaryDiscDto[] = [disc("disc-1")],
  page = 1,
  total = data.length,
  totalPages = 1
): RatesArtistSummaryResponseDto {
  return {
    artist: {
      id: artistId,
      name: "Artista de catálogo",
      image: null,
      country: null,
      genres: [],
    },
    stats: {
      ratedDiscCount: total,
      averageRate: total ? 8 : null,
      highestRatedDisc: null,
      lowestRatedDisc: null,
      firstAvailableActivityAt: null,
      lastAvailableActivityAt: null,
    },
    discs: { data, total, page, limit: 100, totalPages },
  };
}

function lastfmResponse(
  id = artistId,
  changes: Partial<RatesArtistLastfmResponseDto> = {}
): RatesArtistLastfmResponseDto {
  return {
    artistId: id,
    status: "available",
    biography: { summary: "Biografía", url: null },
    tags: [],
    similarArtists: [],
    listeners: null,
    playCount: null,
    lastfmUrl: null,
    ...changes,
  };
}

function setup() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore(pinia);
  auth.$patch({ authStatus: "authenticated", userId: "user-a" });
  const currentArtistId = shallowRef(artistId);
  const enabled = shallowRef(true);
  let details!: ReturnType<typeof useFavoriteArtistDetails>;
  const Host = defineComponent({
    setup() {
      details = useFavoriteArtistDetails(currentArtistId, enabled);
      return () => h("div");
    },
  });
  const wrapper = mount(Host, { global: { plugins: [pinia] } });
  return { wrapper, details, currentArtistId, enabled, auth };
}

describe("useFavoriteArtistDetails", () => {
  beforeEach(() => {
    getRatesArtistSummary.mockReset().mockResolvedValue(summary());
    getRatesArtistLastfm.mockReset().mockResolvedValue(lastfmResponse());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads both sources independently when enabled and exposes read-only source states", async () => {
    const { details } = setup();
    details.loadSummary();
    details.loadLastfm();
    await flushPromises();
    expect(getRatesArtistSummary).toHaveBeenCalledOnce();
    expect(getRatesArtistSummary.mock.calls[0]?.[1]).toEqual({ page: 1, limit: 100 });
    expect(getRatesArtistLastfm).toHaveBeenCalledOnce();
    expect(getRatesArtistSummary.mock.calls[0]?.[2]).toBeInstanceOf(AbortSignal);
    expect(getRatesArtistLastfm.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
    expect(details.detail.value?.artist.name).toBe("Artista de catálogo");
    expect(details.lastfmDetail.value?.biography?.summary).toBe("Biografía");
    expect(details.summaryLoading.value).toBe(false);
    expect(details.lastfmLoading.value).toBe(false);
  });

  it("keeps errors and retries isolated between summary and Last.fm", async () => {
    getRatesArtistSummary
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(summary());
    getRatesArtistLastfm
      .mockResolvedValueOnce(lastfmResponse(artistId, { status: "unavailable" }))
      .mockResolvedValueOnce(lastfmResponse());
    const { details } = setup();
    await flushPromises();
    expect(details.summaryError.value).toBe(true);
    expect(details.lastfmDetail.value?.status).toBe("unavailable");
    details.retrySummary();
    await flushPromises();
    expect(getRatesArtistSummary).toHaveBeenCalledTimes(2);
    expect(getRatesArtistLastfm).toHaveBeenCalledOnce();
    expect(details.summaryError.value).toBe(false);
    details.retryLastfm();
    await flushPromises();
    expect(getRatesArtistSummary).toHaveBeenCalledTimes(2);
    expect(getRatesArtistLastfm).toHaveBeenCalledTimes(2);
    expect(details.lastfmDetail.value?.status).toBe("available");
  });

  it("preserves a zero-ratings response and Last.fm not-found availability", async () => {
    getRatesArtistSummary.mockResolvedValueOnce(summary([], 1, 0, 0));
    getRatesArtistLastfm.mockResolvedValueOnce(lastfmResponse(artistId, { status: "not_found" }));
    const { details } = setup();
    await flushPromises();
    expect(details.summaryError.value).toBe(false);
    expect(details.summaryNotFound.value).toBe(false);
    expect(details.detail.value?.stats.ratedDiscCount).toBe(0);
    expect(details.discs.value).toEqual([]);
    expect(details.lastfmDetail.value?.status).toBe("not_found");
    expect(details.lastfmError.value).toBe(false);
  });

  it("distinguishes a summary 404 from an empty artist", async () => {
    const notFound = new AxiosError("missing", "404", undefined, undefined, {
      status: 404,
      statusText: "Not Found",
      headers: {},
      config: { headers: {} },
      data: {},
    });
    getRatesArtistSummary.mockRejectedValueOnce(notFound);
    const { details } = setup();
    await flushPromises();
    expect(details.summaryNotFound.value).toBe(true);
    expect(details.summaryError.value).toBe(false);
    expect(details.detail.value).toBeNull();
  });

  it("aborts old artist requests and ignores late responses from both sources", async () => {
    let oldSummarySignal: AbortSignal | undefined;
    let oldLastfmSignal: AbortSignal | undefined;
    let resolveOldSummary: ((value: RatesArtistSummaryResponseDto) => void) | undefined;
    let resolveOldLastfm: ((value: RatesArtistLastfmResponseDto) => void) | undefined;
    getRatesArtistSummary
      .mockImplementationOnce((_id: string, _params: unknown, signal: AbortSignal) => {
        oldSummarySignal = signal;
        return new Promise((resolve) => {
          resolveOldSummary = resolve;
        });
      })
      .mockResolvedValueOnce(summary([disc("new-disc")]));
    getRatesArtistLastfm
      .mockImplementationOnce((_id: string, signal: AbortSignal) => {
        oldLastfmSignal = signal;
        return new Promise((resolve) => {
          resolveOldLastfm = resolve;
        });
      })
      .mockImplementationOnce(async (id: string) =>
        lastfmResponse(id, { biography: { summary: "Nueva", url: null } })
      );
    const { details, currentArtistId } = setup();
    await flushPromises();
    currentArtistId.value = "00000000-0000-4000-8000-000000000024";
    await flushPromises();
    resolveOldSummary?.(summary([disc("old-disc")]));
    resolveOldLastfm?.(lastfmResponse(artistId, { biography: { summary: "Obsoleta", url: null } }));
    await flushPromises();
    expect(oldSummarySignal?.aborted).toBe(true);
    expect(oldLastfmSignal?.aborted).toBe(true);
    expect(details.discs.value.map(({ id }) => id)).toEqual(["new-disc"]);
    expect(details.lastfmDetail.value?.biography?.summary).toBe("Nueva");
  });

  it("clears and reloads private details when the session generation changes", async () => {
    let oldSignal: AbortSignal | undefined;
    getRatesArtistSummary
      .mockImplementationOnce((_id: string, _params: unknown, signal: AbortSignal) => {
        oldSignal = signal;
        return new Promise(() => undefined);
      })
      .mockResolvedValueOnce(summary([disc("user-b-disc")]));
    const { details, auth } = setup();
    await flushPromises();
    auth.$patch({ userId: "user-b", authSessionGeneration: auth.authSessionGeneration + 1 });
    await flushPromises();
    expect(oldSignal?.aborted).toBe(true);
    expect(getRatesArtistSummary).toHaveBeenCalledTimes(2);
    expect(getRatesArtistLastfm).toHaveBeenCalledTimes(2);
    expect(details.discs.value.map(({ id }) => id)).toEqual(["user-b-disc"]);
  });

  it("invalidates requests when the modal closes and can load again when reopened", async () => {
    let summarySignal: AbortSignal | undefined;
    let lastfmSignal: AbortSignal | undefined;
    getRatesArtistSummary
      .mockImplementationOnce((_id: string, _params: unknown, signal: AbortSignal) => {
        summarySignal = signal;
        return new Promise(() => undefined);
      })
      .mockResolvedValueOnce(summary());
    getRatesArtistLastfm
      .mockImplementationOnce((_id: string, signal: AbortSignal) => {
        lastfmSignal = signal;
        return new Promise(() => undefined);
      })
      .mockResolvedValueOnce(lastfmResponse());
    const { details, enabled } = setup();
    await flushPromises();
    enabled.value = false;
    await flushPromises();
    expect(summarySignal?.aborted).toBe(true);
    expect(lastfmSignal?.aborted).toBe(true);
    expect(details.detail.value).toBeNull();
    expect(details.lastfmDetail.value).toBeNull();
    enabled.value = true;
    await flushPromises();
    expect(getRatesArtistSummary).toHaveBeenCalledTimes(2);
    expect(getRatesArtistLastfm).toHaveBeenCalledTimes(2);
  });

  it("cancels requests on unmount", async () => {
    let summarySignal: AbortSignal | undefined;
    let lastfmSignal: AbortSignal | undefined;
    getRatesArtistSummary.mockImplementationOnce(
      (_id: string, _params: unknown, signal: AbortSignal) => {
        summarySignal = signal;
        return new Promise(() => undefined);
      }
    );
    getRatesArtistLastfm.mockImplementationOnce((_id: string, signal: AbortSignal) => {
      lastfmSignal = signal;
      return new Promise(() => undefined);
    });
    const { wrapper } = setup();
    await flushPromises();
    wrapper.unmount();
    expect(summarySignal?.aborted).toBe(true);
    expect(lastfmSignal?.aborted).toBe(true);
  });

  it("loads exceptional pages in order and deduplicates discs already received", async () => {
    getRatesArtistSummary
      .mockResolvedValueOnce(summary([disc("a"), disc("b")], 1, 3, 2))
      .mockResolvedValueOnce(summary([disc("b"), disc("c")], 2, 3, 2));
    const { details } = setup();
    await flushPromises();
    expect(details.hasMoreDiscs.value).toBe(true);
    await details.loadMoreDiscs();
    expect(getRatesArtistSummary.mock.calls[1]?.[1]).toEqual({ page: 2, limit: 100 });
    expect(details.discs.value.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    expect(details.hasMoreDiscs.value).toBe(false);
  });

  it("does not duplicate initial or load-more requests while one is pending", async () => {
    let resolveSummary: ((value: RatesArtistSummaryResponseDto) => void) | undefined;
    getRatesArtistSummary
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSummary = resolve;
          })
      )
      .mockImplementationOnce(() => new Promise(() => undefined));
    const { details } = setup();
    await flushPromises();
    details.loadSummary();
    expect(getRatesArtistSummary).toHaveBeenCalledOnce();
    resolveSummary?.(summary([disc("a"), disc("b")], 1, 3, 2));
    await flushPromises();
    void details.loadMoreDiscs();
    void details.loadMoreDiscs();
    await flushPromises();
    expect(getRatesArtistSummary).toHaveBeenCalledTimes(2);
  });

  it("keeps Catalog disc data attached to the Last.fm response", async () => {
    const catalogDisc = {
      id: "00000000-0000-4000-8000-000000000101",
      name: "Disco de Catalog",
      image: "https://images.example/cover.jpg",
      releaseYear: 2024,
      releaseDate: "2024-01-01",
      link: "https://open.spotify.com/album/abc123",
      ep: false,
      debut: false,
      genre: { name: "Rock", color: "#123456" },
      averageRate: 8.5,
      averageCover: 7,
      voteCount: 5,
      commentCount: 2,
      userRate: { id: "rate-1", rate: 9, cover: null },
      favoriteId: "favorite-1",
      pendingId: null,
    };
    const similarArtist = {
      name: "Relacionado",
      url: null,
      catalogArtistId: "00000000-0000-4000-8000-000000000102",
      catalogDiscCount: 1,
      catalogDiscs: [catalogDisc],
    };
    getRatesArtistLastfm.mockResolvedValueOnce(
      lastfmResponse(artistId, { similarArtists: [similarArtist] })
    );
    const { details } = setup();
    await flushPromises();
    expect(details.lastfmDetail.value?.similarArtists[0]).toEqual(similarArtist);
    expect(details.lastfmDetail.value?.similarArtists[0]?.catalogDiscs[0]).toEqual(catalogDisc);
  });
});
