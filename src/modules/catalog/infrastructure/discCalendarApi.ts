import api from "@services/api/api.ts";
import type { CalendarPage, DiscCalendarPort } from "../application/discCalendar";

// The API representation matches this calendar projection; no duplicate mapper.
type CalendarPageDto = CalendarPage;
export const discCalendarApi: DiscCalendarPort = {
  async getPage({ country, ...query }) {
    try {
      const response = await api.get<CalendarPageDto>("/discs/date", {
        params: { ...query, ...(country && { country, countryId: country }) },
      });
      return response.data;
    } catch {
      throw new Error("calendar-load-failed");
    }
  },
};
