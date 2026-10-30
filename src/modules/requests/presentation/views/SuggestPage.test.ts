// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia } from "pinia";
import { mount, flushPromises } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { ref } from "vue";
import { readFileSync } from "node:fs";

const state = vi.hoisted(() => ({
  query: undefined as unknown as ReturnType<typeof makeQuery>,
  create: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
function makeQuery() {
  return { data: ref([]), isPending: ref(false), isError: ref(false), refetch: vi.fn() };
}
vi.mock("../../application/useRequests", () => ({
  useMyRequestsQuery: () => state.query,
  useRequestMutations: () => ({ create: { mutateAsync: state.create } }),
}));
vi.mock("@services/swal/SwalService", () => ({ default: { success: state.success, error: state.error } }));

import SuggestPage from "./SuggestPage.vue";

describe("SuggestPage", () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    state.query = makeQuery();
    state.create.mockResolvedValue({ id: "created" });
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  function mountPage() {
    return mount(SuggestPage, {
      global: {
        plugins: [createPinia(), [VueQueryPlugin, { queryClient }]],
        stubs: { SearchableSelect: true },
      },
    });
  }

  it("validates required fields and the 2025 minimum date", async () => {
    const wrapper = mountPage();
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("El nombre del artista y del disco son obligatorios.");
    await wrapper.find('input[placeholder="Ej: Metallica"]').setValue("Artist");
    await wrapper.find('input[placeholder="Ej: Master of Puppets"]').setValue("Album");
    await wrapper.find('input[type="date"]').setValue("2024-12-31");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("La fecha de lanzamiento no puede ser anterior a 2025.");
    expect(state.create).not.toHaveBeenCalled();
  });

  it("sends the existing payload and clears the form after success", async () => {
    const wrapper = mountPage();
    await wrapper.find('input[placeholder="Ej: Metallica"]').setValue(" Metallica ");
    await wrapper.find('input[placeholder="Ej: Master of Puppets"]').setValue(" Album ");
    await wrapper.find('input[type="date"]').setValue("2025-03-01");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(state.create).toHaveBeenCalledWith({ discName: "Album", artistName: "Metallica", releaseDate: "2025-03-01" });
    expect((wrapper.find('input[placeholder="Ej: Metallica"]').element as HTMLInputElement).value).toBe("");
    expect((wrapper.find('input[placeholder="Ej: Master of Puppets"]').element as HTMLInputElement).value).toBe("");
    expect(state.success).toHaveBeenCalledWith("Petición enviada correctamente");
  });

  it("distinguishes a failed own-list query from empty state and retries", async () => {
    state.query.isError.value = true;
    const wrapper = mountPage();
    expect(wrapper.text()).toContain("No se pudieron cargar tus solicitudes.");
    expect(wrapper.text()).not.toContain("Sin solicitudes todavía");
    const retry = wrapper.findAll("button").find((button) => button.text().includes("Reintentar"));
    await retry?.trigger("click");
    expect(state.query.refetch).toHaveBeenCalledOnce();
  });

  it("shows an empty message when the own list loaded successfully", () => {
    const wrapper = mountPage();
    expect(wrapper.text()).toContain("Sin solicitudes todavía");
  });

  it("does not import the removed legacy Requests service or HTTP transport", () => {
    const source = readFileSync(
      `${process.cwd()}/src/modules/requests/presentation/views/SuggestPage.vue`,
      "utf8",
    );
    expect(source).not.toContain("@services/requests/requests");
    expect(source).not.toContain("axios");
  });
});
