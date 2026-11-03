// @vitest-environment happy-dom
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { shallowRef } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api";
import type { EventImportConflictPresentation } from "../../application/eventImportConflicts";
import type { LineupExpansionPreparation } from "../../application/eventLineupExpansionPreparation";
import EventLineupExpansionReview from "./EventLineupExpansionReview.vue";

vi.mock("@services/api/api", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const eventA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const eventB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const artistA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const conflict: EventImportConflictPresentation = {
  operationId: "batch-id",
  rowKey: "row-a",
  operationRowId: "operation-a",
  snapshotRevision: 3,
  countryId: "country-id",
  status: "current",
  code: "CONCERT_DUPLICATE",
  message: "Internal conflict",
  severity: "review",
  kind: "duplicate",
  snapshot: {
    rowId: "operation-a",
    type: "concert",
    startDate: "2027-05-15",
    city: "Madrid",
    lineup: [{ name: "Meshuggah", artistId: artistA }, { name: "Vianova" }],
  },
  relatedRows: [],
  existingEventIds: [],
  candidateEventIds: [eventA, eventB],
  eventReferences: [
    { eventId: eventA, status: "candidate" },
    { eventId: eventB, status: "candidate" },
  ],
  matchingArtists: [{ artistId: artistA, name: "Meshuggah" }],
  addableArtists: [{ artistId: null, name: "Vianova" }],
};

function ready(eventId: string): LineupExpansionPreparation {
  return {
    state: "ready",
    pendingReasons: [],
    snapshot: {
      kind: "event-lineup-expansion",
      correlation: {} as never,
      operation: { batchId: "batch-id", rowId: `operation-${eventId}` },
      eventId,
      payload: { artists: [{ name: "Vianova" }] } as never,
    },
  };
}

function eventDetail(id: string) {
  const isA = id === eventA;
  return {
    id,
    type: "concert",
    name: isA ? "Noche A" : "Noche B",
    startDate: isA ? "2027-05-15" : "2027-06-20",
    venue: {
      name: isA ? "La Riviera" : "Palacio Vistalegre",
      locality: { name: isA ? "Madrid" : "Madrid" },
    },
    lineup: [{ artistId: artistA, name: "Meshuggah" }],
  };
}

afterEach(() => vi.restoreAllMocks());

describe("EventLineupExpansionReview", () => {
  it("requires destination selection and uses one explicit action to confirm and execute", async () => {
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      const id = String(url).endsWith(eventA) ? eventA : eventB;
      return { data: eventDetail(id) } as never;
    });
    const prepare = vi.fn((selectedEventId?: string) =>
      selectedEventId ? ready(selectedEventId) : null
    );
    const savedConfirmation = shallowRef<string | null>(null);
    const savedSelection = shallowRef<string | null>(null);
    const getConfirmation = () => savedConfirmation.value;
    const setConfirmation = (signature: string | null) => {
      savedConfirmation.value = signature;
    };
    const getSelection = () => savedSelection.value;
    const setSelection = (eventId: string | null) => {
      savedSelection.value = eventId;
    };
    const getExecution = () => null;
    const execute = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = mount(EventLineupExpansionReview, {
      props: {
        conflict,
        prepare,
        getConfirmation,
        setConfirmation,
        getSelection,
        setSelection,
        getExecution,
        execute,
      },
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    });
    await flushPromises();

    expect((wrapper.get("select").element as HTMLSelectElement).value).toBe("");
    expect(wrapper.get("select").text()).toContain("15/05/2027 · La Riviera, Madrid");
    expect(wrapper.get("select").text()).toContain("20/06/2027 · Palacio Vistalegre, Madrid");
    expect(wrapper.text()).not.toContain(eventA);
    expect(wrapper.text()).not.toContain(eventB);
    expect(wrapper.text()).not.toContain("UUID");
    expect(wrapper.find('[type="checkbox"]').exists()).toBe(false);

    await wrapper.get("select").setValue(eventA);
    await flushPromises();
    expect(savedSelection.value).toBe(eventA);
    expect(wrapper.text()).toContain("Ya participan");
    expect(wrapper.text()).toContain("Meshuggah");
    expect(wrapper.text()).toContain("Añadir");
    expect(wrapper.text()).toContain("Vianova");
    expect(wrapper.find("button").text()).toBe("Añadir al lineup");
    expect((wrapper.get("button").element as HTMLButtonElement).disabled).toBe(false);

    await wrapper.get("button").trigger("click");
    expect(savedConfirmation.value).toContain(eventA);
    expect(execute).toHaveBeenCalledWith(conflict, savedConfirmation.value);
    expect(api.post).not.toHaveBeenCalled();

    wrapper.unmount();
    queryClient.clear();
  });

  it("blocks indistinguishable candidates instead of choosing by list order", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: { type: "concert", startDate: "2027-05-15", lineup: [] },
    } as never);
    const prepare = vi.fn(() => null);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = mount(EventLineupExpansionReview, {
      props: {
        conflict,
        prepare,
        getConfirmation: () => null,
        setConfirmation: () => undefined,
        getSelection: () => null,
        setSelection: () => undefined,
        getExecution: () => null,
        execute: vi.fn(),
      },
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    });
    await flushPromises();
    expect((wrapper.get("select").element as HTMLSelectElement).value).toBe("");
    expect((wrapper.get("select").element as HTMLSelectElement).disabled).toBe(true);
    const describedBy = wrapper.get("select").attributes("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(wrapper.get(`[id="${describedBy}"]`).attributes("role")).toBe("status");
    expect(wrapper.text()).toContain(
      "No hay información suficiente para distinguir estos conciertos."
    );
    expect(prepare).not.toHaveBeenCalledWith(eventA);
    wrapper.unmount();
    queryClient.clear();
  });
});
