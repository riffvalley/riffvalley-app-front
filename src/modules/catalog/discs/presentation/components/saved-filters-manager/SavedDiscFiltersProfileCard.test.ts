// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { computed, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import type { SavedDiscFilter } from "../../../types/savedDiscFilter";
import { readDiscListSessionFilters, writeDiscListAppliedSavedFilterId } from "../../../application/discListSessionFilters";
import SavedDiscFiltersProfileCard from "./SavedDiscFiltersProfileCard.vue";

const mocks = vi.hoisted(() => ({
  filters: null as unknown as import("vue").Ref<SavedDiscFilter[]>,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/modules/identity/auth", () => ({ useAuthStore: () => ({ userId: "user-1" }) }));
vi.mock("@services/genres/genres", () => ({
  getAllGenres: vi.fn(async () => [
    { id: "genre-metal", name: "Metal", color: "#ff0000" },
    { id: "genre-rock", name: "Rock", color: "#00ff00" },
  ]),
}));
vi.mock("@services/countries/countries", () => ({
  getAllCountries: vi.fn(async () => [{ id: "country-es", name: "España", isoCode: "ES" }]),
}));
vi.mock("../../../application/useSavedDiscFilters", () => {
  const mutation = (fn: (...args: unknown[]) => unknown) => ({
    mutateAsync: fn,
    isPending: ref(false),
  });
  return {
    useSavedDiscFilters: () => ({
      filters: computed(() => mocks.filters.value),
      isLoading: ref(false),
      isError: ref(false),
      retry: vi.fn(),
      create: mutation(mocks.create),
      update: mutation(mocks.update),
      remove: mutation(mocks.remove),
    }),
  };
});

function makeFilter(overrides: Partial<SavedDiscFilter> = {}): SavedDiscFilter {
  return {
    id: "filter-1",
    name: "Metal español",
    filters: { genreIds: ["genre-metal"], countryId: "country-es", yearFrom: 2025, yearTo: 2026 },
    missingGenreIds: [],
    countryMissing: false,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function mountCard() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "Profile", component: { template: "<div />" } },
      { path: "/disc-list", name: "DiscList", component: { template: "<div />" } },
    ],
  });
  const wrapper = mount(SavedDiscFiltersProfileCard, {
    attachTo: document.body,
    global: { plugins: [router], stubs: { SearchableSelect: true } },
  });
  return { wrapper, router };
}

async function openManager(wrapper: ReturnType<typeof mountCard>["wrapper"]) {
  await wrapper.get('[data-testid="saved-filters-manage"]').trigger("click");
  await flushPromises();
}

const dialog = () => document.querySelector<HTMLElement>('[data-testid="saved-filters-dialog"]');
const buttonByText = (text: string) =>
  [...(dialog()?.querySelectorAll("button") ?? [])].find((button) => button.textContent?.trim() === text);

beforeEach(() => {
  mocks.filters = ref([makeFilter()]);
  mocks.create.mockReset();
  mocks.update.mockReset();
  mocks.remove.mockReset();
});

afterEach(() => {
  document.body.innerHTML = "";
  sessionStorage.clear();
});

