import type {
  StatisticsDailyActivity,
  StatisticsGenreActivity,
  StatisticsMonthlyActivity,
} from "@/modules/statistics/types/statistics";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export interface MonthlyActivityPoint {
  month: number;
  label: string;
  name: string;
  count: number;
  topDisc: StatisticsMonthlyActivity["topDisc"];
}

export type CalendarDay = StatisticsDailyActivity;

export type CalendarCell = CalendarDay | null;

export interface GenreActivityPoint {
  label: string;
  count: number;
  topDisc: StatisticsGenreActivity["topDisc"];
}

export function buildMonthlyActivity(year: number, activity: readonly StatisticsMonthlyActivity[]): MonthlyActivityPoint[] {
  const monthByNumber = new Map<number, StatisticsMonthlyActivity>();
  for (const row of activity) {
    if (row.month.slice(0, 4) !== String(year)) continue;
    const month = Number(row.month.slice(5, 7));
    if (month >= 1 && month <= 12) monthByNumber.set(month, row);
  }

  return MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    name: MONTH_NAMES[index]!,
    count: monthByNumber.get(index + 1)?.activityCount ?? 0,
    topDisc: monthByNumber.get(index + 1)?.topDisc ?? null,
  }));
}

function civilDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function buildActivityCalendar(year: number, activity: readonly StatisticsDailyActivity[]): CalendarCell[][] {
  const activityByDate = new Map(activity.map((row) => [row.date, row]));
  const firstWeekday = (new Date(Date.UTC(year, 0, 1)).getUTCDay() + 6) % 7;
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInYear = isLeapYear ? 366 : 365;
  const weeks: CalendarCell[][] = [];
  let week: CalendarCell[] = Array.from({ length: firstWeekday }, () => null);

  for (let offset = 0; offset < daysInYear; offset += 1) {
    const date = new Date(Date.UTC(year, 0, offset + 1));
    const key = civilDate(year, date.getUTCMonth() + 1, date.getUTCDate());
    week.push(activityByDate.get(key) ?? { date: key, activityCount: 0, discs: [] });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export function buildGenreActivity(
  activity: readonly StatisticsGenreActivity[],
  activityWithoutGenre: number,
): GenreActivityPoint[] {
  const points = activity.map(({ genre, activityCount, topDisc }) => ({ label: genre, count: activityCount, topDisc }));
  if (activityWithoutGenre > 0 || points.length > 0) points.push({ label: "Sin género", count: activityWithoutGenre, topDisc: null });
  return points.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
}

export function formatCivilDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const civilDateAsUtc = new Date(Date.UTC(year!, month! - 1, day!));
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(civilDateAsUtc);
}

export function totalActivity(counts: readonly number[]): number {
  return counts.reduce((total, count) => total + count, 0);
}
