export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export interface EditorialWeekDay extends CivilDate {
  weekday: number;
  dateKey: string;
  label: string;
  isoDate: string;
}

export interface EditorialWeekRange {
  start: EditorialWeekDay;
  end: EditorialWeekDay;
  days: EditorialWeekDay[];
}

export interface DiscWithReleaseDate {
  releaseDate: string;
}

const WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** Reads the civil date portion without converting an ISO timestamp through the local timezone. */
export function parseCivilDate(value: string): CivilDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function toEditorialWeekDay(date: Date): EditorialWeekDay {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const weekday = WEEKDAY_NAMES[date.getUTCDay()];

  return {
    year,
    month,
    day,
    weekday: date.getUTCDay(),
    dateKey,
    isoDate: dateKey,
    label: `${weekday} ${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}`,
  };
}

/** Returns the Monday-to-Sunday civil week containing the supplied List.listDate. */
export function getEditorialWeekRange(listDate: string): EditorialWeekRange | null {
  const civilDate = parseCivilDate(listDate);
  if (!civilDate) return null;

  const monday = new Date(Date.UTC(civilDate.year, civilDate.month - 1, civilDate.day));
  const daysSinceMonday = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return toEditorialWeekDay(date);
  });

  return { start: days[0], end: days[6], days };
}

export function groupDiscsByEditorialDay<T extends DiscWithReleaseDate>(
  discs: readonly T[],
  days: readonly EditorialWeekDay[]
): Array<{ day: EditorialWeekDay; discs: T[] }> {
  const discsByDate = new Map(days.map((day) => [day.dateKey, [] as T[]]));

  for (const disc of discs) {
    const releaseDate = parseCivilDate(disc.releaseDate);
    if (!releaseDate) continue;

    const dateKey = `${releaseDate.year}-${String(releaseDate.month).padStart(2, "0")}-${String(releaseDate.day).padStart(2, "0")}`;
    discsByDate.get(dateKey)?.push(disc);
  }

  return days.map((day) => ({ day, discs: discsByDate.get(day.dateKey) ?? [] }));
}

export function toEditorialWeekApiDate(day: EditorialWeekDay, endOfDay = false): string {
  return `${day.isoDate}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
}
