/** Keeps the calendar's civil date independent from the browser timezone. */
export function toCalendarApiDate(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  return value.split("T")[0];
}

/** An API timestamp is shown using its stored calendar date, without TZ conversion. */
export function formatCalendarDateInput(value: string): string {
  if (!value) return "";
  return value.split("T")[0];
}

export function formatLocalCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
