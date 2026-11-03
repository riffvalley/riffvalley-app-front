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

const conflict: EventImportConflictPresentation = {
  operationId: "batch-id",
  rowKey: "row-a",
  operationRowId: "operation-a",
  snapshotRevision: 3,
  countryId: "country-id",
  status: "current",
  code: "CONCERT_DUPLICATE",
  message: "Conflicto",
  severity: "review",
  kind: "duplicate",
  snapshot: {
    rowId: "operation-a",
    type: "concert",
    startDate: "2027-05-15",
    city: "Madrid",
    lineup: [{ name: "Septicflesh", artistId: "artist-s" }, { name: "Equilibrium" }],
  },
  relatedRows: [],
  existingEventIds: [],
  candidateEventIds: [eventA, eventB],
  eventReferences: [
    { eventId: eventA, status: "candidate" },
    { eventId: eventB, status: "candidate" },
  ],
  matchingArtists: [{ artistId: "artist-s", name: "Septicflesh" }],
  addableArtists: [{ artistId: null, name: "Equilibrium" }],
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
      payload: { artists: [{ name: "Equilibrium" }] } as never,
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("EventLineupExpansionReview", () => {
  it("requires explicit destination selection and confirmation, then invalidates it on destination change", async () => {
    vi.spyOn(api, "get").mockImplementation(
      async (url) =>
        ({
          data: {
            id: String(url).endsWith(eventA) ? eventA : eventB,
            type: "concert",
            name: "Concierto",
            startDate: "2027-05-15",
            venue: { name: "Sala", locality: { name: "Madrid" } },
            lineup: [{ artistId: "artist-s", name: "Septicflesh" }],
          },
        }) as never
    );
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
    expect(
      wrapper.findAll("button").some((button) => button.text().includes("Confirmar ampliación"))
    ).toBe(false);
    await wrapper.get("select").setValue(eventA);
    await flushPromises();
    expect(savedSelection.value).toBe(eventA);
    expect(wrapper.text()).toContain(eventA);
    expect(wrapper.text()).toContain("Lineup actual");
    expect(wrapper.text()).toContain("artista nuevo sin UUID");
    expect((wrapper.get('[type="checkbox"]').element as HTMLInputElement).checked).toBe(false);
    await wrapper.get('[type="checkbox"]').setValue(true);
    expect(wrapper.text()).toContain("Propuesta revisada; falta la confirmación explícita.");
    await wrapper.get("button").trigger("click");
    expect(wrapper.text()).toContain("Propuesta confirmada localmente");
    expect(savedConfirmation.value).toContain(eventA);
    expect(api.post).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    const runButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Ejecutar ampliación confirmada"));
    expect(runButton).toBeDefined();
    await runButton?.trigger("click");
    expect(execute).toHaveBeenCalledWith(conflict, savedConfirmation.value);
    expect(api.post).not.toHaveBeenCalled();

    wrapper.unmount();
    const reopened = mount(EventLineupExpansionReview, {
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
    expect(reopened.text()).toContain("Propuesta confirmada localmente");

    await reopened.get("select").setValue(eventB);
    await flushPromises();
    expect(savedSelection.value).toBe(eventB);
    expect(reopened.text()).not.toContain("Propuesta confirmada localmente");
    expect(savedConfirmation.value).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
    expect(prepare).toHaveBeenCalledWith(eventB);

    reopened.unmount();
    queryClient.clear();
  });
});
