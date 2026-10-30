// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { ref } from "vue";

const sampleRequests = [
  { id: "pending-1", artistName: "Artist A", discName: "Album A", releaseDate: "2026-01-01", createdAt: "2026-01-02", ep: false, debut: false, status: "pending", adminNotes: null, genre: null, country: null },
  { id: "rejected-1", artistName: "Artist B", discName: "Album B", releaseDate: null, createdAt: "2026-01-03", ep: true, debut: false, status: "rejected", adminNotes: "Duplicate", genre: null, country: null },
];
const state = vi.hoisted(() => ({
  query: undefined as unknown as ReturnType<typeof makeQuery>,
  update: vi.fn(), approve: vi.fn(), reopen: vi.fn(), reject: vi.fn(), error: vi.fn(), success: vi.fn(),
}));
function makeQuery() {
  return { data: ref(sampleRequests), isPending: ref(false), isError: ref(false), refetch: vi.fn() };
}
vi.mock("../../application/useRequests", () => ({
  useAdminRequestsQuery: () => state.query,
  useRequestMutations: () => ({
    update: { mutateAsync: state.update }, approve: { mutateAsync: state.approve },
    reopen: { mutateAsync: state.reopen }, reject: { mutateAsync: state.reject },
  }),
}));
vi.mock("@services/swal/SwalService", () => ({ default: { success: state.success, error: state.error } }));

import PetitionsPage from "./PetitionsPage.vue";

describe("PetitionsPage", () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    state.query = makeQuery();
    state.update.mockResolvedValue({ id: "pending-1" });
    state.approve.mockResolvedValue(undefined);
    state.reopen.mockResolvedValue({ id: "rejected-1" });
    state.reject.mockResolvedValue({ id: "pending-1" });
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  function mountPage() {
    return mount(PetitionsPage, {
      global: {
        plugins: [createPinia(), [VueQueryPlugin, { queryClient }]],
        stubs: { SearchableSelect: true },
      },
    });
  }

  it("lists requests and filters by the existing status tabs", async () => {
    const wrapper = mountPage();
    expect(wrapper.text()).toContain("Album A");
    expect(wrapper.text()).not.toContain("Album B");
    await wrapper.get("button").trigger("click"); // Pendientes is selected already
    const approvedTab = wrapper.findAll("button").find((button) => button.text().includes("Aprobadas"));
    await approvedTab?.trigger("click");
    expect(wrapper.text()).toContain("No hay peticiones aprobadas.");
    const allTab = wrapper.findAll("button").find((button) => button.text().includes("Todas"));
    await allTab?.trigger("click");
    expect(wrapper.text()).toContain("Album A");
    expect(wrapper.text()).toContain("Album B");
  });

  it("preserves optional submitter display without adding it to the DiscRequest DTO", async () => {
    state.query.data.value = [
      { ...sampleRequests[0], user: { username: "Request owner" } },
    ] as typeof sampleRequests;
    const wrapper = mountPage();
    expect(wrapper.text()).toContain("Request owner");
  });

  it("keeps the pending approve and reject actions and approval feedback", async () => {
    const wrapper = mountPage();
    const approve = wrapper.find('button[title="Aprobar"]');
    await approve.trigger("click");
    await flushPromises();
    expect(state.approve).toHaveBeenCalledWith("pending-1");
    expect(state.success).toHaveBeenCalledWith("Petición aprobada y disco creado");
    await wrapper.find('button[title="Rechazar"]').trigger("click");
    expect(wrapper.text()).toContain("Rechazar petición");
    await wrapper.findAll("button").find((button) => button.text().trim() === "Rechazar")?.trigger("click");
    expect(wrapper.text()).toContain("El motivo es obligatorio.");
    expect(state.reject).not.toHaveBeenCalled();
  });

  it("shows an error state with retry for the administrative list", async () => {
    state.query.isError.value = true;
    state.query.data.value = [];
    const wrapper = mountPage();
    expect(wrapper.text()).toContain("No se pudieron cargar las peticiones.");
    expect(wrapper.text()).not.toContain("No hay peticiones pendientes.");
    const retry = wrapper.findAll("button").find((button) => button.text().includes("Reintentar"));
    await retry?.trigger("click");
    expect(state.query.refetch).toHaveBeenCalledOnce();
  });

  it("preserves the edit modal and maps changed fields into the existing DTO", async () => {
    const wrapper = mountPage();
    await wrapper.find('button[title="Editar"]').trigger("click");
    const artist = wrapper.findAll('input[type="text"]')[0];
    await artist.setValue("Updated Artist");
    const save = wrapper.findAll("button").find((button) => button.text().includes("Guardar"));
    await save?.trigger("click");
    await flushPromises();
    expect(state.update).toHaveBeenCalledWith({ id: "pending-1", dto: { artistName: "Updated Artist" } });
  });
});
