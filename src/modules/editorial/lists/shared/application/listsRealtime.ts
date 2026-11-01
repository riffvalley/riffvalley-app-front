import type { EditorialAsignation } from "@services/asignation/asignation";
import type { ListsDescriptiveChangeEvent } from "./listsEventsParser";

export const LIST_ASSIGNMENT_MUTATION_KEY = ["editorial", "lists", "assignments"] as const;

export function formatListsToast(event: ListsDescriptiveChangeEvent): string {
  const artist = event.artistName.trim() || "un disco";
  const actor = event.actor.displayName?.trim();
  const assignee = event.assignee?.displayName.trim();

  if (event.action === "assignment.created") {
    const suffix = event.list.type === "month" ? " en Mejores del Mes" : "";
    if (actor && assignee && actor !== assignee) {
      return `${actor} ha asignado ${artist} a ${assignee}${suffix}`;
    }
    if (actor && assignee && actor === assignee) {
      return `${assignee} se ha asignado a ${artist}${suffix}`;
    }
    if (assignee) return `Se ha asignado ${artist} a ${assignee}${suffix}`;
    if (actor) return `${actor} ha creado una asignación para ${artist}${suffix}`;
    return `Se ha creado una asignación para ${artist}${suffix}`;
  }

  if (
    event.action === "assignment.placed" &&
    (event.previousPosition === 0 || event.previousPosition === null) &&
    event.newPosition !== null &&
    event.newPosition > 0
  ) {
    return `${artist} ha sido asignado a Radar ${event.newPosition}`;
  }
  if (
    event.action === "assignment.moved" &&
    event.previousPosition !== null &&
    event.previousPosition > 0 &&
    event.newPosition !== null &&
    event.newPosition > 0
  ) {
    return `${artist} se ha movido de Radar ${event.previousPosition} a Radar ${event.newPosition}`;
  }
  if (
    event.action === "assignment.unplaced" &&
    event.previousPosition !== null &&
    event.previousPosition > 0 &&
    event.newPosition === 0
  ) {
    return `${artist} ha vuelto a la bandeja`;
  }
  if (event.action === "assignment.deleted") {
    const attribution = actor ? `${actor} ha eliminado` : "Se ha eliminado";
    return `${attribution} la asignación de ${artist}`;
  }
  return "Hay cambios en las asignaciones de esta lista.";
}

export function formatListsBatchToast(): string {
  return "Hay varios cambios en las asignaciones de esta lista.";
}

function assignmentSignature(assignment: EditorialAsignation): string {
  return JSON.stringify([
    assignment.id,
    assignment.position,
    assignment.user?.id ?? null,
    assignment.disc?.id ?? null,
  ]);
}

export function changedAssignmentDiscIds(
  before: readonly EditorialAsignation[],
  after: readonly EditorialAsignation[]
): Set<string> {
  const previous = new Map(
    before.map((assignment) => [assignment.id, assignmentSignature(assignment)])
  );
  const next = new Map(after.map((assignment) => [assignment.id, assignmentSignature(assignment)]));
  const changed = new Set<string>();
  for (const assignment of [...before, ...after]) {
    if (previous.get(assignment.id) !== next.get(assignment.id) && assignment.disc?.id) {
      changed.add(assignment.disc.id);
    }
  }
  return changed;
}

export function deduplicateListsEvents(
  events: readonly ListsDescriptiveChangeEvent[]
): ListsDescriptiveChangeEvent[] {
  return [...new Map(events.map((event) => [JSON.stringify(event), event])).values()];
}
