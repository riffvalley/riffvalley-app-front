import type { RescheduleEditorialContent } from '../domain/rescheduleContent';

export interface EditorialCalendarPort {
  rescheduleContent(
    contentId: string,
    data: RescheduleEditorialContent,
  ): Promise<void>;
}
