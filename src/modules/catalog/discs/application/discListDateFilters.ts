import { MONTHS } from "@helpers/dateConstants";

export type DiscListDateRange = [string, string];

export interface DiscListPeriodOption {
  value: string;
  label: string;
  range: DiscListDateRange;
}

export function getDiscListYearRange(year: number): DiscListDateRange {
  const start = new Date(0);
  start.setUTCFullYear(year, 0, 1);
  const end = new Date(0);
  end.setUTCFullYear(year, 11, 31);
  return [
    startOfUtcDate(start),
    endOfUtcDate(end),
  ];
}

export function getDiscListMonthRange(year: number, month: number): DiscListDateRange {
  return [
    startOfUtcDate(new Date(Date.UTC(year, month - 1, 1))),
    endOfUtcDate(new Date(Date.UTC(year, month, 0))),
  ];
}

export function getDiscListDateSelection(range: DiscListDateRange | null) {
  if (!range) return { year: 0, month: 0 };

  const start = new Date(range[0]);
  const year = start.getUTCFullYear();
  const endYear = new Date(range[1]).getUTCFullYear();
  if (year === 1 && endYear !== 9999) return { year: endYear, month: 0 };
  if (endYear === 9999 && year !== 1) return { year, month: 0 };
  if (year === 1 && endYear === 9999) return { year: 0, month: 0 };
  const isWholeYear = getDiscListYearRange(year).every((value, index) => value === range[index]);
  return { year, month: isWholeYear ? 0 : start.getUTCMonth() + 1 };
}

export function getDiscListPeriodOptions(year: number, month: number): DiscListPeriodOption[] {
  if (!year || !month) return [];

  const weeks: DiscListPeriodOption[] = [];
  const date = new Date(Date.UTC(year, month - 1, 1));
  const daysToFriday = (5 - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + daysToFriday);

  while (date.getUTCMonth() === month - 1) {
    const end = new Date(date);
    end.setUTCDate(end.getUTCDate() + 6);
    weeks.push({
      value: `W-${date.toISOString().slice(0, 10)}`,
      label: `${shortDate(date)} – ${shortDate(end)}`,
      range: [startOfUtcDate(date), endOfUtcDate(end)],
    });
    date.setUTCDate(date.getUTCDate() + 7);
  }

  return [
    {
      value: `M-${year}-${month}`,
      label: "Mes completo",
      range: getDiscListMonthRange(year, month),
    },
    ...weeks,
  ];
}

function startOfUtcDate(date: Date): string {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value.toISOString();
}

function endOfUtcDate(date: Date): string {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value.toISOString();
}

function shortDate(date: Date): string {
  return `${String(date.getUTCDate()).padStart(2, "0")} ${MONTHS[date.getUTCMonth()]!.slice(0, 3)}`;
}
