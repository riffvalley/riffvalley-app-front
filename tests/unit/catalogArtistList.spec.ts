// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { listArtists, ARTISTS_PAGE_SIZE } from "../../src/modules/catalog/application/listArtists";
import type { ArtistManagementPort } from "../../src/modules/catalog/application/artistManagementPort";
import type { ArtistManagementResponse } from "../../src/modules/catalog/domain/artistManagement";
import { useArtistManagementList } from "../../src/modules/catalog/presentation/composables/useArtistManagementList";

const result = (page = 1, data: ArtistManagementResponse["data"] = []): ArtistManagementResponse => ({
  totalItems: data.length, totalPages: 3, currentPage: page, limit: 30,
  orphanCount: 0, data,
});

function setup(port: ArtistManagementPort, onError = vi.fn()) {
  const component = defineComponent({ setup: () => useArtistManagementList(port, onError), template: "<div />" });
  return { wrapper: mount(component), onError };
}

afterEach(() => { vi.useRealTimers(); });

describe("Catalog artist listing", () => {
  it("keeps the management endpoint parameters and fixes the page size at 30", async () => {
    const response = result(2);
    const getArtistsManagement = vi.fn().mockResolvedValue(response);
    const params = { offset: 30, query: "band", genreId: "rock", countryId: "es", needsReview: true };

    await expect(listArtists({ getArtistsManagement }, params)).resolves.toBe(response);

    expect(getArtistsManagement).toHaveBeenCalledWith({ ...params, limit: ARTISTS_PAGE_SIZE });
  });

  it("keeps loading active until the page request settles", async () => {
    let resolve!: (value: ArtistManagementResponse) => void;
    const pending = new Promise<ArtistManagementResponse>((done) => { resolve = done; });
    const { wrapper } = setup({ getArtistsManagement: vi.fn().mockReturnValue(pending) });
    const vm = wrapper.vm as unknown as { fetchArtists: () => Promise<void>; loading: boolean };
    const request = vm.fetchArtists();
    expect(vm.loading).toBe(true);
    resolve(result());
    await request;
    expect(vm.loading).toBe(false);
    wrapper.unmount();
  });

  it("filters, resets to the first page, paginates by 30, and preserves needsReview", async () => {
    const getArtistsManagement = vi.fn().mockResolvedValue(result(1));
    const { wrapper } = setup({ getArtistsManagement });
    const vm = wrapper.vm as unknown as {
      fetchArtists: (page?: number) => Promise<void>;
      selectedGenreId: string;
      selectedCountryId: string;
      needsReview: boolean | null;
      goToPage: (page: number) => void;
    };
    await vm.fetchArtists(2);
    vm.selectedGenreId = "rock";
    vm.selectedCountryId = "es";
    vm.needsReview = true;
    await nextTick();
    await Promise.resolve();

    expect(getArtistsManagement).toHaveBeenLastCalledWith({
      offset: 0, genreId: "rock", countryId: "es", needsReview: true, limit: 30,
    });
    vm.goToPage(3);
    await Promise.resolve();
    expect(getArtistsManagement).toHaveBeenLastCalledWith({
      offset: 60, genreId: "rock", countryId: "es", needsReview: true, limit: 30,
    });
    wrapper.unmount();
  });

  it("debounces search by 400 ms and shows an empty response as an empty list", async () => {
    vi.useFakeTimers();
    const getArtistsManagement = vi.fn().mockResolvedValue(result());
    const { wrapper } = setup({ getArtistsManagement });
    const vm = wrapper.vm as unknown as { query: string; onQueryInput: () => void; artists: unknown[] };
    vm.query = "one";
    vm.onQueryInput();
    await vi.advanceTimersByTimeAsync(300);
    vm.query = "two";
    vm.onQueryInput();
    await vi.advanceTimersByTimeAsync(399);
    expect(getArtistsManagement).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(getArtistsManagement).toHaveBeenCalledTimes(1);
    expect(getArtistsManagement).toHaveBeenCalledWith({ query: "two", offset: 0, limit: 30 });
    expect(vm.artists).toEqual([]);
    wrapper.unmount();
  });

  it("keeps an error visible through the supplied legacy handler", async () => {
    const error = new Error("network");
    const onError = vi.fn();
    const getArtistsManagement = vi.fn().mockRejectedValue(error);
    const { wrapper } = setup({ getArtistsManagement }, onError);
    const vm = wrapper.vm as unknown as { fetchArtists: () => Promise<void> };
    await vm.fetchArtists();
    expect(onError).toHaveBeenCalledWith(error);
    wrapper.unmount();
  });
});
