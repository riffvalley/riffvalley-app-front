const NEUTRAL_SCORE_CLASSES =
  "border-gray-300 bg-gray-100 text-gray-700 dark:border-white/10 dark:bg-rv-darkSurface dark:text-gray-200";

const SCORE_COLOR_CLASSES = {
  intenseGreen: "border-green-700 bg-green-700 text-white dark:border-green-400 dark:bg-green-500 dark:text-green-950",
  green: "border-green-600 bg-green-100 text-green-900 dark:border-green-500 dark:bg-green-900/50 dark:text-green-100",
  softGreen: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-100",
  lime: "border-lime-400 bg-lime-100 text-lime-950 dark:border-lime-500 dark:bg-lime-900/50 dark:text-lime-100",
  yellow: "border-yellow-400 bg-yellow-100 text-yellow-950 dark:border-yellow-500 dark:bg-yellow-900/50 dark:text-yellow-100",
  amber: "border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-900/50 dark:text-amber-100",
  orange: "border-orange-500 bg-orange-100 text-orange-950 dark:border-orange-500 dark:bg-orange-900/50 dark:text-orange-100",
  red: "border-red-600 bg-red-100 text-red-950 dark:border-red-500 dark:bg-red-900/50 dark:text-red-100",
} as const;

export function getActivityScoreColorClasses(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return NEUTRAL_SCORE_CLASSES;
  if (score >= 9.5) return SCORE_COLOR_CLASSES.intenseGreen;
  if (score >= 9) return SCORE_COLOR_CLASSES.green;
  if (score >= 8) return SCORE_COLOR_CLASSES.softGreen;
  if (score >= 7) return SCORE_COLOR_CLASSES.lime;
  if (score >= 6) return SCORE_COLOR_CLASSES.yellow;
  if (score >= 5) return SCORE_COLOR_CLASSES.amber;
  if (score >= 4) return SCORE_COLOR_CLASSES.orange;
  return SCORE_COLOR_CLASSES.red;
}
