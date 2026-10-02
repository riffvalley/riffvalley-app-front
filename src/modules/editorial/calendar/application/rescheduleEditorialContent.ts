import type { EditorialCalendarPort } from './calendarPort';
import { createRescheduleEditorialContent } from '../domain/rescheduleContent';

export function rescheduleEditorialContent(
  port: EditorialCalendarPort,
  contentId: string,
  date: string | null,
): Promise<void> {
  return port.rescheduleContent(contentId, createRescheduleEditorialContent(date));
}
