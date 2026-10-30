import api from "@services/api/api";
import type { StatisticsQueryParams, StatisticsRatedDisc, StatisticsSummary } from "../types/statistics";

export const STATISTICS_SUMMARY_PATH = "/rates/stats";
export const STATISTICS_DISCS_PATH = "/rates/stats/discs";

function assertStatisticsParams(params: StatisticsQueryParams): void {
  if (!isValidIanaTimeZone(params.timeZone)) {
    throw new RangeError("Statistics timeZone must be a valid IANA time zone.");
  }
  const currentYear = Number(new Intl.DateTimeFormat("en", {
    timeZone: params.timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
  }).format(new Date()));
  if (!Number.isInteger(params.year) || params.year < 2025 || params.year > currentYear) {
    throw new RangeError(`Statistics year must be an integer from 2025 through ${currentYear}.`);
  }
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export async function getStatisticsSummary(
  params: StatisticsQueryParams,
  signal?: AbortSignal,
): Promise<StatisticsSummary> {
  assertStatisticsParams(params);
  const { data } = await api.get<StatisticsSummary>(STATISTICS_SUMMARY_PATH, {
    params: { year: params.year, timeZone: params.timeZone },
    signal,
  });
  return data;
}

export async function getStatisticsRatedDiscs(
  params: StatisticsQueryParams,
  signal?: AbortSignal,
): Promise<StatisticsRatedDisc[]> {
  assertStatisticsParams(params);
  const { data } = await api.get<StatisticsRatedDisc[]>(STATISTICS_DISCS_PATH, {
    params: { year: params.year, timeZone: params.timeZone },
    signal,
  });
  return data;
}
