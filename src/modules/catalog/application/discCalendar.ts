import { calendarMonthRange, mergeCalendarGroups, removeCalendarDisc, type CalendarGroup } from "../domain/discCalendar";

export interface CalendarPageQuery { limit: number; offset: number; dateRange: [string, string]; country?: string }
export interface CalendarPage { data: CalendarGroup[]; totalItems: number }
export interface DiscCalendarPort { getPage(query: CalendarPageQuery): Promise<CalendarPage> }
export interface CalendarSelection { year: number; month: number; country?: string }
export interface CalendarLoadState { groups: CalendarGroup[]; loading: boolean; hasMore: boolean; offset: number; totalItems: number }
export type CalendarPageResult = "loaded" | "failed" | "obsolete" | "idle";

/** Shared paging only: no roles, filter policy, group expansion or browser state. */
export function createCalendarPager(port: DiscCalendarPort, publish: (state: CalendarLoadState, firstPage: boolean) => void) {
  let generation = 0;
  let failed = false;
  let selection: CalendarSelection | null = null;
  let state: CalendarLoadState = { groups: [], loading: false, hasMore: true, offset: 0, totalItems: 0 };
  const limit = 200;
  let drainingGeneration: number | null = null;
  const notify = (firstPage = false) => publish({ ...state }, firstPage);

  async function fetchPage(gen: number, firstPage = false): Promise<CalendarPageResult> {
    if (gen !== generation) return "obsolete";
    if (!selection || state.loading || !state.hasMore) return "idle";
    state.loading = true;
    notify();
    const query: CalendarPageQuery = { limit, offset: state.offset,
      dateRange: calendarMonthRange(selection.year, selection.month),
      ...(selection.country && { country: selection.country }) };
    try {
      const page = await port.getPage(query);
      if (gen !== generation) return "obsolete";
      const groups = page.data.map((group) => ({ ...group, discs: group.discs.map((disc) => ({
        ...disc, ...(firstPage ? {} : { genreId: disc.genre?.id || "" }),
      })) }));
      state.groups = firstPage ? groups : mergeCalendarGroups(state.groups, groups);
      state.totalItems = page.totalItems;
      state.offset += limit;
      state.hasMore = state.offset < state.totalItems;
      notify(firstPage);
      return "loaded";
    } catch {
      if (gen === generation) failed = true;
      return gen === generation ? "failed" : "obsolete";
    } finally {
      if (gen === generation) { state.loading = false; notify(); }
    }
  }

  return {
    async selectMonth(next: CalendarSelection, afterFirstPage?: () => Promise<void>): Promise<CalendarPageResult> {
      const gen = ++generation;
      failed = false;
      drainingGeneration = gen;
      selection = { ...next };
      state = { groups: [], loading: false, hasMore: true, offset: 0, totalItems: 0 };
      notify();
      try {
        let result = await fetchPage(gen, true);
        if (result !== "loaded") return result;
        await afterFirstPage?.();
        while (gen === generation && state.hasMore) {
          result = await fetchPage(gen);
          if (result !== "loaded") return result;
        }
        return gen === generation ? result : "obsolete";
      } finally {
        if (drainingGeneration === gen) drainingGeneration = null;
      }
    },
    fetchNext: () => failed || drainingGeneration === generation ? Promise.resolve<CalendarPageResult>("idle") : fetchPage(generation),
    resetAndFetch() { failed = false; state.offset = 0; return fetchPage(generation); },
    removeDisc(id: string) { state.groups = removeCalendarDisc(state.groups, id); notify(); },
    dispose() { generation++; },
  };
}

/** Standard cards/export require the genre id on the first page; baby keeps API data. */
export function initializeStandardCalendarGroups(groups: CalendarGroup[]) {
  for (const group of groups) for (const disc of group.discs) disc.genreId = disc.genre?.id ?? "";
}
