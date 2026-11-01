// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getListDetails, loadAsignations, loadRvUsers, useRoute, push } = vi.hoisted(() => ({
  getListDetails: vi.fn(),
  loadAsignations: vi.fn(),
  loadRvUsers: vi.fn(),
  useRoute: vi.fn(),
  push: vi.fn(),
}));

vi.mock("vue-router", () => ({ useRoute, useRouter: () => ({ push }) }));
vi.mock("@services/list/list", () => ({ getListDetails, updateList: vi.fn() }));
vi.mock("@stores/asignation/asignation", () => ({
  useAsignationStore: () => ({ asignations: [], loadAsignations }),
}));
vi.mock("@stores/user/users", () => ({ useUserStore: () => ({ loadRvUsers }) }));
vi.mock("@services/swal/SwalService", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import VideoListDetalle from "./VideoListDetalle.vue";

describe("VideoListDetalle legacy consumer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRoute.mockReturnValue({ query: { videoType: "best" } });
    getListDetails.mockResolvedValue({
      id: "video-best-1",
      name: "Selección mensual",
      status: "new",
      listDate: "2026-10-01",
      asignations: [],
    });
    loadAsignations.mockResolvedValue(undefined);
    loadRvUsers.mockResolvedValue(undefined);
  });

  it("conserva el catálogo mensual legacy y las asignaciones de Mejores", async () => {
    const wrapper = mount(VideoListDetalle, {
      props: { id: "video-best-1" },
      global: {
        stubs: {
          MejoresAsignationList: true,
          DiscsByDate: true,
          SpecialAsignationList: true,
        },
      },
    });
    await flushPromises();

    expect(wrapper.findComponent({ name: "MejoresAsignationList" }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "DiscsByDate" }).props()).toMatchObject({
      date: "2026-10-01",
      type: "video",
      listId: "video-best-1",
    });
    expect(wrapper.findComponent({ name: "DiscsByDate" }).props()).not.toHaveProperty(
      "remoteRadar"
    );
    expect(getListDetails).toHaveBeenCalledWith("video-best-1");
    expect(loadAsignations).toHaveBeenCalledWith("video-best-1");
    expect(loadRvUsers).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
