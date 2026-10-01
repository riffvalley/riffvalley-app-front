import api from "@/shared/infrastructure/http/client";
import type { CalendarPage, DiscCalendarPort } from "../application/discCalendar";

// The API representation matches this calendar projection; no duplicate mapper.
export const discCalendarApi: DiscCalendarPort = {
  async getPage({ country, ...query }) {
    try {
      const response = await api.get<CalendarPage>("/discs/date", {
        params: { ...query, ...(country && { country, countryId: country }) },
      });
      return response.data;
    } catch {
      throw new Error("calendar-load-failed");
    }
  },
};
