// @vitest-environment happy-dom
import { ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorialAsignation } from "@services/asignation/asignation";
import BestAssignments from "./BestAssignments.vue";

const { updateAssignment, removeAssignment, confirm } = vi.hoisted(() => ({
  updateAssignment: vi.fn(),
  removeAssignment: vi.fn(),
  confirm: vi.fn(),
}));
const assignmentData = ref<EditorialAsignation[]>([]);
const usersData = ref([
  { id: "user-1", username: "Editor", image: null },
  { id: "user-2", username: "Second editor", image: null },
]);
vi.mock("../../application/bestDetailQueries", () => ({
  useBestAssignmentsQuery: () => ({
    data: assignmentData,
    isPending: ref(false),
    isError: ref(false),
    refetch: vi.fn(),
  }),
  useBestAssignableUsersQuery: () => ({ data: usersData }),
}));
vi.mock("../../application/useBestDetailMutations", () => ({
  useBestDetailMutations: () => ({ updateAssignment, removeAssignment, isPending: ref(false) }),
}));
vi.mock("@services/swal/SwalService", () => ({
  default: { error: vi.fn(), success: vi.fn(), confirm },
}));
vi.mock("@views/list/components/DiscDescriptionModal.vue", () => ({
  default: {
    props: ["asignation", "saving"],
    emits: ["close", "submit"],
    template:
      "<div data-testid=\"metadata-modal\"><button type=\"button\" @click=\"$emit('submit', { description: 'review', similarBands: 'band', spotifyTrackId: 'track', genre: 'Rock' })\">Guardar metadata</button></div>",
  },
}));

const assignment: EditorialAsignation = {
  id: "assignment-1",
  done: false,
  position: null,
  description: null,
  similarBands: null,
  spotifyTrackId: null,
  genre: null,
  user: { id: "user-1", username: "Editor", image: null },
  disc: {
    id: "disc-1",
    name: "A Long Album Title That Must Wrap Without Overflow",
    image: "cover.jpg",
    releaseDate: "2026-10-01",
    artist: {
      id: "artist-1",
      name: "A Long Artist Name",
      country: { id: "country-1", name: "España", isoCode: "ES" },
    },
    genre: { id: "genre-1", name: "Rock", color: "#123456" },
    country: null,
  },
};

describe("BestAssignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assignmentData.value = [{ ...assignment }];
    confirm.mockResolvedValue({ isConfirmed: true });
  });

  it("renders the Radar card identity with cover, Spotify, metadata and only Mejores actions", async () => {
    const wrapper = mount(BestAssignments, {
      props: { listId: "best-1" },
      global: {
        stubs: {
          CircleFlags: {
            props: ["country", "showFlagName"],
            template: '<svg data-testid="country-flag" :country="country" :class="$attrs.class" />',
          },
          DiscSpotifyButton: {
            template: '<button class="best-card-spotify" aria-label="Spotify">Spotify</button>',
          },
        },
      },
    });
    await flushPromises();
    expect(wrapper.find(".best-card-image img").attributes("src")).toBe("cover.jpg");
    expect(wrapper.get(".best-assignment-card").classes()).toContain("bg-white");
    expect(wrapper.get(".best-assignment-card").classes()).toContain("dark:bg-rv-darkSurface");
    expect(wrapper.emitted("assignment-count")).toEqual([[1]]);
    expect(wrapper.find(".best-card-spotify").exists()).toBe(true);
    expect(wrapper.get('[role="img"][aria-label="País: España"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="country-flag"]').attributes("country")).toBe("es");
    expect(wrapper.find(".best-card-title").text()).toContain("A Long Album Title");
    expect(wrapper.find(".best-card-artist").text()).toContain("A Long Artist Name");
    expect(wrapper.find(".best-card-genre").text()).toBe("Rock");
    expect(
      wrapper
        .get(
          '[aria-label="Cambiar usuario asignado a A Long Album Title That Must Wrap Without Overflow"]'
        )
        .text()
    ).toContain("Editor");
    expect(wrapper.find(".best-edit").text()).toContain("Editar");
    expect(wrapper.find(".best-validate i").exists()).toBe(true);
    expect(wrapper.find(".best-delete i").exists()).toBe(true);
    expect(wrapper.text()).not.toMatch(/Radar\s*\d|Mover a|Bandeja/);
    wrapper.unmount();
  });

  it("uses a country relation with an ISO code when the artist relation omits it", async () => {
    assignmentData.value = [
      {
        ...assignment,
        disc: {
          ...assignment.disc!,
          artist: {
            ...assignment.disc!.artist,
            country: { id: "country-name-only", name: "España" },
          },
          artistCountry: { id: "country-coded", name: "España", isoCode: "ES" },
        },
      },
    ];
    const wrapper = mount(BestAssignments, {
      props: { listId: "best-1" },
      global: { stubs: { CircleFlags: true, DiscSpotifyButton: true } },
    });
    await flushPromises();
    expect(wrapper.get(".best-card-country [country='es']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("updates validation, user and metadata through editorial mutations", async () => {
    const wrapper = mount(BestAssignments, {
      props: { listId: "best-1" },
      global: { stubs: { CircleFlags: true, DiscSpotifyButton: true } },
    });
    await flushPromises();
    await wrapper
      .get('[aria-label="Validar A Long Album Title That Must Wrap Without Overflow"]')
      .trigger("click");
    expect(updateAssignment).toHaveBeenCalledWith({ id: "assignment-1", payload: { done: true } });
    await wrapper
      .get(
        '[aria-label="Cambiar usuario asignado a A Long Album Title That Must Wrap Without Overflow"]'
      )
      .trigger("click");
    await wrapper
      .get('[aria-label="Usuario asignado a A Long Album Title That Must Wrap Without Overflow"]')
      .setValue("user-2");
    expect(updateAssignment).toHaveBeenLastCalledWith({
      id: "assignment-1",
      payload: { userId: "user-2" },
    });
    await wrapper.get(".best-edit").trigger("click");
    await wrapper.get('[data-testid="metadata-modal"] button').trigger("click");
    expect(updateAssignment).toHaveBeenLastCalledWith({
      id: "assignment-1",
      payload: {
        description: "review",
        similarBands: "band",
        spotifyTrackId: "track",
        genre: "Rock",
      },
    });
    wrapper.unmount();
  });

  it("asks for confirmation before removing an assignment", async () => {
    const wrapper = mount(BestAssignments, {
      props: { listId: "best-1" },
      global: { stubs: { CircleFlags: true, DiscSpotifyButton: true } },
    });
    await flushPromises();
    await wrapper
      .get(
        '[aria-label="Eliminar asignación de A Long Album Title That Must Wrap Without Overflow"]'
      )
      .trigger("click");
    await flushPromises();
    expect(confirm).toHaveBeenCalledOnce();
    expect(removeAssignment).toHaveBeenCalledWith("assignment-1");
    wrapper.unmount();
  });
});
