export type ActivityDateFilter =
  | { mode: "all" }
  | { mode: "day"; date: string }
  | { mode: "range"; from: string; to: string };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidActivityDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(0);
  parsed.setUTCFullYear(year, month - 1, day);
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function isValidActivityDateFilter(filter: ActivityDateFilter): boolean {
  if (filter.mode === "all") return true;
  if (filter.mode === "day") return isValidActivityDate(filter.date);
  return isValidActivityDate(filter.from)
    && isValidActivityDate(filter.to)
    && filter.from <= filter.to;
}

export function getBrowserIanaTimeZone(): string | null {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone) return null;
    new Intl.DateTimeFormat("en", { timeZone });
    return timeZone;
  } catch {
    return null;
  }
}

export function formatActivityDate(value: string): string {
  if (!isValidActivityDate(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year!, month! - 1, day!);
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
