// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BestListDetailView from "./BestListDetailView.vue";
import { generateBestDiscsWpPost, getListDetails, updateList } from "@services/list/list";
import Swal from "sweetalert2";
import { useAuthStore } from "@/modules/identity/auth";

const { push, route } = vi.hoisted(() => ({
  push: vi.fn(),
  route: { params: { id: "best-1" }, query: {} as Record<string, string> },
}));

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-router")>();
  return { ...actual, useRoute: () => route, useRouter: () => ({ push }) };
});
vi.mock("@services/list/list", () => ({
  getListDetails: vi.fn(),
  updateList: vi.fn(),
  generateBestDiscsWpPost: vi.fn(),
}));
vi.mock("@services/asignation/asignation", () => ({
  getAsignationsByListService: vi.fn().mockResolvedValue([]),
  postAsignationService: vi.fn(),
  updateAsignationService: vi.fn(),
  deleteAsignationService: vi.fn(),
}));
vi.mock("@/modules/identity/users", () => ({ getRvUsers: vi.fn().mockResolvedValue([]) }));
vi.mock("@services/genres/genres", () => ({ getGenres: vi.fn().mockResolvedValue({ data: [] }) }));
vi.mock("@services/rates/rates", () => ({
  getRatesByUser: vi.fn().mockResolvedValue({ data: [] }),
}));
vi.mock("@services/discs/discs", () => ({ getDiscsDated: vi.fn(), updateDisc: vi.fn() }));
vi.mock("@services/swal/SwalService", () => ({
  default: { error: vi.fn(), success: vi.fn(), confirm: vi.fn() },
}));
vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));

const bestList = {
  id: "best-1",
  name: "Mejores del mes",
  type: "month",
  status: "new",
  releaseDate: "2026-10-01T00:00:00.000Z",
  listDate: "2026-10-01T00:00:00.000Z",
  closeDate: null,
  asignations: [],
};
let pinia: ReturnType<typeof createPinia>;
let queryClient: QueryClient;

describe("BestListDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.id = "best-1";
    route.query = {};
    pinia = createPinia();
    setActivePinia(pinia);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    useAuthStore().$patch({
      authStatus: "authenticated",
      isAuthenticated: true,
      userId: "editor-1",
      token: "token",
      role: "riffvalley",
      authSessionGeneration: 1,
    });
    vi.mocked(getListDetails).mockResolvedValue({ ...bestList });
    vi.mocked(updateList).mockResolvedValue({ ...bestList });
    vi.mocked(generateBestDiscsWpPost).mockResolvedValue({
      wpPostId: 91,
      link: "https://wordpress.example/best-draft",
      title: "Mejores del mes",
      added: 2,
    });
  });

  function mountView() {
    return mount(BestListDetailView, {
      global: {
        plugins: [pinia, [VueQueryPlugin, { queryClient }]],
        stubs: {
          BestAssignments: {
            name: "BestAssignments",
            props: ["listId"],
            emits: ["assignment-count"],
            template: "<div />",
          },
          BestDiscCatalog: true,
          BestVotes: true,
        },
      },
    });
  }

  it("abre por defecto Mis votos y respeta la pestaña explícita en query string", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain("Mis votos");
    expect(wrapper.findComponent({ name: "BestVotes" }).props("listId")).toBe("best-1");
    expect(wrapper.findComponent({ name: "BestVotes" }).props("active")).toBe(true);
    expect(wrapper.findComponent({ name: "BestDiscCatalog" }).props("active")).toBe(false);
    await wrapper.get('[role="tab"]:nth-child(2)').trigger("click");
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain(
      "Selección de discos"
    );
    expect(wrapper.findComponent({ name: "BestVotes" }).props("active")).toBe(false);
    expect(wrapper.findComponent({ name: "BestDiscCatalog" }).props("active")).toBe(true);
    wrapper.unmount();

    route.query = { tab: "seleccion" };
    const explicit = mountView();
    await flushPromises();
    expect(explicit.get('[role="tab"][aria-selected="true"]').text()).toContain(
      "Selección de discos"
    );
    explicit.unmount();
  });

  it("presenta las asignaciones dentro de una hoja con encabezado claro", async () => {
    const wrapper = mountView();
    await flushPromises();

    const sheet = wrapper.get(".best-assignment-sheet");
    expect(sheet.get("h2").text()).toBe("Asignaciones");
    expect(sheet.classes()).toContain("rounded-2xl");
    expect(sheet.classes()).toContain("dark:bg-rv-darkCard");
    const assignments = wrapper.findComponent({ name: "BestAssignments" });
    assignments.vm.$emit("assignment-count", 3);
    await flushPromises();
    expect(sheet.get('[aria-live="polite"]').text()).toBe("3 discos");
    expect(sheet.get('[aria-live="polite"]').classes()).toContain("rounded-full");
    expect(sheet.get('[aria-live="polite"]').classes()).toContain("bg-rv-gradient");
    wrapper.unmount();
  });

  it("conserva fechas editoriales y opcionales, enviando null al limpiar la opcional", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.get('input[aria-label="Fecha de publicación obligatoria"]').element.value).toBe(
      "2026-10-01"
    );
    expect(wrapper.get('input[aria-label="Fecha de lista (opcional)"]').element.value).toBe(
      "2026-10-01"
    );
    await wrapper
      .get('input[aria-label="Fecha de publicación obligatoria"]')
      .setValue("2026-10-03");
    await flushPromises();
    expect(updateList).toHaveBeenCalledWith("best-1", { releaseDate: "2026-10-03" });
    const optional = wrapper.get('input[aria-label="Fecha de lista (opcional)"]');
    optional.element.value = "";
    await optional.trigger("change");
    await flushPromises();
    expect(updateList).toHaveBeenCalledWith("best-1", { listDate: null });
    wrapper.unmount();
  });

  it("muestra un estado de error con reintento y conserva la ruta anterior", async () => {
    vi.mocked(getListDetails).mockRejectedValue(new Error("offline"));
    const wrapper = mountView();
    await flushPromises();
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true), {
      timeout: 4_000,
    });
    expect(wrapper.get('[role="alert"]').text()).toContain("No se pudieron cargar");
    expect(wrapper.get('[role="alert"] button').text()).toContain("Reintentar");
    expect(push).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("conserva el flujo de WordPress como borrador e informa la respuesta editorial", async () => {
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('button[title*="nunca se publica solo"]').trigger("click");
    await flushPromises();
    expect(generateBestDiscsWpPost).toHaveBeenCalledWith("best-1");
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: "success",
        title: "Se han añadido 2 discos nuevos al borrador",
      })
    );
    wrapper.unmount();
  });
});
