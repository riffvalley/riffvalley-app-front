import api from "@/shared/infrastructure/http/client";
import type { CalendarPage, CalendarPageQuery, DiscCalendarPort } from "../application/discCalendar";
import type { CalendarDisc, CalendarGroup } from "../domain/discCalendar";

interface CalendarTransportDisc extends CalendarDisc {
  pendingId?: string | null;
}

interface CalendarTransportGroup extends Omit<CalendarGroup, "discs"> {
  discs: CalendarTransportDisc[];
}

interface CalendarTransportPage {
  data: CalendarTransportGroup[];
  totalItems: number;
}

export interface CalendarPageWithPendingProjection {
  page: CalendarPage;
  pendings: Array<{ discId: string; pendingId: string | null }>;
}

async function getPageWithPendingProjection(query: CalendarPageQuery): Promise<CalendarPageWithPendingProjection> {
  const { country, ...params } = query;
  try {
    const response = await api.get<CalendarTransportPage>("/discs/date", {
      params: { ...params, ...(country && { country, countryId: country }) },
    });
    const pendings: CalendarPageWithPendingProjection["pendings"] = [];
    const data = response.data.data.map((group) => ({
      ...group,
      discs: group.discs.map((disc) => {
        const { pendingId = null, ...calendarDisc } = disc;
        pendings.push({ discId: disc.id, pendingId });
        return calendarDisc;
      }),
    }));
    return { page: { data, totalItems: response.data.totalItems }, pendings };
  } catch {
    throw new Error("calendar-load-failed");
  }
}

// The API representation matches this calendar projection; no duplicate mapper.
export const discCalendarApi: DiscCalendarPort = {
  async getPage(query) { return (await getPageWithPendingProjection(query)).page; },
};

export { getPageWithPendingProjection };
