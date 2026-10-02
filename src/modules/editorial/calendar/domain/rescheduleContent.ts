export interface RescheduleEditorialContent {
  publicationDate: string | null;
  backlog: boolean;
}

/**
 * Keeps FullCalendar's date-only values at 18:00 UTC, matching the legacy
 * calendar behavior while avoiding a visible day shift across time zones.
 */
export function toEditorialCalendarDate(date: string | null): string | null {
  if (!date) return null;
  if (date.includes('T')) return date;
  return `${date}T18:00:00.000Z`;
}

export function createRescheduleEditorialContent(
  date: string | null,
): RescheduleEditorialContent {
  return {
    publicationDate: toEditorialCalendarDate(date),
    backlog: date === null,
  };
}
