import api from "@services/api/api.ts";
import type { CalendarImagesPort } from "../application/calendarImages";
export const calendarImagesApi: CalendarImagesPort = {
  async fillImages(month, year, week) {
    try { await api.post("/lastfm/fill-images", {}, { params: { month, year, week } }); }
    catch { throw new Error("calendar-images-failed"); }
  },
};
