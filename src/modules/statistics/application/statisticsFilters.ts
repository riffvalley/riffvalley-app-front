import { computed, ref } from "vue";
import { isValidIanaTimeZone } from "../api/statisticsApi";

export const MIN_STATISTICS_YEAR = 2025;
export const STATISTICS_TIME_ZONE_FALLBACK = "UTC";

function browserTimeZone(): string {
  try {
    const candidate = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return candidate && isValidIanaTimeZone(candidate)
      ? candidate
      : STATISTICS_TIME_ZONE_FALLBACK;
  } catch {
    return STATISTICS_TIME_ZONE_FALLBACK;
  }
}

function yearInTimeZone(timeZone: string, date = new Date()): number {
  try {
    return Number(new Intl.DateTimeFormat("en", {
      timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
    }).format(date));
  } catch {
    return date.getUTCFullYear();
  }
}

const selectedTimeZone = ref(browserTimeZone());
const selectedYear = ref(Math.max(MIN_STATISTICS_YEAR, yearInTimeZone(selectedTimeZone.value)));

export function isValidStatisticsYear(year: number, timeZone: string): boolean {
  return isValidIanaTimeZone(timeZone)
    && Number.isInteger(year)
    && year >= MIN_STATISTICS_YEAR
    && year <= yearInTimeZone(timeZone);
}

export function useStatisticsFilters() {
  const currentYear = computed(() => yearInTimeZone(selectedTimeZone.value));
  const year = computed({
    get: () => selectedYear.value,
    set: (candidate: number) => {
      if (isValidStatisticsYear(candidate, selectedTimeZone.value)) selectedYear.value = candidate;
    },
  });

  return {
    year,
    timeZone: selectedTimeZone,
    currentYear,
    minYear: MIN_STATISTICS_YEAR,
    setYear(candidate: number) { year.value = candidate; },
    isYearValid(candidate = year.value) {
      return isValidStatisticsYear(candidate, selectedTimeZone.value);
    },
  };
}
