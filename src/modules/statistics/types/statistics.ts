export type StatisticsActivityBasis = "rate_created_at_estimate" | "set_events";
export type StatisticsActivityCoverage = "unknown" | "partial" | "complete";

export interface StatisticsDisc {
  id: string;
  name: string;
  image: string | null;
  rate: number;
  artist: { name: string } | null;
  genre: { name: string; color: string | null } | null;
}

export interface StatisticsControversialDisc {
  id: string;
  name: string;
  image: string | null;
  userRate: number;
  communityAverage: number;
  /** Personal score minus current community average; may be negative. */
  diff: number;
  artist: { name: string } | null;
  genre: { name: string; color: string | null } | null;
}

export interface StatisticsMonthlyActivity {
  /** Local calendar month, YYYY-MM. */
  month: string;
  activityCount: number;
  topDisc: StatisticsDisc | null;
}

export interface StatisticsGenreActivity {
  genre: string;
  activityCount: number;
  topDisc: StatisticsDisc | null;
}

export interface StatisticsDailyActivity {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Distinct discs with eligible activity on this date. */
  activityCount: number;
  discs: StatisticsDailyDisc[];
}

export interface StatisticsDailyDisc {
  discId: string;
  title: string;
  artist: string | null;
  rate: number | null;
  /** Local civil date, YYYY-MM-DD. */
  date: string;
}

export interface StatisticsScoreBucket {
  /** Integer score bucket in [score, score + 1), except 10 which is exactly 10. */
  score: number;
  scoredDiscCount: number;
}

export interface StatisticsSummary {
  year: number;
  timeZone: string;
  activityBasis: StatisticsActivityBasis;
  activityCoverage: StatisticsActivityCoverage;
  activityCount: number;
  scoredDiscs: number;
  mean: number | null;
  median: number | null;
  standardDeviation: number | null;
  activityByGenre: StatisticsGenreActivity[];
  activityByMonth: StatisticsMonthlyActivity[];
  scoreDistribution: StatisticsScoreBucket[];
  topDiscOverall: StatisticsDisc | null;
  mostControversial: StatisticsControversialDisc[];
  activityByDay: StatisticsDailyActivity[];
  activityWithoutGenre: number;
}

export interface StatisticsRatedDisc {
  id: string;
  name: string;
  rate: number;
  artist: { name: string } | null;
  genre: { name: string; color: string | null } | null;
}

export interface StatisticsQueryParams {
  year: number;
  timeZone: string;
}
