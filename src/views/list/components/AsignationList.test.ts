// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { reactive } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

type TestAsignation = {
  id: string;
  position: number;
  [key: string]: unknown;
};

const {
  asignationStore,
  userStore,
  error,
  createWpPosts,
  getAsignationsByListService,
  getRvUsers,
  radarMutations,
} = vi.hoisted(() => ({
  asignationStore: {
    asignations: [] as TestAsignation[],
    addAsignation: vi.fn(),
    updateAsignationStore: vi.fn<(updated: TestAsignation) => Promise<void>>(),
    removeAsignation: vi.fn(),
  },
  userStore: { usersRv: [] as Array<{ id: string; username: string }>, loadRvUsers: vi.fn() },
  error: vi.fn(),
  createWpPosts: vi.fn(),
  getAsignationsByListService: vi.fn(),
  getRvUsers: vi.fn(),
  radarMutations: {
    assign: vi.fn(),
    updateAssignment: vi
      .fn<(args: { id: string; payload: { position?: number } }) => Promise<void>>()
      .mockResolvedValue(undefined),
    removeAssignment: vi.fn(),
    toggleFeatured: vi.fn(),
  },
}));
let queryClient: QueryClient;

vi.mock("@stores/asignation/asignation", () => ({
  useAsignationStore: () => asignationStore,
}));
vi.mock("@stores/user/users", () => ({ useUserStore: () => userStore }));
vi.mock("@services/swal/SwalService", () => ({
  default: { error, success: vi.fn() },
}));
vi.mock("@services/list/list", () => ({ createWpPosts }));
vi.mock("@services/asignation/asignation", () => ({ getAsignationsByListService }));
vi.mock("@/modules/editorial/radar-best-lists/application/useRadarDetailMutations", () => ({
  useRadarDetailMutations: () => radarMutations,
}));
vi.mock("@/modules/identity/users", () => ({ getRvUsers }));
vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));

import AsignationList from "./AsignationList.vue";
import { useAuthStore } from "@/modules/identity/auth";

function makeAsignation(id: string, position: number) {
  return {
    id,
    position,
    done: false,
    user: { id: `user-${id}`, username: `User ${id}` },
    disc: {
      id: `disc-${id}`,
      name: `Disc ${id}`,
      image: "",
      artist: { name: `Artist ${id}`, country: null },
      genre: null,
    },
  };
}

function mountList(props: { type?: string } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore().$patch({
    authStatus: "authenticated",
    token: "test-token",
    userId: "editor",
    role: "riffvalley",
    authSessionGeneration: 2,
  });
  return mount(AsignationList, {
    props: { type: "week", listId: "list-1", ...props },
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }]],
      stubs: {
        SpotifyArtistButton: true,
        DiscDescriptionModal: true,
        CircleFlags: true,
      },
    },
  });
}

function radarHeadings(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll("h4")
    .map((heading) => heading.text().trim())
    .filter((heading) => heading.startsWith("Radar "));
}

function newRadarButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll("button").find((button) => button.text().includes("Nuevo Radar"))!;
}

