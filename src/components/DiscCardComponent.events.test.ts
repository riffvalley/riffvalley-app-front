// @vitest-environment happy-dom
import { flushPromises, shallowMount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/modules/identity/auth";
import type { UserRole } from "@/modules/identity/shared";

const {
  getDiscRates,
  postRateService,
  updateRateService,
  postFavoriteService,
  deleteFavoriteService,
  postPendingService,
  deletePendingService,
  success,
  successImage,
  fire,
  mutateSummary,
} = vi.hoisted(() => ({
  getDiscRates: vi.fn(),
  postRateService: vi.fn(),
  updateRateService: vi.fn(),
  postFavoriteService: vi.fn(),
  deleteFavoriteService: vi.fn(),
  postPendingService: vi.fn(),
  deletePendingService: vi.fn(),
  success: vi.fn(),
  successImage: vi.fn(),
  fire: vi.fn(),
  mutateSummary: vi.fn(),
}));

vi.mock("@services/rates/rates.ts", () => ({ getDiscRates, postRateService, updateRateService }));
vi.mock("@services/favorites/favorites.ts", () => ({
  postFavoriteService,
  deleteFavoriteService,
}));
vi.mock("@services/pendings/pendings", () => ({
  postPendingService,
  deletePendingService,
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

function mountCard(props: Record<string, unknown> = {}, role: UserRole | null = null) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const authStore = useAuthStore(pinia);
  authStore.role = role;
  authStore.authStatus = role ? "authenticated" : "initializing";
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  mutateSummary.mockImplementation((_client: QueryClient, operation: () => Promise<unknown>) =>
    operation()
  );
  const wrapper = shallowMount(DiscCard, {
    props: { ...baseProps, ...props },
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }]],
      renderStubDefaultSlot: true,
      stubs: {
        CircleFlags: true,
        "font-awesome-icon": true,
        DiscCalendar: {
          name: "DiscCalendar",
          props: ["embedded", "initialDate", "focusDiscId"],
          emits: ["close"],
          template: '<div data-testid="embedded-disc-calendar"></div>',
        },
      },
    },
  });
  return { queryClient, wrapper };
}

async function submit(
  wrapper: ReturnType<typeof mountCard>["wrapper"],
  rate: string,
  cover?: string
) {
  const inputs = wrapper.findAll('input[type="number"]');
  await inputs[0].setValue(rate);
  if (cover !== undefined) await inputs[1].setValue(cover);
  const submitButton = wrapper
    .findAll("button")
    .find((button) => /Votar|Editar/.test(button.text()));
  if (!submitButton) throw new Error("No se encontró el botón de valoración");
  await submitButton.trigger("click");
  await flushPromises();
}

describe("DiscCard rating-saved event", () => {
  beforeEach(() => {
    getDiscRates.mockReset().mockResolvedValue([]);
    postRateService.mockReset().mockResolvedValue({ id: "rate-new" });
    updateRateService.mockReset().mockResolvedValue({ data: undefined });
    postFavoriteService.mockReset().mockResolvedValue({ id: "favorite-new" });
    deleteFavoriteService.mockReset().mockResolvedValue(undefined);
    postPendingService.mockReset().mockResolvedValue({ id: "pending-new" });
    deletePendingService.mockReset().mockResolvedValue(undefined);
    success.mockReset();
    successImage.mockReset();
    fire.mockReset();
    mutateSummary.mockReset();
  });

  it("renders dash for missing averages and preserves a valid ranked zero", () => {
    const zero = mountCard({ averageRate: 0 });
    expect(zero.wrapper.text()).toContain("-");
    zero.wrapper.unmount();
    zero.queryClient.clear();

    const rankedZero = mountCard({ averageRate: 0, showZeroAverageRate: true });
    expect(rankedZero.wrapper.text()).toContain("0.00");
    rankedZero.wrapper.unmount();
    rankedZero.queryClient.clear();

    const unrated = mountCard({ averageRate: null, rateCount: 0 });
    expect(unrated.wrapper.text()).toContain("-");
    expect(unrated.wrapper.text()).not.toContain("NaN");
    expect(unrated.wrapper.text()).not.toContain("undefined");
    unrated.wrapper.unmount();
    unrated.queryClient.clear();
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

  it("emits a Community update after favorite and pending changes", async () => {
    const { queryClient, wrapper } = mountCard();
    await (wrapper.vm as unknown as { toggleHeart: () => Promise<void> }).toggleHeart();
    await (wrapper.vm as unknown as { toggleBookmark: () => Promise<void> }).toggleBookmark();
    (wrapper.vm as unknown as { closeComentsModal: () => void }).closeComentsModal();
    await flushPromises();

    expect(wrapper.emitted("community-updated")).toHaveLength(2);
    expect(postFavoriteService).toHaveBeenCalledWith({ discId: "disc-1" });
    expect(postPendingService).toHaveBeenCalledWith({ discId: "disc-1" });
    wrapper.unmount();
    queryClient.clear();
  });

  it("keeps the embedded calendar connected to the selected disc date", async () => {
    const { queryClient, wrapper } = mountCard({}, "riffvalley");
    await wrapper.get('[title="Editar en calendario"]').trigger("click");

    const calendar = wrapper.getComponent({ name: "DiscCalendar" });
    expect(calendar.props()).toMatchObject({
      embedded: true,
      initialDate: "2020-01-01",
      focusDiscId: "disc-1",
    });

    calendar.vm.$emit("close");
    await flushPromises();
    expect(wrapper.find('[data-testid="embedded-disc-calendar"]').exists()).toBe(false);
    wrapper.unmount();
    queryClient.clear();
  });
});
