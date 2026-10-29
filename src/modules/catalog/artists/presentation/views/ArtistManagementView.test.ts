// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authState,
  fillArtistImages,
  previewArtistImageFill,
  invalidateQueries,
  swalFire,
} = vi.hoisted(() => ({
  authState: { role: "superadmin", userId: "admin-id" },
  fillArtistImages: vi.fn(),
  previewArtistImageFill: vi.fn(),
  invalidateQueries: vi.fn(),
  swalFire: vi.fn(),
}));

vi.mock("@/modules/identity/auth", () => ({ useAuthStore: () => authState }));
vi.mock("@/modules/identity/shared", () => ({
  hasMinimumRole: (role: string, minimum: string) => role === minimum,
}));
vi.mock("../../api/artistImageFill", () => ({ fillArtistImages, previewArtistImageFill }));
vi.mock("@tanstack/vue-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));
vi.mock("sweetalert2", () => ({ default: { fire: swalFire } }));

import ArtistManagement from "./ArtistManagementView.vue";

const batch = (artistId: string, nextCursor: string | null, hasMore: boolean) => ({
  processed: 1,
  updated: 1,
  notFound: 0,
  ambiguous: 0,
  failed: 0,
  concurrentUpdates: 0,
  results: [{ artistId, outcome: "updated" as const }],
  nextCursor,
  hasMore,
});

function mountView() {
  return mount(ArtistManagement, {
    global: {
      stubs: { ArtistDirectory: true },
    },
  });
}

describe("ArtistManagement image fill action", () => {
  beforeEach(() => {
    authState.role = "superadmin";
    previewArtistImageFill.mockReset().mockResolvedValue({
      eligible: 2,
      batchSize: 1,
      estimatedBatches: 2,
      startCursor: "cursor-0",
    });
    fillArtistImages.mockReset();
    invalidateQueries.mockReset().mockResolvedValue(undefined);
    swalFire.mockReset().mockResolvedValue({ isConfirmed: true });
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  });

  it("previews once, asks one confirmation, drains batches and refreshes the directory", async () => {
    fillArtistImages
      .mockResolvedValueOnce(batch("artist-1", "cursor-1", true))
      .mockResolvedValueOnce(batch("artist-2", null, false));
    const wrapper = mountView();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(previewArtistImageFill).toHaveBeenCalledTimes(1);
    expect(swalFire).toHaveBeenCalledTimes(1);
    expect(swalFire.mock.calls[0][0].text).toContain("2 artistas pendientes");
    expect(swalFire.mock.calls[0][0].text).toContain("2 lotes");
    expect(fillArtistImages).toHaveBeenNthCalledWith(1, { cursor: "cursor-0", batchSize: 1 }, expect.any(AbortSignal));
    expect(fillArtistImages).toHaveBeenNthCalledWith(2, { cursor: "cursor-1", batchSize: 1 }, expect.any(AbortSignal));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["catalog", "artist-directory"] });
    expect(wrapper.text()).toContain("100 %");
    expect(wrapper.text()).toContain("2 fotografías añadidas");
    wrapper.unmount();
  });

  it("shows an informative empty preview without confirmation or POST", async () => {
    previewArtistImageFill.mockResolvedValueOnce({
      eligible: 0,
      batchSize: 10,
      estimatedBatches: 0,
      startCursor: null,
    });
    const wrapper = mountView();
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(previewArtistImageFill).toHaveBeenCalledTimes(1);
    expect(swalFire).toHaveBeenCalledTimes(1);
    expect(swalFire.mock.calls[0][0].title).toContain("No hay artistas");
    expect(fillArtistImages).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("keeps the action exclusive to superadmins", async () => {
    authState.role = "user";
    const wrapper = mountView();
    expect(wrapper.text()).not.toContain("Rellenar imágenes");
    expect(previewArtistImageFill).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
