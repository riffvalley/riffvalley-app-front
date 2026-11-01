// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { reactive } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

type TestAsignation = {
  id: string;
  position: number;
  [key: string]: unknown;
};

const { asignationStore, userStore, error, createWpPosts } = vi.hoisted(() => ({
  asignationStore: {
    asignations: [] as TestAsignation[],
    addAsignation: vi.fn(),
    updateAsignationStore: vi.fn<(updated: TestAsignation) => Promise<void>>(),
    removeAsignation: vi.fn(),
  },
  userStore: { usersRv: [] as Array<{ id: string; username: string }>, loadRvUsers: vi.fn() },
  error: vi.fn(),
  createWpPosts: vi.fn(),
}));

vi.mock("@stores/asignation/asignation", () => ({
  useAsignationStore: () => asignationStore,
}));
vi.mock("@stores/user/users", () => ({ useUserStore: () => userStore }));
vi.mock("@services/swal/SwalService", () => ({
  default: { error, success: vi.fn() },
}));
vi.mock("@services/list/list", () => ({ createWpPosts }));
vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));

import AsignationList from "./AsignationList.vue";

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

function mountList() {
  return mount(AsignationList, {
    props: { type: "week", listId: "list-1" },
    global: {
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

describe("AsignationList Radar groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asignationStore.asignations = reactive([]) as unknown as TestAsignation[];
    userStore.usersRv = [{ id: "editor-1", username: "Editor" }];
    asignationStore.updateAsignationStore.mockImplementation(async (updated: TestAsignation) => {
      const index = asignationStore.asignations.findIndex((item) => item.id === updated.id);
      if (index >= 0) asignationStore.asignations[index] = { ...asignationStore.asignations[index], ...updated };
    });
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
    asignationStore.asignations.push(...Array.from({ length: 12 }, (_, i) => makeAsignation(String(i), 0)));
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
    await wrapper.get("button").trigger("click");
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3"]);
    await wrapper.get("button").trigger("click");
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3", "Radar 4"]);
    wrapper.unmount();
  });

  it("keeps a manually added empty group when the assignment store updates", async () => {
    const wrapper = mountList();
    await wrapper.get("button").trigger("click");
    asignationStore.asignations.push(makeAsignation("inbox", 0));
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3"]);
    wrapper.unmount();
  });

  it("drops an empty manually added group after remount when no position was persisted", async () => {
    const firstMount = mountList();
    await firstMount.get("button").trigger("click");
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
    await (wrapper.vm as unknown as { moveTo: (asignation: TestAsignation, position: number) => Promise<void> }).moveTo(inbox, 3);
    await flushPromises();
    expect(asignationStore.updateAsignationStore).toHaveBeenCalledWith(
      expect.objectContaining({ id: "inbox", position: 3 }),
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
    await (wrapper.vm as unknown as { moveTo: (asignation: TestAsignation, position: number) => Promise<void> }).moveTo(inbox, 1);
    expect(asignationStore.updateAsignationStore).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("El Radar 1 ya está completo (4/4).");
    wrapper.unmount();
  });

  it("does not renumber later positions when an intermediate group is emptied", async () => {
    asignationStore.asignations.push(
      makeAsignation("one", 1),
      makeAsignation("two", 2),
      makeAsignation("three", 3),
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
