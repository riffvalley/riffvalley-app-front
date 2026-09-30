import api from "@services/api/api.ts";
import type { CalendarDiscWritePort } from "../application/calendarTools";
export const calendarToolsApi: CalendarDiscWritePort = {
  async updateAlbum(id, patch) {
    try { await api.patch(`/discs/${id}`, patch); }
    catch { throw new Error("calendar-update-failed"); }
  },
};
