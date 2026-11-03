// @vitest-environment happy-dom
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api";
import type { EventImportConflictPresentation } from "../../application/eventImportConflicts";
import EventImportConflictDetails from "./EventImportConflictDetails.vue";

vi.mock("@services/api/api", () => ({ default: { get: vi.fn() } }));

const eventA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const artistId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function conflict(
  overrides: Partial<EventImportConflictPresentation> = {}
): EventImportConflictPresentation {
  return {
    operationId: "batch-id",
    rowKey: "row-a",
    operationRowId: "operation-a",
    snapshotRevision: 3,
    countryId: "country-id",
    status: "current",
    code: "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT",
    message: "Internal conflict message",
    severity: "blocking",
    kind: "participation",
    snapshot: {
      rowId: "operation-a",
      type: "concert",
      startDate: "2027-05-15",
      city: "Madrid",
      venue: "La Riviera",
      lineup: [{ name: "Septicflesh", artistId }],
    },
    relatedRows: [],
    existingEventIds: [eventA],
    candidateEventIds: [],
    eventReferences: [{ eventId: eventA, status: "identified" }],
    matchingArtists: [{ artistId, name: "Septicflesh" }],
    addableArtists: [{ artistId: null, name: "Vianova" }],
    ...overrides,
  };
}

function mountDetails(
  input: EventImportConflictPresentation[] | EventImportConflictPresentation[][],
  options: { canExpand?: boolean; showIndicator?: boolean; expanded?: boolean } = {}
) {
  const groups = Array.isArray(input[0])
    ? (input as EventImportConflictPresentation[][])
    : [input as EventImportConflictPresentation[]];
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const expanded = ref(options.expanded ?? true);
  const Host = defineComponent({
    setup() {
      return () =>
        h(
          "div",
          groups.map((conflicts, index) =>
            h(EventImportConflictDetails, {
              conflicts,
              rowNumber: index + 1,
              rowNumbers: { "row-a": 1, "row-related": 8 },
              showIndicator: options.showIndicator ?? false,
              showDetails: true,
              expanded: expanded.value,
              canReviewLineupExpansion: () => options.canExpand ?? false,
              prepareLineupExpansion: () => null,
              getExpansionConfirmation: () => null,
              setExpansionConfirmation: () => undefined,
              getExpansionSelection: () => null,
              setExpansionSelection: () => undefined,
              getExpansionExecution: () => null,
            })
          )
        );
    },
  });
  const wrapper = mount(Host, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
  return { wrapper, queryClient, setExpanded: (value: boolean) => (expanded.value = value) };
}

afterEach(() => vi.restoreAllMocks());

describe("EventImportConflictDetails", () => {
  it("records conflict disclosure mount and opening cost without a time threshold", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: {
        id: eventA,
        type: "concert",
        name: "Evento",
        startDate: "2027-05-15",
        endDate: null,
        venue: { name: "La Riviera", locality: { name: "Madrid" } },
        lineup: [{ artistId, name: "Septicflesh" }],
      },
    } as never);
    const startedAt = performance.now();
    const { wrapper, queryClient, setExpanded } = mountDetails([conflict()], {
      showIndicator: true,
      expanded: false,
    });
    const mountMs = Number((performance.now() - startedAt).toFixed(1));
    const openedAt = performance.now();
    await wrapper.get("button").trigger("click");
    setExpanded(true);
    await flushPromises();
    const openMs = Number((performance.now() - openedAt).toFixed(1));

    expect(wrapper.get("button").attributes("aria-expanded")).toBe("true");
    expect(api.get).toHaveBeenCalledTimes(1);
    console.info("EVENT_IMPORT_CONFLICT_PERFORMANCE", JSON.stringify({ mountMs, openMs }));
    wrapper.unmount();
    queryClient.clear();
  });

  it("identifies an existing event compactly without exposing technical identifiers or codes", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: {
        id: eventA,
        type: "concert",
        name: null,
        startDate: "2027-05-15",
        endDate: null,
        venue: { name: "La Riviera", locality: { name: "Madrid" } },
        lineup: [{ artistId, name: "Septicflesh" }],
      },
    } as never);
    const { wrapper, queryClient } = mountDetails([conflict()]);
    await flushPromises();

    expect(wrapper.text()).toContain("15/05/2027 · La Riviera, Madrid");
    expect(wrapper.text()).toContain("Ya participan: Septicflesh");
    expect(wrapper.text()).toContain("Añadir: Vianova");
    expect(wrapper.text()).toContain("Septicflesh");
    expect(wrapper.text()).not.toContain("UUID");
    expect(wrapper.text()).not.toContain(eventA);
    expect(wrapper.text()).not.toContain(artistId);
    expect(wrapper.text()).not.toContain("CONCERT_ARTIST_DATE_LOCALITY_CONFLICT");
    expect(wrapper.text()).not.toContain("Internal conflict message");
    expect(wrapper.find("table").exists()).toBe(false);
    wrapper.unmount();
    queryClient.clear();
  });

  it("keeps a recoverable conflict message when the event detail cannot be loaded", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("detail unavailable"));
    const { wrapper, queryClient } = mountDetails([conflict()]);
    await flushPromises();

    expect(wrapper.text()).not.toContain("Este artista ya participa en un concierto");
    expect(wrapper.text()).toContain("No se pudieron consultar los datos del concierto.");
    expect(wrapper.text()).toContain("Reintentar");
    expect(wrapper.text()).not.toContain(eventA);
    wrapper.unmount();
    queryClient.clear();
  });

  it("does not invent an event when the response has no candidates", async () => {
    const { wrapper, queryClient } = mountDetails([
      conflict({ existingEventIds: [], candidateEventIds: [], eventReferences: [] }),
    ]);
    await flushPromises();
    expect(wrapper.text()).toContain(
      "No hay un concierto identificado con la información disponible."
    );
    expect(api.get).not.toHaveBeenCalled();
    wrapper.unmount();
    queryClient.clear();
  });

  it("does not present a text-only artist match as confirmed identity", async () => {
    const { wrapper, queryClient } = mountDetails([
      conflict({ matchingArtists: [{ artistId: null, name: "Septicflesh" }] }),
    ]);
    expect(wrapper.text()).not.toContain("Hay un posible conflicto de participación.");
    expect(wrapper.text()).not.toContain("Este artista ya participa");
    wrapper.unmount();
    queryClient.clear();
  });

  it("does not combine a historical conflict with current event details", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: { id: eventA, startDate: "2027-05-15" },
    } as never);
    const { wrapper, queryClient } = mountDetails([conflict({ status: "historical" })]);
    await flushPromises();
    expect(wrapper.text()).toBe("Esta propuesta anterior no permite ampliar el lineup.");
    expect(api.get).not.toHaveBeenCalled();
    wrapper.unmount();
    queryClient.clear();
  });

  it("offers compact navigation to related rows without rendering their internal identities", async () => {
    const { wrapper, queryClient } = mountDetails([
      conflict({
        relatedRows: [
          {
            operationRowId: "internal-operation",
            rowKey: "row-related",
            snapshotRevision: 1,
            available: true,
          },
        ],
      }),
    ]);
    const button = wrapper.get("button");
    expect(button.text()).toBe("Ir a la fila 8");
    expect(wrapper.text()).not.toContain("internal-operation");
    expect(wrapper.text()).not.toContain("row-related");
    wrapper.unmount();
    queryClient.clear();
  });

  it("reports the expanded state accurately to assistive technology", () => {
    const collapsed = mountDetails([conflict()], { showIndicator: true, expanded: false });
    expect(collapsed.wrapper.get("button").attributes("aria-expanded")).toBe("false");
    expect(collapsed.wrapper.get("button").attributes("aria-controls")).toBe(
      "event-import-conflicts-row-a"
    );
    expect(
      collapsed.wrapper.get("#event-import-conflicts-row-a").attributes("hidden")
    ).toBeDefined();
    collapsed.wrapper.unmount();
    collapsed.queryClient.clear();

    const expanded = mountDetails([conflict()], { showIndicator: true, expanded: true });
    expect(expanded.wrapper.get("button").attributes("aria-expanded")).toBe("true");
    expanded.wrapper.unmount();
    expanded.queryClient.clear();
  });

  it("does not show a technical review toggle for an expandable conflict", async () => {
    const { wrapper, queryClient } = mountDetails([conflict()], { canExpand: true });
    expect(wrapper.text()).not.toContain("Revisar ampliación de lineup");
    wrapper.unmount();
    queryClient.clear();
  });
});
