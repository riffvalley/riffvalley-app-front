import { ref } from "vue";

export function useBestListFilters(now = new Date()) {
  const selectedYear = ref(now.getFullYear());
  const availableYears = Array.from({ length: 5 }, (_, offset) => now.getFullYear() - offset);

  return { selectedYear, availableYears };
}
