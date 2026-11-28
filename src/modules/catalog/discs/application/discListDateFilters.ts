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

export type DiscListQuickPeriod = "hoy" | "semana" | "mes";

export function isDiscListQuickPeriod(value: unknown): value is DiscListQuickPeriod {
  return value === "hoy" || value === "semana" || value === "mes";
}

/** Rango de un solo día (el de hoy por defecto), con la fecha local del usuario. */
export function getDiscListDayRange(today: Date = new Date()): DiscListDateRange {
  const day = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  return [startOfUtcDate(day), endOfUtcDate(day)];
}

/** true si el rango empieza y acaba el mismo día. */
export function isDiscListSingleDayRange(range: DiscListDateRange | null): range is DiscListDateRange {
  return Boolean(range && range[0].slice(0, 10) === range[1].slice(0, 10));
}

/** Etiqueta corta de un día: «28 nov». */
export function formatDiscListDay(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]!.slice(0, 3).toLowerCase()}`;
}

/**
 * Rango de la semana de lanzamientos en curso (de viernes a jueves), igual que
 * las opciones del selector «Semana o periodo». Usa la fecha local del usuario.
 */
export function getDiscListCurrentWeekRange(today: Date = new Date()): DiscListDateRange {
  const friday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  friday.setUTCDate(friday.getUTCDate() - ((friday.getUTCDay() - 5 + 7) % 7));
  const thursday = new Date(friday);
  thursday.setUTCDate(thursday.getUTCDate() + 6);
  return [startOfUtcDate(friday), endOfUtcDate(thursday)];
}

export function getDiscListQuickPeriodRange(
  period: DiscListQuickPeriod,
  today: Date = new Date(),
): DiscListDateRange {
  if (period === "hoy") return getDiscListDayRange(today);
  return period === "semana"
    ? getDiscListCurrentWeekRange(today)
    : getDiscListMonthRange(today.getFullYear(), today.getMonth() + 1);
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
