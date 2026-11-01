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
  confirm,
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
  confirm: vi.fn(),
  createWpPosts: vi.fn(),
  getAsignationsByListService: vi.fn(),
  getRvUsers: vi.fn(),
  radarMutations: {
    assign: vi.fn(),
    updateAssignment: vi
      .fn<(args: { id: string; payload: Record<string, unknown> }) => Promise<void>>()
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
  default: { error, confirm, success: vi.fn() },
}));
vi.mock("@services/list/list", () => ({ createWpPosts }));
vi.mock("@services/asignation/asignation", () => ({ getAsignationsByListService }));
vi.mock("@/modules/editorial/lists/radar/application/useRadarDetailMutations", () => ({
  useRadarDetailMutations: () => radarMutations,
}));
vi.mock("@/modules/identity/users", () => ({ getRvUsers }));
vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));

import RadarAssignments from "./RadarAssignments.vue";
import { useAuthStore } from "@/modules/identity/auth";
import { radarDetailQueryKeys } from "@/modules/editorial/lists/radar/application/radarDetailQueries";

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

function mountList(wpWeeklyPosts?: null) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore().$patch({
    authStatus: "authenticated",
    token: "test-token",
    userId: "editor",
    role: "riffvalley",
    authSessionGeneration: 2,
  });
  return mount(RadarAssignments, {
    props: { listId: "list-1", ...(wpWeeklyPosts === null ? { wpWeeklyPosts } : {}) },
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }]],
      stubs: {
        RadarDiscSpotifyButton: {
          props: ["discName", "artistName", "albumUrl"],
          template:
            '<button type="button" :aria-label="`Abrir ${discName} en Spotify`" :data-album-url="albumUrl"></button>',
        },
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

describe("RadarAssignments groups", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    vi.clearAllMocks();
    confirm.mockResolvedValue({ isConfirmed: true });
    asignationStore.asignations = reactive([]) as unknown as TestAsignation[];
    userStore.usersRv = [{ id: "editor-1", username: "Editor" }];
    getAsignationsByListService.mockImplementation(() =>
      Promise.resolve([...asignationStore.asignations])
    );
    getRvUsers.mockResolvedValue([]);
    asignationStore.updateAsignationStore.mockImplementation(async (updated: TestAsignation) => {
      const index = asignationStore.asignations.findIndex((item) => item.id === updated.id);
      if (index >= 0)
        asignationStore.asignations[index] = { ...asignationStore.asignations[index], ...updated };
    });
  });

  it("shows exactly Radar 1 and Radar 2 when there are no assignments", () => {
    const wrapper = mountList();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2"]);
    wrapper.unmount();
  });

  it("renders new Radar lists when WordPress weekly posts are null", async () => {
    const wrapper = mountList(null);
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2"]);
    expect(wrapper.text()).not.toContain("Borrador");
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

  it("moves assignments by desktop drag and drop", async () => {
    getAsignationsByListService.mockResolvedValue([makeAsignation("dragged", 0)]);
    const wrapper = mountList();
    await flushPromises();

    await wrapper.get('[draggable="true"]').trigger("dragstart");
    const radarTwo = wrapper.get('[aria-label="Radar 2, zona de asignación y movimiento"]');
    await radarTwo.trigger("dragover");
    await radarTwo.trigger("drop");
    await flushPromises();

    expect(radarMutations.updateAssignment).toHaveBeenCalledWith({
      id: "dragged",
      payload: expect.objectContaining({ position: 2 }),
    });
    wrapper.unmount();
  });

  it("publishes WordPress for a Radar position and emits the returned posts", async () => {
    const posts = [
      { position: 1, wpPostId: 23, link: "https://wordpress.test/radar-1", title: "Radar 1" },
    ];
    createWpPosts.mockResolvedValueOnce({ posts });
    const wrapper = mountList();
    await flushPromises();

    await wrapper.get('button[aria-label="Crear WordPress del Radar 1"]').trigger("click");
    await flushPromises();

    expect(createWpPosts).toHaveBeenCalledWith("list-1", 1);
    expect(wrapper.emitted("wp-published")?.[0]).toEqual([posts]);
    wrapper.unmount();
  });

  it("persists assignment completion and editorial metadata through Radar mutations", async () => {
    getAsignationsByListService.mockResolvedValue([makeAsignation("editable", 1)]);
    const wrapper = mountList();
    await flushPromises();

    const validateButton = wrapper.get('[aria-label="Validar Disc editable"]');
    expect(validateButton.attributes("aria-pressed")).toBe("false");
    await validateButton.trigger("click");
    await flushPromises();
    expect(
      wrapper.get('[aria-label="Desmarcar Disc editable como validado"]').attributes("aria-pressed")
    ).toBe("true");
    expect(radarMutations.updateAssignment).toHaveBeenCalledWith({
      id: "editable",
      payload: expect.objectContaining({ done: true }),
    });
    await wrapper.get('[aria-label="Desmarcar Disc editable como validado"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[aria-label="Validar Disc editable"]').attributes("aria-pressed")).toBe(
      "false"
    );
    expect(radarMutations.updateAssignment).toHaveBeenLastCalledWith({
      id: "editable",
      payload: expect.objectContaining({ done: false }),
    });

    await wrapper.get('[aria-label="Editar disco Disc editable"]').trigger("click");
    wrapper.findComponent({ name: "DiscDescriptionModal" }).vm.$emit("submit", {
      description: "Notas",
      similarBands: "Banda",
      spotifyTrackId: "track-1",
      genre: "Rock",
    });
    await flushPromises();
    expect(radarMutations.updateAssignment).toHaveBeenLastCalledWith({
      id: "editable",
      payload: expect.objectContaining({
        description: "Notas",
        similarBands: "Banda",
        spotifyTrackId: "track-1",
        genre: "Rock",
      }),
    });
    wrapper.unmount();
  });

  it("offers mobile Radar navigation with occupancy, the tray, and a direct Nuevo Radar action", async () => {
    getAsignationsByListService.mockResolvedValue([
      makeAsignation("one", 1),
      makeAsignation("inbox", 0),
    ]);
    const wrapper = mountList();
    await flushPromises();

    expect(wrapper.find('[aria-label="Navegación de asignaciones Radar"]').text()).toContain(
      "Radar 1 · 1/4"
    );
    expect(wrapper.find('[aria-label="Navegación de asignaciones Radar"]').text()).toContain(
      "Bandeja · 1"
    );
    const radarTwo = wrapper
      .findAll("nav button")
      .find((button) => button.text().includes("Radar 2"))!;
    await radarTwo.trigger("click");
    expect(radarTwo.attributes("aria-pressed")).toBe("true");

    await wrapper.get(".radar-mobile-new").trigger("click");
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3"]);
    expect(
      wrapper
        .findAll("nav button")
        .find((button) => button.text().includes("Radar 3"))!
        .attributes("aria-pressed")
    ).toBe("true");
    wrapper.unmount();
  });

  it("keeps the assignee, edit action, and done control together in the mobile control group", async () => {
    getAsignationsByListService.mockResolvedValue([makeAsignation("one", 1)]);
    const wrapper = mountList();
    await flushPromises();

    const controls = wrapper.get(".radar-editorial-controls");
    expect(controls.find(".radar-assignee-control").attributes("aria-label")).toBe(
      "Cambiar usuario asignado a Disc one"
    );
    expect(controls.find(".radar-edit-control").attributes("aria-label")).toBe(
      "Editar disco Disc one"
    );
    expect(controls.find(".radar-validate-control").attributes("aria-label")).toBe(
      "Validar Disc one"
    );
    expect(controls.find(".radar-validate-control").attributes("aria-pressed")).toBe("false");
    expect(controls.find(".radar-edit-control").text()).toContain("Editar");
    wrapper.unmount();
  });

  it("places Spotify under the cover and keeps title, artist, genre and country together", async () => {
    const record = makeAsignation("details", 1);
    record.disc.image = "https://images.test/cover.jpg";
    record.disc.name = "A Very Long Album Title That Must Remain Discoverable";
    record.disc.artist.name = "A Long Artist Name With Several Words";
    Object.assign(record.disc.artist, { country: { name: "United States", isoCode: "us" } });
    Object.assign(record.disc, {
      genre: { id: "genre-1", name: "Progressive Experimental Rock", color: "#4b5563" },
      link: "https://open.spotify.com/album/album-1",
    });
    getAsignationsByListService.mockResolvedValue([record]);
    const wrapper = mountList();
    await flushPromises();

    const card = wrapper.get(".radar-assignment-card[draggable='true']");
    expect(card.classes()).toContain("self-center");
    expect(card.classes()).toContain("w-full");
    const cover = card.get(".radar-card-cover");
    const spotify = cover.get(
      'button[aria-label="Abrir A Very Long Album Title That Must Remain Discoverable en Spotify"]'
    );
    const title = card.get(".radar-assignment-title");
    expect(cover.get("img").attributes("src")).toBe("https://images.test/cover.jpg");
    expect(spotify.exists()).toBe(true);
    expect(
      spotify.element.compareDocumentPosition(title.element) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(title.attributes("title")).toBe("A Very Long Album Title That Must Remain Discoverable");
    expect(spotify.attributes("data-album-url")).toBe("https://open.spotify.com/album/album-1");
    expect(card.get(".radar-card-artist").attributes("title")).toBe(
      "A Long Artist Name With Several Words"
    );
    expect(card.get(".radar-card-genre").attributes("title")).toBe("Progressive Experimental Rock");
    expect(card.get('.radar-card-country[aria-label="País: United States"]').exists()).toBe(true);
    expect(card.find('[aria-label^="Copiar"]').exists()).toBe(false);
    expect(card.find('[title^="Copiar"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("places delete directly beside the move selector and asks before deleting", async () => {
    getAsignationsByListService.mockResolvedValue([makeAsignation("delete-me", 1)]);
    const wrapper = mountList();
    await flushPromises();

    const card = wrapper.get(".radar-assignment-card[draggable='true']");
    const moveSelect = card.get('[aria-label="Mover Disc delete-me a otro Radar o a la bandeja"]');
    const deleteButton = card.get('[aria-label="Eliminar asignación de Disc delete-me"]');
    expect(moveSelect.element.nextElementSibling).toBe(deleteButton.element);

    await deleteButton.trigger("click");
    await flushPromises();
    expect(confirm).toHaveBeenCalledWith(
      '¿Eliminar la asignación de "Disc delete-me"?',
      "Esta acción no se puede deshacer.",
      "Sí, eliminar",
      "Cancelar"
    );
    expect(radarMutations.removeAssignment).toHaveBeenCalledWith("delete-me");
    wrapper.unmount();
  });

  it("does not delete an assignment when deletion is cancelled", async () => {
    confirm.mockResolvedValueOnce({ isConfirmed: false });
    getAsignationsByListService.mockResolvedValue([makeAsignation("keep-me", 1)]);
    const wrapper = mountList();
    await flushPromises();

    await wrapper.get('[aria-label="Eliminar asignación de Disc keep-me"]').trigger("click");
    await flushPromises();
    expect(radarMutations.removeAssignment).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("keeps the close control distinct from deleting: it moves the card to the tray", async () => {
    getAsignationsByListService.mockResolvedValue([makeAsignation("move-to-tray", 1)]);
    const wrapper = mountList();
    await flushPromises();

    await wrapper.get('[aria-label="Mover Disc move-to-tray a la bandeja"]').trigger("click");
    expect(radarMutations.updateAssignment).toHaveBeenCalledWith({
      id: "move-to-tray",
      payload: expect.objectContaining({ position: 0 }),
    });
    expect(radarMutations.removeAssignment).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("keeps Spotify, editorial controls, move and delete available on tray cards", async () => {
    getAsignationsByListService.mockResolvedValue([makeAsignation("tray-card", 0)]);
    const wrapper = mountList();
    await flushPromises();

    const card = wrapper.get(".radar-assignment-card[draggable='true']");
    expect(
      card.get('.radar-card-cover button[aria-label="Abrir Disc tray-card en Spotify"]').exists()
    ).toBe(true);
    expect(card.get('[aria-label="Cambiar usuario asignado a Disc tray-card"]').exists()).toBe(
      true
    );
    expect(card.get('[aria-label="Editar disco Disc tray-card"]').text()).toContain("Editar");
    expect(card.get('[aria-label="Validar Disc tray-card"]').exists()).toBe(true);
    const moveSelect = card.get('[aria-label="Mover Disc tray-card a un Radar"]');
    const deleteButton = card.get('[aria-label="Eliminar asignación de Disc tray-card"]');
    expect(moveSelect.element.nextElementSibling).toBe(deleteButton.element);
    expect(card.find('[aria-label="Mover Disc tray-card a la bandeja"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("moves an assignment from the mobile card selector without drag and drop", async () => {
    const inbox = makeAsignation("inbox", 0);
    getAsignationsByListService.mockResolvedValue([inbox]);
    const wrapper = mountList();
    await flushPromises();

    const destination = wrapper.get('[aria-label="Mover Disc inbox a un Radar"]');
    await destination.setValue("2");
    await flushPromises();

    expect(radarMutations.updateAssignment).toHaveBeenCalledWith({
      id: "inbox",
      payload: expect.objectContaining({ position: 2 }),
    });
    wrapper.unmount();
  });

  it("moves a Radar assignment back to position zero from its card selector", async () => {
    const assigned = makeAsignation("assigned", 1);
    getAsignationsByListService.mockResolvedValue([assigned]);
    const wrapper = mountList();
    await flushPromises();

    const destination = wrapper.get(
      '[aria-label="Mover Disc assigned a otro Radar o a la bandeja"]'
    );
    await destination.setValue("0");
    await flushPromises();

    expect(radarMutations.updateAssignment).toHaveBeenCalledWith({
      id: "assigned",
      payload: expect.objectContaining({ position: 0 }),
    });
    expect(
      wrapper
        .findAll("nav button")
        .find((button) => button.text().includes("Bandeja"))!
        .attributes("aria-pressed")
    ).toBe("true");
    wrapper.unmount();
  });

  it("disables a full Radar in the touch movement selector", async () => {
    getAsignationsByListService.mockResolvedValue([
      ...[1, 2, 3, 4].map((id) => makeAsignation(String(id), 1)),
      makeAsignation("inbox", 0),
    ]);
    const wrapper = mountList();
    await flushPromises();

    const selector = wrapper.get('[aria-label="Mover Disc inbox a un Radar"]');
    expect(selector.find('option[value="1"]').attributes("disabled")).toBeDefined();
    await selector.setValue("1");
    expect(radarMutations.updateAssignment).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("keeps all persisted Radar headings and drag/drop-enabled desktop panels", async () => {
    getAsignationsByListService.mockResolvedValue([makeAsignation("three", 3)]);
    const wrapper = mountList();
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3"]);
    expect(wrapper.findAll('[draggable="true"]').length).toBeGreaterThan(0);
    expect(wrapper.findAll(".radar-mobile-inactive")).toHaveLength(3);
    wrapper.unmount();
  });

  it("keeps a manually added empty group when assignment data updates", async () => {
    const wrapper = mountList();
    await newRadarButton(wrapper).trigger("click");
    queryClient.setQueryData(
      radarDetailQueryKeys.assignments({ userId: "editor", generation: 2 }, "list-1"),
      [makeAsignation("inbox", 0)]
    );
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
    expect(radarMutations.updateAssignment).toHaveBeenCalledWith({
      id: "inbox",
      payload: expect.objectContaining({ position: 3 }),
    });
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
    expect(radarMutations.updateAssignment).not.toHaveBeenCalled();
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
    queryClient.setQueryData(
      radarDetailQueryKeys.assignments({ userId: "editor", generation: 2 }, "list-1"),
      [makeAsignation("one", 1), makeAsignation("three", 3)]
    );
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3"]);
    expect(wrapper.text()).toContain("Disc three");
    wrapper.unmount();
  });

  it("keeps query-backed persisted gaps and local panels through invalidation, then drops only local panels on remount", async () => {
    getAsignationsByListService.mockResolvedValue([
      makeAsignation("one", 1),
      makeAsignation("four", 4),
    ]);
    const wrapper = mountList();
    await vi.waitFor(() => expect(getAsignationsByListService).toHaveBeenCalledOnce());
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3", "Radar 4"]);

    await newRadarButton(wrapper).trigger("click");
    await queryClient.invalidateQueries({
      queryKey: radarDetailQueryKeys.assignments({ userId: "editor", generation: 2 }, "list-1"),
    });
    await flushPromises();
    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2", "Radar 3", "Radar 4", "Radar 5"]);
    wrapper.unmount();

    const reloaded = mountList();
    await flushPromises();
    expect(radarHeadings(reloaded)).toEqual(["Radar 1", "Radar 2", "Radar 3", "Radar 4"]);
    reloaded.unmount();
  });

  it("resets local panels when the selected Radar changes", async () => {
    getAsignationsByListService.mockImplementation((listId: string) =>
      Promise.resolve([makeAsignation(`position-${listId}`, listId === "list-1" ? 4 : 1)])
    );
    const wrapper = mountList();
    await vi.waitFor(() => expect(getAsignationsByListService).toHaveBeenCalledOnce());
    await flushPromises();
    expect(radarHeadings(wrapper)).toHaveLength(4);

    await newRadarButton(wrapper).trigger("click");
    expect(radarHeadings(wrapper)).toHaveLength(5);
    await wrapper.setProps({ listId: "list-2" });
    await vi.waitFor(() => expect(getAsignationsByListService).toHaveBeenCalledTimes(2));
    await flushPromises();

    expect(radarHeadings(wrapper)).toEqual(["Radar 1", "Radar 2"]);
    wrapper.unmount();
  });
});
