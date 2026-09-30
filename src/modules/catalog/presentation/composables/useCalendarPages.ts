import { onUnmounted, ref, shallowRef } from "vue";
import { createCalendarPager, type DiscCalendarPort } from "../../application/discCalendar";
import type { CalendarGroup } from "../../domain/discCalendar";

export function useCalendarPages(port: DiscCalendarPort, onFirstPage: () => void, onError: () => void) {
  const groupedDiscs = ref<CalendarGroup[]>([]);
  const loading = shallowRef(false);
  const hasMore = shallowRef(true);
  // Keep the reactive projection as the pager's source of truth for legacy card edits.
  const pager = createCalendarPager(port, (state, firstPage) => {
    groupedDiscs.value = state.groups;
    loading.value = state.loading;
    hasMore.value = state.hasMore;
    if (firstPage) onFirstPage();
  });
  async function report(result: Promise<string>) {
    const status = await result;
    if (status === "failed") onError();
    return status;
  }
  onUnmounted(pager.dispose);
  return { groupedDiscs, loading, hasMore, removeDisc: pager.removeDisc,
    selectCalendarMonth: (...args: Parameters<typeof pager.selectMonth>) => report(pager.selectMonth(...args)),
    fetchNext: () => report(pager.fetchNext()), resetAndFetch: () => report(pager.resetAndFetch()) };
}
