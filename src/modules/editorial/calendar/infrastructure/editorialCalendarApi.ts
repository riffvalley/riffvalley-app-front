import api from '@/shared/infrastructure/http/client';
import type { EditorialCalendarPort } from '../application/calendarPort';

export const editorialCalendarApi: EditorialCalendarPort = {
  async rescheduleContent(contentId, data) {
    await api.patch(`/contents/${contentId}`, data);
  },
};
