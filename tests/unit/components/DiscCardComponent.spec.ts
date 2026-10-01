// @vitest-environment happy-dom
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMostPopularTrackId } = vi.hoisted(() => ({ fetchMostPopularTrackId: vi.fn() }));
vi.mock("@/app/dependencies/mostPopularTrack", () => ({ fetchMostPopularTrackId }));
vi.mock("@stores/auth/auth", () => ({ readLegacyRolesRaw: () => null }));
vi.mock("@/app/dependencies/identity", () => ({ useAuthStore: () => ({ loggedUser: { id: "user-1" } }) }));
vi.mock("@/app/bridges/communityRatings", () => ({
  loadCommunityVotes: vi.fn(), saveCommunityRating: vi.fn(), seedCommunityRating: vi.fn(),
  useCommunityRatingState: () => ({
    state: ref({ ratingId: null, rate: null, cover: null, averageRate: null, averageCover: null, voteCount: null, summaryLoaded: false }),
    votes: ref([]), isSubmitting: ref(false),
  }),
}));
vi.mock("@/app/bridges/communityFavorites", () => ({
  seedCommunityFavorite: vi.fn(), toggleCommunityFavorite: vi.fn(),
  useCommunityFavoriteState: () => ({ state: ref({ loaded: false, favoriteId: null }), isSubmitting: ref(false) }),
}));
vi.mock("@/app/bridges/communityPendings", () => ({
  seedCommunityPending: vi.fn(), toggleCommunityPending: vi.fn(),
  useCommunityPendingState: () => ({ state: ref({ loaded: false, pendingId: null }), isSubmitting: ref(false) }),
}));
vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));
vi.mock("@services/swal/SwalService", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import DiscCardComponent from "@components/DiscCardComponent.vue";

describe("DiscCardComponent popular track player", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMostPopularTrackId.mockResolvedValue(null);
  });

  it("keeps the album player fallback when no popular track is returned", async () => {
    const wrapper = mount(DiscCardComponent, {
      props: {
        id: "disc-1", image: "/cover.jpg", name: "Album", releaseDate: "2026-01-01",
        artistName: "Artist", isNew: false, link: "https://open.spotify.com/album/album123",
      },
      global: { stubs: { transition: false, CircleFlags: true, "font-awesome-icon": true } },
    });

    (wrapper.vm as unknown as { showPlayer: boolean }).showPlayer = true;
    await flushPromises();

    expect(fetchMostPopularTrackId).toHaveBeenCalledWith("album123");
    expect(wrapper.get("iframe").attributes("src"))
      .toBe("https://open.spotify.com/embed/album/album123?utm_source=generator&theme=1");
  });
});
