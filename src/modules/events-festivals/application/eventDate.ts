import type { EventImportRow } from "./useEventImportRows";

export type EventDateField = "startDate" | "endDate";

export function parseCalendarDate(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > (daysInMonth[month - 1] ?? 0)) return null;

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatCalendarDate(value: string | null): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

export function getDateCellError(row: EventImportRow, field: EventDateField): string {
  const draft = row[`${field}Draft`];
  if (draft && !parseCalendarDate(draft)) return "Usa una fecha válida en formato DD/MM/YYYY.";
  if (field === "endDate" && row.startDate && row.endDate && row.endDate < row.startDate) {
    return "End Date no puede ser anterior a Start Date.";
  }
  return "";
}
