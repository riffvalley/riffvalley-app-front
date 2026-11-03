// @vitest-environment happy-dom
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api";
import type { EventImportConflictPresentation } from "../../application/eventImportConflicts";
import EventImportConflictDetails from "./EventImportConflictDetails.vue";

vi.mock("@services/api/api", () => ({ default: { get: vi.fn() } }));

const eventA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const eventB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function conflict(
  overrides: Partial<EventImportConflictPresentation> = {}
): EventImportConflictPresentation {
  return {
    operationId: "batch-id",
    rowKey: "row-a",
    operationRowId: "operation-a",
    snapshotRevision: 3,
    status: "historical",
    code: "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT",
    message: "El backend detectó una participación relacionada.",
    severity: "blocking",
    kind: "participation",
    snapshot: {
      rowId: "operation-a",
      type: "concert",
      startDate: "2027-05-15",
      city: "Madrid",
      venue: "La Riviera",
      lineup: [{ name: "Septicflesh", artistId: "artist-s" }],
    },
    relatedRows: [],
    existingEventIds: [eventA],
    candidateEventIds: [eventA, eventB],
    eventReferences: [
      { eventId: eventA, status: "identified" },
      { eventId: eventB, status: "candidate" },
    ],
    matchingArtists: [{ artistId: "artist-s", name: "Septicflesh" }],
    addableArtists: [{ artistId: null, name: "Equilibrium" }],
    ...overrides,
  };
}

function mountDetails(
  input: EventImportConflictPresentation[] | EventImportConflictPresentation[][]
) {
  const groups = Array.isArray(input[0])
    ? (input as EventImportConflictPresentation[][])
    : [input as EventImportConflictPresentation[]];
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Host = defineComponent({
    setup() {
      return () =>
        h(
          "div",
          groups.map((conflicts, index) =>
            h(EventImportConflictDetails, {
              conflicts,
              rowNumber: index + 1,
              rowNumbers: { "row-a": 1 },
              showIndicator: false,
              showDetails: true,
              expanded: true,
            })
          )
        );
    },
  });
  const wrapper = mount(Host, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
  return { wrapper, queryClient };
}

afterEach(() => vi.restoreAllMocks());

describe("EventImportConflictDetails", () => {
  it("shows a historical snapshot, confirmed event and unselected candidates with fetched comparison", async () => {
    vi.spyOn(api, "get").mockImplementation(
      async (url) =>
        ({
          data: {
            id: String(url).endsWith(eventA) ? eventA : eventB,
            type: "concert",
            startDate: "2027-05-15",
            endDate: null,
            venue: { name: "La Riviera", locality: { name: "Madrid", province: "Madrid" } },
            lineup: [{ artistId: "artist-s", name: "Septicflesh" }],
          },
        }) as never
    );
    const { wrapper, queryClient } = mountDetails([conflict()]);
    await flushPromises();

    expect(wrapper.text()).toContain("histórico de una revisión anterior");
    expect(wrapper.text()).toContain("snapshot enviado");
    expect(wrapper.text()).toContain("Evento existente identificado");
    expect(wrapper.text()).toContain("Candidato posible · sin seleccionar");
    expect(wrapper.text()).toContain(eventA);
    expect(wrapper.text()).toContain(eventB);
    expect(wrapper.text()).toContain("Septicflesh");
    expect(wrapper.text()).toContain("Equilibrium");
    expect(wrapper.text()).toContain("no modifica el evento");
    expect(
      wrapper.findAll("button").some((button) => /seleccionar|ampliar|añadir/i.test(button.text()))
    ).toBe(false);
    expect(api.get).toHaveBeenCalledTimes(2);
    wrapper.unmount();
    queryClient.clear();
  });

  it("keeps the conflict visible when contextual detail reads fail", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("detail unavailable"));
    const { wrapper, queryClient } = mountDetails([
      conflict({ message: "Conflicto que permanece aunque falle Events." }),
    ]);
    await flushPromises();

    expect(wrapper.text()).toContain("Conflicto que permanece aunque falle Events.");
    expect(wrapper.text()).toContain("El conflicto y el UUID siguen disponibles.");
    expect(wrapper.text()).toContain("Reintentar consulta del evento");
    wrapper.unmount();
    queryClient.clear();
  });

  it("reports an empty candidate result without manufacturing an event", async () => {
    const { wrapper, queryClient } = mountDetails([
      conflict({ existingEventIds: [], candidateEventIds: [], eventReferences: [] }),
    ]);
    await flushPromises();
    expect(wrapper.text()).toContain("El backend no devolvió candidatos de evento.");
    expect(api.get).not.toHaveBeenCalled();
    wrapper.unmount();
    queryClient.clear();
  });

  it("renders a valid UUID-only detail as incomplete context", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ data: { id: eventA } } as never);
    const { wrapper, queryClient } = mountDetails([
      conflict({
        existingEventIds: [eventA],
        candidateEventIds: [],
        eventReferences: [{ eventId: eventA, status: "identified" }],
      }),
    ]);
    await flushPromises();

    expect(wrapper.text()).toContain("No disponible");
    expect(wrapper.text()).toContain("No disponible en el detalle de Events");
    expect(wrapper.text()).not.toContain("No se pudo cargar el detalle");
    wrapper.unmount();
    queryClient.clear();
  });

  it("reuses the cached detail when two conflicts reference the same event UUIDs", async () => {
    vi.spyOn(api, "get").mockImplementation(
      async (url) =>
        ({
          data: {
            id: String(url).endsWith(eventA) ? eventA : eventB,
            type: "festival",
            startDate: "2027-05-15",
            venue: { name: "Recinto", locality: { name: "Madrid" } },
            lineup: [],
          },
        }) as never
    );
    const secondConflict = conflict({
      rowKey: "row-b",
      operationRowId: "operation-b",
      message: "Second conflict snapshot",
      snapshot: {
        rowId: "operation-b",
        type: "festival",
        name: "Festival del snapshot",
        startDate: "2027-05-15",
        city: "Madrid",
      },
    });
    const { wrapper, queryClient } = mountDetails([[conflict()], [secondConflict]]);
    await flushPromises();

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Second conflict snapshot");
    wrapper.unmount();
    queryClient.clear();
  });
});
