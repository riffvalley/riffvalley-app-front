// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditList from "./EditList.vue";

const { getListDetails, updateList, loadAsignations, loadRvUsers, push } = vi.hoisted(() => ({
  getListDetails: vi.fn(),
  updateList: vi.fn(),
  loadAsignations: vi.fn(),
  loadRvUsers: vi.fn(),
  push: vi.fn(),
}));

vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));
vi.mock("@services/list/list", () => ({ getListDetails, updateList }));
vi.mock("@stores/asignation/asignation", () => ({
  useAsignationStore: () => ({ asignations: [], loadAsignations }),
}));
vi.mock("@stores/user/users", () => ({ useUserStore: () => ({ usersRv: [], loadRvUsers }) }));
vi.mock("@services/swal/SwalService", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

describe("EditList legacy consumers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getListDetails.mockResolvedValue({
      id: "month-1",
      name: "Mejores de octubre",
      type: "month",
      status: "new",
      listDate: "2026-10-01",
      releaseDate: "2026-10-01",
      asignations: [],
    });
    loadAsignations.mockResolvedValue(undefined);
    loadRvUsers.mockResolvedValue(undefined);
  });

  it("continúa usando los componentes legacy de la lista y el catálogo mensual", async () => {
    const wrapper = mount(EditList, {
      props: { id: "month-1" },
      global: {
        stubs: {
          AsignationList: true,
          DiscsByDate: true,
          SpecialAsignationList: true,
          Transition: false,
        },
      },
    });
    await flushPromises();

    expect(wrapper.findComponent({ name: "AsignationList" }).props("type")).toBe("month");
    expect(wrapper.findComponent({ name: "DiscsByDate" }).props()).toMatchObject({
      date: "2026-10-01",
      type: "month",
      listId: "month-1",
    });
    expect(wrapper.findComponent({ name: "DiscsByDate" }).props()).not.toHaveProperty(
      "remoteRadar"
    );
    expect(loadAsignations).toHaveBeenCalledWith("month-1");
    expect(loadRvUsers).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
