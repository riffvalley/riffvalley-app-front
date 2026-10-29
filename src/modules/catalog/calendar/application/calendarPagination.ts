import { ref } from "vue";

export interface DatedDiscGroup<TDisc = unknown> {
  releaseDate: string;
  discs: TDisc[];
}

/** Adds a result page to existing date groups, preserving the server order. */
export function appendDatedDiscGroups<TGroup extends DatedDiscGroup>(
  currentGroups: TGroup[],
  incomingGroups: TGroup[]
): void {
  incomingGroups.forEach((incomingGroup) => {
    const existingGroup = currentGroups.find(
      (group) => group.releaseDate === incomingGroup.releaseDate
    );

    if (existingGroup) {
      existingGroup.discs.push(...incomingGroup.discs);
    } else {
      currentGroups.push(incomingGroup);
    }
  });
}

/** Shared page counters and the in-flight guard; request policy stays with each view. */
export function useCalendarPagination(pageSize: number) {
  const offset = ref(0);
  const totalItems = ref(0);
  const hasMore = ref(true);
  const loading = ref(false);

  const beginPageLoad = () => {
    if (loading.value || !hasMore.value) return false;
    loading.value = true;
    return true;
  };

  const recordPage = (newTotalItems: number) => {
    totalItems.value = newTotalItems;
    offset.value += pageSize;
    hasMore.value = offset.value < totalItems.value;
  };

  const resetForMonth = () => {
    offset.value = 0;
    hasMore.value = true;
    loading.value = false;
  };

  const finishPageLoad = () => {
    loading.value = false;
  };

  return {
    offset,
    hasMore,
    loading,
    beginPageLoad,
    recordPage,
    resetForMonth,
    finishPageLoad,
  };
}
