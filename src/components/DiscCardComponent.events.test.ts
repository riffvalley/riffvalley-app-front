// @vitest-environment happy-dom
import { flushPromises, shallowMount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDiscRates, postRateService, updateRateService, success, successImage, fire, mutateSummary } = vi.hoisted(
  () => ({
    getDiscRates: vi.fn(),
    postRateService: vi.fn(),
    updateRateService: vi.fn(),
    success: vi.fn(),
    successImage: vi.fn(),
    fire: vi.fn(),
    mutateSummary: vi.fn(),
  }),
);

vi.mock("@services/rates/rates.ts", () => ({ getDiscRates, postRateService, updateRateService }));
vi.mock("@services/favorites/favorites.ts", () => ({
  postFavoriteService: vi.fn(),
  deleteFavoriteService: vi.fn(),
}));
vi.mock("@services/pendings/pendings", () => ({
  postPendingService: vi.fn(),
  deletePendingService: vi.fn(),
}));
vi.mock("@helpers/SpotifyFunctions", () => ({ obtenerTrackMasPopularAlbum: vi.fn() }));
vi.mock("@services/swal/SwalService", () => ({ default: { success, successImage } }));
vi.mock("sweetalert2", () => ({ default: { fire } }));
vi.mock("@/app/dashboardSummary", () => ({ mutateAndInvalidateDashboardSummary: mutateSummary }));

import DiscCard from "./DiscCardComponent.vue";

const baseProps = {
  id: "disc-1",
  image: "https://images.test/cover.jpg",
  name: "Disco de prueba",
  releaseDate: "2020-01-01",
  artistName: "Artista",
  isNew: true,
};

function mountCard(props: Record<string, unknown> = {}) {
  setActivePinia(createPinia());
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  mutateSummary.mockImplementation((_client: QueryClient, operation: () => Promise<unknown>) => operation());
  const wrapper = shallowMount(DiscCard, {
    props: { ...baseProps, ...props },
    global: {
      plugins: [createPinia(), [VueQueryPlugin, { queryClient }]],
      stubs: { CircleFlags: true, "font-awesome-icon": true },
    },
  });
  return { queryClient, wrapper };
}

async function submit(wrapper: ReturnType<typeof mountCard>["wrapper"], rate: string, cover?: string) {
  const inputs = wrapper.findAll('input[type="number"]');
  await inputs[0].setValue(rate);
  if (cover !== undefined) await inputs[1].setValue(cover);
  const submitButton = wrapper.findAll("button").find((button) => /Votar|Editar/.test(button.text()));
  if (!submitButton) throw new Error("No se encontró el botón de valoración");
  await submitButton.trigger("click");
  await flushPromises();
}

describe("DiscCard rating-saved event", () => {
  beforeEach(() => {
    getDiscRates.mockReset().mockResolvedValue([]);
    postRateService.mockReset().mockResolvedValue({ id: "rate-new" });
    updateRateService.mockReset().mockResolvedValue({ data: undefined });
    success.mockReset();
    successImage.mockReset();
    fire.mockReset();
    mutateSummary.mockReset();
  });

  it("emits only after creating a musical rating succeeds", async () => {
    const { queryClient, wrapper } = mountCard();
    await submit(wrapper, "8");

    expect(wrapper.emitted("rating-saved")?.[0]?.[0]).toEqual({
      discId: "disc-1",
      action: "created",
      musicalRateChanged: true,
      hasMusicalRate: true,
      coverChanged: false,
    });
    wrapper.unmount();
    queryClient.clear();
  });

  it("distinguishes changing a musical rating from changing only the cover", async () => {
    const changed = mountCard({
      userDiscRate: "rate-existing",
      rate: 7,
      cover: 6,
      isNew: false,
    });
    await submit(changed.wrapper, "8", "6");
    expect(changed.wrapper.emitted("rating-saved")?.[0]?.[0]).toEqual({
      discId: "disc-1",
      action: "updated",
      musicalRateChanged: true,
      hasMusicalRate: true,
      coverChanged: false,
    });
    changed.wrapper.unmount();
    changed.queryClient.clear();

    const coverOnly = mountCard({
      userDiscRate: "rate-cover-only",
      rate: null,
      cover: 6,
      isNew: false,
    });
    await submit(coverOnly.wrapper, "", "8");
    expect(coverOnly.wrapper.emitted("rating-saved")?.[0]?.[0]).toEqual({
      discId: "disc-1",
      action: "updated",
      musicalRateChanged: false,
      hasMusicalRate: false,
      coverChanged: true,
    });
    coverOnly.wrapper.unmount();
    coverOnly.queryClient.clear();
  });

  it("does not emit a rating event when saving fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    postRateService.mockRejectedValueOnce(new Error("save failed"));
    const { queryClient, wrapper } = mountCard();
    await submit(wrapper, "8");

    expect(wrapper.emitted("rating-saved")).toBeUndefined();
    expect(fire).toHaveBeenCalled();
    wrapper.unmount();
    queryClient.clear();
    consoleError.mockRestore();
  });
});
