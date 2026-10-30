import type { ActivityHistoryEvent } from "../types/activity";

export interface ActivityDayGroup {
  dateKey: string;
  dateLabel: string;
  events: ActivityHistoryEvent[];
}

function getDateParts(timestamp: string, timeZone: string): Record<string, string> {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return {};

  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
}

export function groupActivityEventsByLocalDay(
  events: ActivityHistoryEvent[],
  timeZone: string,
): ActivityDayGroup[] {
  const groups = new Map<string, ActivityDayGroup>();
  const seenEventIds = new Set<string>();

  for (const event of events) {
    if (seenEventIds.has(event.id)) continue;
    seenEventIds.add(event.id);

    const parts = getDateParts(event.occurredAt, timeZone);
    const dateKey = parts.year && parts.month && parts.day
      ? `${parts.year}-${parts.month}-${parts.day}`
      : "unknown-date";
    let group = groups.get(dateKey);
    if (!group) {
      group = {
        dateKey,
        dateLabel: dateKey === "unknown-date"
          ? "Fecha no disponible"
          : new Intl.DateTimeFormat("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone,
          }).format(new Date(event.occurredAt)),
        events: [],
      };
      groups.set(dateKey, group);
    }
    group.events.push(event);
  }

  return [...groups.values()];
}
