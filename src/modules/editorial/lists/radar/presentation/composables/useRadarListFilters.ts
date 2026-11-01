import { ref } from "vue";

export function useRadarListFilters(now = new Date()) {
  const selectedYear = ref(now.getFullYear());
  const selectedMonth = ref(now.getMonth() + 1);
  const availableYears = Array.from({ length: 5 }, (_, offset) => now.getFullYear() - offset);

  return { selectedYear, selectedMonth, availableYears };
}
