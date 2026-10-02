// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";
import AsignationList from "../../../../src/views/list/components/AsignationList.vue";
import MejoresDetalle from "../../../../src/views/discos/MejoresDetalle.vue";
import { asignationTextUpdateKey } from "../../../../src/modules/editorial/asignations/presentation/asignationTextUpdateKey";
import { listWordPressPublicationKey } from "../../../../src/modules/editorial/lists/presentation/listWordPressPublicationKey";
import type { ListWordPressPublicationPort } from "../../../../src/modules/editorial/lists/application/listWordPressPublicationPort";

const { publishRadarPosts, updateAsignationText, success, error, fire } = vi.hoisted(() => ({
  publishRadarPosts: vi.fn(),
  updateAsignationText: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  fire: vi.fn(),
}));
const bestDiscsMocks = vi.hoisted(() => ({
  publishBestDiscsList: vi.fn(), getListDetails: vi.fn(), updateList: vi.fn(),
  loadAsignations: vi.fn(), loadBestDiscsUsers: vi.fn(), go: vi.fn(),
}));
const storeMocks = vi.hoisted(() => ({
  useAsignationStore: vi.fn(() => ({ asignations: [], updateAsignationStore: vi.fn(), loadAsignations: vi.fn() })),
  useUserStore: vi.fn(() => ({ usersRv: [], loadRvUsers: vi.fn() })),
}));

vi.mock("@stores/asignation/asignation", () => ({ useAsignationStore: storeMocks.useAsignationStore }));
vi.mock("@stores/user/users", () => ({ useUserStore: storeMocks.useUserStore }));
vi.mock("@services/swal/SwalService", () => ({ default: { success, error } }));
vi.mock("sweetalert2", () => ({ default: { fire } }));
vi.mock("@services/list/list", () => ({
  getListDetails: bestDiscsMocks.getListDetails,
  updateList: bestDiscsMocks.updateList,
}));
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { id: "best-list-1" } }),
  useRouter: () => ({ push: bestDiscsMocks.go }),
}));

const wordPressPort: ListWordPressPublicationPort = {
  publishRadarPosts,
  publishBestDiscsList: vi.fn(),
};

function mountAsignationList() {
  return shallowMount(AsignationList, {
    props: { type: "week", listId: "list-1" },
    global: {
      provide: {
        [asignationTextUpdateKey as symbol]: { updateAsignationText },
        [listWordPressPublicationKey as symbol]: wordPressPort,
      },
      stubs: { CircleFlags: true },
    },
  });
}

afterEach(() => vi.clearAllMocks());

describe("AsignationList WordPress publication", () => {
  it("preserves the generated HTML, success state and emitted post records", async () => {
    publishRadarPosts.mockResolvedValue({
      created: 1,
      posts: [{
        position: 1, wpPostId: 21, link: "https://wp.test/radar", title: "Radar semanal",
        added: 1, warning: "Un disco no pudo sincronizarse",
      }],
    });
    const view = mountAsignationList();

    await view.vm.publishRadarToWordPress(1);
    await flushPromises();

    expect(publishRadarPosts).toHaveBeenCalledWith("list-1", 1);
    expect(view.emitted("wp-published")?.[0]?.[0]).toEqual([{
      position: 1, wpPostId: 21, link: "https://wp.test/radar", title: "Radar semanal",
      added: 1, warning: "Un disco no pudo sincronizarse",
    }]);
    expect(fire).toHaveBeenCalledWith(expect.objectContaining({
      icon: "warning",
      title: "Radar 1",
      html: expect.stringContaining('<a href="https://wp.test/radar" target="_blank" class="text-blue-600 underline">Radar semanal</a>'),
    }));
    expect(view.vm.publishingRadar[1]).toBe(false);
    view.unmount();
  });

  it("keeps the current error message and resets the publishing state", async () => {
    publishRadarPosts.mockRejectedValue({ response: { data: { message: "Error WP" } } });
    const view = mountAsignationList();
    await view.vm.publishRadarToWordPress(3);
    await flushPromises();

    expect(error).toHaveBeenCalledWith("Error WP");
    expect(view.vm.publishingRadar[3]).toBe(false);
    view.unmount();
  });
});

describe("MejoresDetalle WordPress publication", () => {
  afterEach(() => vi.clearAllMocks());

  function mountBestDiscsDetail() {
    return shallowMount(MejoresDetalle, {
      global: {
        provide: {
          [listWordPressPublicationKey as symbol]: {
            publishRadarPosts,
            publishBestDiscsList: bestDiscsMocks.publishBestDiscsList,
          },
        },
        stubs: { DiscsByDate: true, MejoresAsignationList: true, MisVotosMes: true },
      },
    });
  }

  it("preserves the existing skipped-post message and generated HTML", async () => {
    storeMocks.useAsignationStore.mockReturnValue({ asignations: [], loadAsignations: bestDiscsMocks.loadAsignations } as never);
    storeMocks.useUserStore.mockReturnValue({ loadRvUsers: bestDiscsMocks.loadBestDiscsUsers } as never);
    bestDiscsMocks.getListDetails.mockResolvedValue({
      id: "best-list-1", name: "Mejores discos", type: "month", status: "new", listDate: "2026-10-01",
    });
    bestDiscsMocks.publishBestDiscsList.mockResolvedValue({
      wpPostId: 77, link: "https://wp.test/best", title: "Mejores discos", skipped: true,
    });
    const view = mountBestDiscsDetail();
    await flushPromises();
    await view.get('button[title*="borrador en WordPress"]').trigger("click");
    await flushPromises();

    expect(bestDiscsMocks.publishBestDiscsList).toHaveBeenCalledWith("best-list-1");
    expect(fire).toHaveBeenCalledWith({
      icon: "info",
      title: "Ya existía un borrador en WordPress",
      html: 'Se ha enlazado la lista al post ya existente: <a href="https://wp.test/best" target="_blank" class="text-blue-600 underline">Mejores discos</a>',
    });
    expect(view.find('a[href="https://wp.test/best"]').exists()).toBe(true);
    view.unmount();
  });

  it("preserves backend publication errors", async () => {
    storeMocks.useAsignationStore.mockReturnValue({ asignations: [], loadAsignations: bestDiscsMocks.loadAsignations } as never);
    storeMocks.useUserStore.mockReturnValue({ loadRvUsers: bestDiscsMocks.loadBestDiscsUsers } as never);
    bestDiscsMocks.getListDetails.mockResolvedValue({
      id: "best-list-1", name: "Mejores discos", type: "month", status: "new", listDate: "2026-10-01",
    });
    bestDiscsMocks.publishBestDiscsList.mockRejectedValue({ response: { data: { message: "WP no disponible" } } });
    const view = mountBestDiscsDetail();
    await flushPromises();
    await view.get('button[title*="borrador en WordPress"]').trigger("click");
    await flushPromises();

    expect(error).toHaveBeenCalledWith("WP no disponible");
    view.unmount();
  });
});
