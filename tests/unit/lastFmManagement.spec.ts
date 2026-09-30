// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { ArtistManagementItem } from "../../src/modules/catalog/domain/artistManagement";
import type { LastFmManagementDependencies } from "../../src/modules/catalog/application/artistExternalProfile";
import { useLastFmManagement } from "../../src/modules/catalog/presentation/composables/useLastFmManagement";
import LastFmManagementModal from "../../src/modules/catalog/presentation/LastFmManagementModal.vue";
import router from "../../src/app/router";

const disc = {
  id: "disc-1", name: "First album", releaseDate: "2026-09-30", ep: false, debut: true,
  image: null, link: null, genre: null, rateCount: 2, averageRate: 8,
};

const artist = (overrides: Partial<ArtistManagementItem> = {}): ArtistManagementItem => ({
  id: "artist-1", name: "Main Artist", description: null, image: null, country: null,
  discs: [disc], nationalReleases: [], spotifyPlaylists: [], ...overrides,
});

function setup(dependencies: LastFmManagementDependencies, onError = vi.fn()) {
  let controller!: ReturnType<typeof useLastFmManagement>;
  const component = defineComponent({
    setup: () => {
      controller = useLastFmManagement(dependencies, onError);
      return controller;
    },
    template: "<div />",
  });
  return { wrapper: mount(component), controller, onError };
}

function dependencies(overrides: Partial<LastFmManagementDependencies> = {}): LastFmManagementDependencies {
  return {
    loadProfile: vi.fn().mockResolvedValue({ bio: { content: "Biography" } }),
    searchCatalogArtists: vi.fn().mockResolvedValue([]),
    findFallbackImage: vi.fn().mockResolvedValue("fallback.jpg"),
    ...overrides,
  };
}

describe("Catalog Last.fm management modal", () => {
  it("caches a profile across modal reopenings while retaining image fallback", async () => {
    const deps = dependencies();
    const { controller } = setup(deps);

    await controller.open(artist());
    await flushPromises();
    controller.close();
    await controller.open(artist());
    await flushPromises();

    expect(deps.loadProfile).toHaveBeenCalledOnce();
    expect(controller.profile.value).toEqual({ bio: { content: "Biography" } });
    expect(controller.artistImage.value).toBe("fallback.jpg");
  });

  it("navigates to a similar artist and prefers the exact Catalog match", async () => {
    const exact = artist({ id: "exact", name: "Similar", image: "database.jpg" });
    const deps = dependencies({
      searchCatalogArtists: vi.fn().mockResolvedValue([
        artist({ id: "other", name: "Similar tribute" }), exact,
      ]),
    });
    const { controller } = setup(deps);

    await controller.navigateToSimilar("similar");

    expect(controller.catalogArtist.value).toBe(exact);
    expect(controller.artistImage.value).toBe("database.jpg");
    expect(deps.findFallbackImage).not.toHaveBeenCalled();
  });

  it("keeps Last.fm data when Catalog has no artist or its search fails", async () => {
    const deps = dependencies({ searchCatalogArtists: vi.fn().mockRejectedValue(new Error("catalog down")) });
    const { controller } = setup(deps);

    await controller.navigateToSimilar("Missing Artist");
    await flushPromises();

    expect(controller.profile.value).toEqual({ bio: { content: "Biography" } });
    expect(controller.catalogArtist.value).toBeNull();
    expect(controller.artistImage.value).toBe("fallback.jpg");
  });

  it("shows the existing provider error without discarding a partial image failure", async () => {
    const imageFailure = dependencies({ findFallbackImage: vi.fn().mockRejectedValue(new Error("spotify down")) });
    const imageSetup = setup(imageFailure);
    await imageSetup.controller.open(artist());
    await flushPromises();
    expect(imageSetup.controller.profile.value).toEqual({ bio: { content: "Biography" } });
    expect(imageSetup.onError).not.toHaveBeenCalled();

    const providerFailure = dependencies({ loadProfile: vi.fn().mockRejectedValue(new Error("lastfm down")) });
    const providerSetup = setup(providerFailure);
    await providerSetup.controller.navigateToSimilar("Unavailable");
    expect(providerSetup.controller.profile.value).toBeNull();
    expect(providerSetup.onError).toHaveBeenCalledOnce();
  });

  it("emits similar navigation and disc opening through typed UI contracts", async () => {
    const wrapper = mount(LastFmManagementModal, {
      props: {
        show: true,
        artistName: "Main Artist",
        artistImage: null,
        profile: { similar: { artist: [{ name: "Similar" }] } },
        catalogArtist: artist(),
      },
      global: { stubs: { Teleport: true } },
    });

    await wrapper.get("button.px-2\\.5").trigger("click");
    await wrapper.get("div.cursor-pointer").trigger("click");

    expect(wrapper.emitted("navigateSimilar")).toEqual([["Similar"]]);
    expect(wrapper.emitted("openDisc")).toEqual([[disc]]);
  });

  it("keeps the ArtistManagement route authenticated with no new role restriction", () => {
    expect(router.getRoutes().find((route) => route.name === "ArtistManagement")?.meta)
      .toEqual({ requiresAuth: true });
  });
});
