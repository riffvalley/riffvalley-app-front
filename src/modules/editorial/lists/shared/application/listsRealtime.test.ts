import { describe, expect, it } from "vitest";
import type { EditorialAsignation } from "@services/asignation/asignation";
import {
  changedAssignmentDiscIds,
  deduplicateListsEvents,
  formatListsToast,
} from "./listsRealtime";
import type { ListsDescriptiveChangeEvent } from "./listsEventsParser";

function change(
  action: ListsDescriptiveChangeEvent["action"],
  positions: Record<string, number | null> = {},
  overrides: Record<string, unknown> = {}
): ListsDescriptiveChangeEvent {
  const common = {
    type: "lists.invalidate" as const,
    version: 1 as const,
    reason: "change" as const,
    action,
    actor: { kind: "user" as const, id: "actor", displayName: "María" },
    assignee: { id: "assignee", displayName: "Carlos" },
    list: { id: "list", type: "week" as const },
    assignmentId: "assignment",
    discId: "disc",
    artistName: "Grupo 1",
    ...overrides,
  };
  if (action === "assignment.created") {
    return { ...common, newPosition: positions.newPosition ?? 0 } as ListsDescriptiveChangeEvent;
  }
  return {
    ...common,
    previousPosition: positions.previousPosition ?? 0,
    newPosition: positions.newPosition ?? 1,
  } as ListsDescriptiveChangeEvent;
}

describe("Lists realtime descriptions", () => {
  it("distinguishes the actor from the assigned user and safely handles missing identities", () => {
    expect(formatListsToast(change("assignment.created"))).toBe(
      "María ha asignado Grupo 1 a Carlos"
    );
    expect(
      formatListsToast(
        change("assignment.created", {}, { actor: { kind: "user", displayName: "Carlos" } })
      )
    ).toBe("Carlos se ha asignado a Grupo 1");
    expect(formatListsToast(change("assignment.created", {}, { assignee: null, actor: {} }))).toBe(
      "Se ha creado una asignación para Grupo 1"
    );
    expect(
      formatListsToast(
        change(
          "assignment.created",
          {},
          { actor: {}, assignee: { id: "editor", displayName: "Carlos" } }
        )
      )
    ).toBe("Se ha asignado Grupo 1 a Carlos");
  });

  it("formats Best creation and dynamic Radar positions", () => {
    expect(
      formatListsToast(change("assignment.created", {}, { list: { id: "month", type: "month" } }))
    ).toBe("María ha asignado Grupo 1 a Carlos en Mejores del Mes");
    expect(
      formatListsToast(change("assignment.placed", { previousPosition: 0, newPosition: 5 }))
    ).toBe("Grupo 1 ha sido asignado a Radar 5");
    expect(
      formatListsToast(change("assignment.placed", { previousPosition: null, newPosition: 3 }))
    ).toBe("Grupo 1 ha sido asignado a Radar 3");
    expect(
      formatListsToast(change("assignment.moved", { previousPosition: 1, newPosition: 2 }))
    ).toBe("Grupo 1 se ha movido de Radar 1 a Radar 2");
    expect(
      formatListsToast(change("assignment.unplaced", { previousPosition: 2, newPosition: 0 }))
    ).toBe("Grupo 1 ha vuelto a la bandeja");
  });

  it("does not map nullable positions to the inbox", () => {
    expect(
      formatListsToast(change("assignment.unplaced", { previousPosition: null, newPosition: null }))
    ).toBe("Hay cambios en las asignaciones de esta lista.");
  });

  it("formats assignment deletion with its actor and artist", () => {
    expect(formatListsToast(change("assignment.deleted", { previousPosition: 2 }))).toBe(
      "María ha eliminado la asignación de Grupo 1"
    );
  });

  it("deduplicates identical descriptions while retaining separate tabs as distinct sources", () => {
    const first = change("assignment.created", {}, { sourceId: "tab-a" });
    const otherTab = change("assignment.created", {}, { sourceId: "tab-b" });
    expect(deduplicateListsEvents([first, first])).toEqual([first]);
    expect(deduplicateListsEvents([first, otherTab])).toHaveLength(2);
  });

  it("confirms visible assignment changes from the HTTP result, not from the SSE payload", () => {
    const before = [
      { id: "assignment", position: 0, user: null, disc: { id: "disc" } },
    ] as EditorialAsignation[];
    const after = [{ ...before[0], position: 2 }] as EditorialAsignation[];
    expect(changedAssignmentDiscIds(before, after)).toEqual(new Set(["disc"]));
    expect(changedAssignmentDiscIds(before, before)).toEqual(new Set());
  });
});
