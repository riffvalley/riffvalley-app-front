import type { Reunion, ReunionsChangeEvent } from "../types/reunions";

export function formatReunionsToast(event: ReunionsChangeEvent): string | null {
  if (event.action === undefined) return null;
  const actor = event.actor.displayName?.trim();
  if (!actor) return null;
  if (event.action.startsWith("reunion.")) {
    const name = event.reunion.title.trim();
    if (!name) return null;
    const verbs = {
      "reunion.created": "ha creado",
      "reunion.updated": "ha actualizado",
      "reunion.deleted": "ha eliminado",
    } as const;
    return `${actor} ${verbs[event.action]} ${name}`;
  }

  const point = event.point.title.trim();
  if (!point) return null;
  switch (event.action) {
    case "point.created":
      return `${actor} ha añadido ${point} a ${event.reunion.title.trim()}`;
    case "point.updated":
      return `${actor} ha actualizado ${point}`;
    case "point.completed":
      return `${actor} ha completado ${point}`;
    case "point.reopened":
      return `${actor} ha reabierto ${point}`;
    case "point.deleted":
      return `${actor} ha eliminado ${point} de ${event.reunion.title.trim()}`;
    case "point.moved":
      return `${actor} ha movido ${point} de ${event.previousReunion.title.trim()} a ${event.reunion.title.trim()}`;
  }
}

export function formatReunionsBatchToast(count: number): string {
  return count === 1
    ? "Hay un cambio visible en las reuniones."
    : `Hay ${count} cambios visibles en las reuniones.`;
}

function pointSignature(point: Reunion["points"][number]): unknown[] {
  return [
    point.id,
    point.title,
    point.content ?? null,
    point.done ?? null,
    point.reunion?.id ?? null,
  ];
}

function reunionSignature(reunion: Reunion): string {
  return JSON.stringify([
    reunion.id,
    reunion.title,
    reunion.date,
    reunion.description,
    reunion.points.map(pointSignature),
  ]);
}

export function changedVisibleReunionIds(
  before: readonly Reunion[],
  after: readonly Reunion[]
): Set<string> {
  const previous = new Map(before.map((reunion) => [reunion.id, reunionSignature(reunion)]));
  const next = new Map(after.map((reunion) => [reunion.id, reunionSignature(reunion)]));
  return new Set(
    [...new Set([...previous.keys(), ...next.keys()])].filter(
      (id) => previous.get(id) !== next.get(id)
    )
  );
}

export function hasVisibleReunionChanges(
  before: readonly Reunion[],
  after: readonly Reunion[]
): boolean {
  return changedVisibleReunionIds(before, after).size > 0;
}