describe("AsignationList legacy groups", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    vi.clearAllMocks();
    asignationStore.asignations = reactive([]) as unknown as TestAsignation[];
    userStore.usersRv = [{ id: "editor-1", username: "Editor" }];
    getAsignationsByListService.mockResolvedValue([]);
    getRvUsers.mockResolvedValue([]);
    asignationStore.updateAsignationStore.mockImplementation(async (updated: TestAsignation) => {
      const index = asignationStore.asignations.findIndex((item) => item.id === updated.id);
      if (index >= 0)
        asignationStore.asignations[index] = { ...asignationStore.asignations[index], ...updated };
    });
  });

  it("keeps the monthly legacy table without Radar panel controls", async () => {
    asignationStore.asignations.push(makeAsignation("month-item", 0));
    const wrapper = mountList({ type: "month" });
    await flushPromises();
    expect(wrapper.find("table").exists()).toBe(true);
    expect(wrapper.text()).toContain("Disc month-item");
    expect(
      wrapper.findAll("h4").filter((heading) => heading.text().startsWith("Radar "))
    ).toHaveLength(0);
    wrapper.unmount();
  });

  it("shows exactly Radar 1 and Radar 2 when there are no assignments", () => {
    const wrapper = mountList();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2"]);
    wrapper.unmount();
  });

  it("keeps two groups for one assignment in position 1", async () => {
    asignationStore.asignations.push(makeAsignation("one", 1));
    const wrapper = mountList();
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2"]);
    wrapper.unmount();
  });

  it("does not create Radar 3 for four assignments in position 1", async () => {
    asignationStore.asignations.push(...[1, 2, 3, 4].map((id) => makeAsignation(String(id), 1)));
    const wrapper = mountList();
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2"]);
    expect(wrapper.text()).toContain("4/4");
    wrapper.unmount();
  });

  it("does not let position 0 assignments create more radar groups", async () => {
    asignationStore.asignations.push(
      ...Array.from({ length: 12 }, (_, i) => makeAsignation(String(i), 0))
    );
    const wrapper = mountList();
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2"]);
    expect(wrapper.text()).toContain("Bandeja de Entrada");
    wrapper.unmount();
  });

  it("renders every position through the highest persisted position, including gaps", async () => {
    asignationStore.asignations.push(makeAsignation("one", 1), makeAsignation("four", 4));
    const wrapper = mountList();
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3", "Radar 4"]);
    expect(wrapper.text()).toContain("0/4");
    wrapper.unmount();
  });

  it("adds Radar 3 and Radar 4 with repeated Nuevo Radar clicks", async () => {
    const wrapper = mountList();
    await newRadarButton(wrapper).trigger("click");
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3"]);
    await newRadarButton(wrapper).trigger("click");
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3", "Radar 4"]);
    wrapper.unmount();
  });

  it("keeps a manually added empty group when the assignment store updates", async () => {
    const wrapper = mountList();
    await newRadarButton(wrapper).trigger("click");
    asignationStore.asignations.push(makeAsignation("inbox", 0));
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3"]);
    wrapper.unmount();
  });

  it("drops an empty manually added group after remount when no position was persisted", async () => {
    const firstMount = mountList();
    await newRadarButton(firstMount).trigger("click");
    expect(radarHeadings(firstMount)).toEqual(["Radar 1", "Radar 2", "Radar 3"]);
    firstMount.unmount();

    const reloadedView = mountList();
    await flushPromises();
    expect(radarHeadings(reloadedView)).toEqual(["Radar 1", "Radar 2"]);
    reloadedView.unmount();
  });

  it("persists a move to Radar 3 as position 3", async () => {
    const inbox = makeAsignation("inbox", 0);
    asignationStore.asignations.push(inbox);
    const wrapper = mountList();
    await flushPromises();
    await (
      wrapper.vm as unknown as {
        moveTo: (asignation: TestAsignation, position: number) => Promise<void>;
      }
    ).moveTo(inbox, 3);
    await flushPromises();
    expect(asignationStore.updateAsignationStore).toHaveBeenCalledWith(
      expect.objectContaining({ id: "inbox", position: 3 })
    );
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3"]);
    wrapper.unmount();
  });

  it("rejects moving a fifth disc into a full radar", async () => {
    const assignments = [1, 2, 3, 4].map((id) => makeAsignation(String(id), 1));
    const inbox = makeAsignation("inbox", 0);
    asignationStore.asignations.push(...assignments, inbox);
    const wrapper = mountList();
    await flushPromises();
    await (
      wrapper.vm as unknown as {
        moveTo: (asignation: TestAsignation, position: number) => Promise<void>;
      }
    ).moveTo(inbox, 1);
    expect(asignationStore.updateAsignationStore).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("El Radar 1 ya está completo (4/4).");
    wrapper.unmount();
  });

  it("does not renumber later positions when an intermediate group is emptied", async () => {
    asignationStore.asignations.push(
      makeAsignation("one", 1),
      makeAsignation("two", 2),
      makeAsignation("three", 3)
    );
    const wrapper = mountList();
    await flushPromises();
    asignationStore.asignations.splice(1, 1);
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3"]);
    expect(wrapper.text()).toContain("Disc three");
    wrapper.unmount();
  });
});