describe("SavedDiscFiltersProfileCard", () => {
  it("shows how many of the 20 filters are used and summarizes each one", async () => {
    const { wrapper } = mountCard();
    expect(wrapper.get('[data-testid="saved-filters-counter"]').text()).toBe("1 / 20 filtros guardados");

    await openManager(wrapper);
    const text = dialog()?.textContent ?? "";
    expect(text).toContain("Metal español");
    expect(text).toContain("Metal");
    expect(text).toContain("España");
    expect(text).toContain("2025–2026");
    wrapper.unmount();
  });

  it("edits the name and years of a saved filter", async () => {
    mocks.update.mockImplementation(async ({ id, payload }) => ({
      result: { ...makeFilter(), id, ...payload },
    }));
    const { wrapper } = mountCard();
    await openManager(wrapper);
    buttonByText("Editar")?.click();
    await flushPromises();

    const name = dialog()!.querySelector<HTMLInputElement>("#manage-filter-name")!;
    name.value = "Metal 2026";
    name.dispatchEvent(new Event("input"));
    dialog()!.querySelector<HTMLButtonElement>("#manage-filter-year-from")!.click();
    await flushPromises();
    dialog()!.querySelector<HTMLElement>('#manage-filter-year-from-listbox [data-value="2026"]')!.click();
    await flushPromises();
    dialog()!.querySelector<HTMLFormElement>('[data-testid="saved-filter-editor"]')!.requestSubmit();
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith({
      id: "filter-1",
      payload: {
        name: "Metal 2026",
        filters: { genreIds: ["genre-metal"], countryId: "country-es", yearFrom: 2026, yearTo: 2026 },
      },
    });
    expect(dialog()?.textContent).toContain("Filtro «Metal 2026» actualizado.");
    wrapper.unmount();
  });

  it("does not create an empty filter and blocks new filters at the limit", async () => {
    const { wrapper } = mountCard();
    await openManager(wrapper);
    buttonByText("Nuevo filtro")?.click();
    await flushPromises();
    const name = dialog()!.querySelector<HTMLInputElement>("#manage-filter-name")!;
    name.value = "Vacío";
    name.dispatchEvent(new Event("input"));
    dialog()!.querySelector<HTMLFormElement>('[data-testid="saved-filter-editor"]')!.requestSubmit();
    await flushPromises();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(dialog()?.textContent).toContain("Elige al menos un género, un país o un año.");
    wrapper.unmount();

    mocks.filters.value = Array.from({ length: 20 }, (_, index) =>
      makeFilter({ id: `filter-${index}`, name: `Filtro ${index}` })
    );
    const limited = mountCard();
    await openManager(limited.wrapper);
    const newButton = dialog()!.querySelector<HTMLButtonElement>('[data-testid="saved-filters-new"]')!;
    expect(newButton.disabled).toBe(true);
    expect(dialog()?.textContent).toContain("Has llegado al máximo de filtros.");
    limited.wrapper.unmount();
  });

  it("deletes a filter only after confirming", async () => {
    mocks.remove.mockResolvedValue({ userId: "user-1", generation: 1 });
    const { wrapper } = mountCard();
    await openManager(wrapper);
    buttonByText("Eliminar")?.click();
    await flushPromises();
    expect(mocks.remove).not.toHaveBeenCalled();
    buttonByText("Eliminar filtro")?.click();
    await flushPromises();
    expect(mocks.remove).toHaveBeenCalledWith("filter-1");
    wrapper.unmount();
  });

  it("opens Discos with the filter loaded as the active filters", async () => {
    const { wrapper, router } = mountCard();
    await openManager(wrapper);
    buttonByText("Ver en Discos")?.click();
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("DiscList");
    expect(readDiscListSessionFilters("user-1")).toEqual({
      week: ["2025-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"],
      genreIds: ["genre-metal"],
      countryId: "country-es",
      noRatesOnly: false,
    });
    expect(dialog()).toBeNull();
    wrapper.unmount();
  });

  it("marks the filter applied in Discos as «Activo» with a green check", async () => {
    mocks.filters.value = [makeFilter(), makeFilter({ id: "filter-2", name: "Rock" })];
    writeDiscListAppliedSavedFilterId("user-1", "filter-1");
    const { wrapper } = mountCard();
    await openManager(wrapper);

    const active = dialog()!.querySelectorAll('[data-testid="saved-filter-active"]');
    expect(active).toHaveLength(1);
    expect(active[0].textContent?.trim()).toBe("Activo");
    expect(active[0].getAttribute("aria-label")).toBe("Filtro activo «Metal español». Ver en Discos");
    expect(active[0].querySelector(".fa-check.text-green-600")).not.toBeNull();
    expect(active[0].className).not.toContain("bg-rv-pink");
    // El otro filtro sigue con su botón normal.
    expect(buttonByText("Ver en Discos")?.getAttribute("aria-label")).toBe("Ver en Discos: «Rock»");
    wrapper.unmount();
  });
});
