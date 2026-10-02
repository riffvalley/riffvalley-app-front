// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, shallowMount } from "@vue/test-utils";
import DiscDescriptionModal from "../../../../src/views/list/components/DiscDescriptionModal.vue";
import AsignationList from "../../../../src/views/list/components/AsignationList.vue";
import { asignationTextUpdateKey } from "../../../../src/modules/editorial/asignations/presentation/asignationTextUpdateKey";
import { listWordPressPublicationKey } from "../../../../src/modules/editorial/lists/presentation/listWordPressPublicationKey";
import type { AsignationTextUpdatePort } from "../../../../src/modules/editorial/asignations/application/asignationTextUpdatePort";

const { updateAsignationText, store, users, success, error } = vi.hoisted(() => {
  const asignations: Array<{ id: string; [key: string]: unknown }> = [];
  return {
    updateAsignationText: vi.fn(),
    store: {
      asignations,
      applyAsignationUpdateLocally: vi.fn((updated: Record<string, unknown>) => {
        const index = asignations.findIndex((item) => item.id === updated.id);
        if (index !== -1) Object.assign(asignations[index], updated);
      }),
      updateAsignationStore: vi.fn(),
      removeAsignation: vi.fn(),
    },
    users: { usersRv: [], loadRvUsers: vi.fn() },
    success: vi.fn(),
    error: vi.fn(),
  };
});

vi.mock("@stores/asignation/asignation", () => ({ useAsignationStore: () => store }));
vi.mock("@stores/user/users", () => ({ useUserStore: () => users }));
vi.mock("@services/swal/SwalService", () => ({ default: { success, error } }));
vi.mock("@services/discs/discs", () => ({ getDiscSpotifyTracks: vi.fn().mockResolvedValue([]) }));
vi.mock("@services/languagetool/languagetool", () => ({ checkSpelling: vi.fn().mockResolvedValue([]) }));
vi.mock("@vueup/vue-quill", () => ({ QuillEditor: { template: "<div />" } }));

const asignation = {
  id: "asignation-1",
  description: "<p>Texto actual</p>",
  similarBands: "Bandas similares",
  spotifyTrackId: "track-1",
  genre: "Rock",
  disc: { id: "disc-1", name: "Disco", artist: { name: "Artista" }, genre: { name: "Rock" } },
};

function mountModal() {
  return mount(DiscDescriptionModal, {
    props: { asignation },
    global: { stubs: { Teleport: true } },
  });
}

afterEach(() => {
  vi.clearAllMocks();
  store.asignations.splice(0, store.asignations.length);
});

describe("DiscDescriptionModal Editorial update flow", () => {
  it("submits the existing text payload through the composed port and preserves success state", async () => {
    const modal = mountModal();
    await modal.find(".modal-btn-primary").trigger("click");
    await flushPromises();
    const payload = modal.emitted("submit")?.[0]?.[0];
    expect(payload).toEqual({
      description: "<p>Texto actual</p>",
      similarBands: "Bandas similares",
      spotifyTrackId: "track-1",
      genre: "Rock",
    });

    const port: AsignationTextUpdatePort = { updateAsignationText };
    updateAsignationText.mockResolvedValue(undefined);
    const host = shallowMount(AsignationList, {
      props: { type: "week", listId: "list-1" },
      global: { provide: {
        [asignationTextUpdateKey as symbol]: port,
        [listWordPressPublicationKey as symbol]: { publishRadarPosts: vi.fn(), publishBestDiscsList: vi.fn() },
      }, stubs: { CircleFlags: true } },
    });
    host.vm.openDescriptionModal(asignation);
    await host.vm.handleSaveDescription(payload as Parameters<AsignationTextUpdatePort["updateAsignationText"]>[1]);

    expect(updateAsignationText).toHaveBeenCalledWith("asignation-1", payload);
    expect(store.updateAsignationStore).not.toHaveBeenCalled();
    expect(store.applyAsignationUpdateLocally).toHaveBeenCalledWith({ id: "asignation-1", ...payload });
    expect(host.vm.savingDescription).toBe(false);
    expect(success).toHaveBeenCalledWith("Disco actualizado");
    expect(host.vm.editingAsignation).toBeNull();
    host.unmount();
    modal.unmount();
  });

  it("preserves the existing error message and closes after a failed save", async () => {
    const port: AsignationTextUpdatePort = { updateAsignationText };
    updateAsignationText.mockRejectedValue(new Error("offline"));
    const host = shallowMount(AsignationList, {
      props: { type: "week", listId: "list-1" },
      global: { provide: {
        [asignationTextUpdateKey as symbol]: port,
        [listWordPressPublicationKey as symbol]: { publishRadarPosts: vi.fn(), publishBestDiscsList: vi.fn() },
      }, stubs: { CircleFlags: true } },
    });
    host.vm.openDescriptionModal(asignation);
    await host.vm.handleSaveDescription({
      description: "Texto",
      similarBands: "",
      spotifyTrackId: "",
      genre: "",
    });

    expect(store.applyAsignationUpdateLocally).not.toHaveBeenCalled();
    expect(host.vm.savingDescription).toBe(false);
    expect(error).toHaveBeenCalledWith("No se pudo guardar (revisa si se sincronizó con WordPress)");
    expect(host.vm.editingAsignation).toBeNull();
    host.unmount();
  });
});
