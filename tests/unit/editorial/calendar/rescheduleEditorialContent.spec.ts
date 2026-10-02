import { describe, expect, it, vi } from 'vitest';
import { rescheduleEditorialContent } from '../../../../src/modules/editorial/calendar/application/rescheduleEditorialContent';
import type { EditorialCalendarPort } from '../../../../src/modules/editorial/calendar/application/calendarPort';
import { createRescheduleEditorialContent, toEditorialCalendarDate } from '../../../../src/modules/editorial/calendar/domain/rescheduleContent';

describe('editorial calendar date rules', () => {
  it('keeps date-only values on the legacy 18:00 UTC boundary', () => {
    expect(toEditorialCalendarDate('2026-01-01')).toBe('2026-01-01T18:00:00.000Z');
  });

  it('preserves timestamps and null values exactly', () => {
    expect(toEditorialCalendarDate('2026-01-01T00:30:00.000Z')).toBe('2026-01-01T00:30:00.000Z');
    expect(toEditorialCalendarDate(null)).toBeNull();
    expect(toEditorialCalendarDate('')).toBeNull();
  });

  it('builds the current scheduling and backlog payloads', () => {
    expect(createRescheduleEditorialContent('2026-01-01')).toEqual({
      publicationDate: '2026-01-01T18:00:00.000Z',
      backlog: false,
    });
    expect(createRescheduleEditorialContent(null)).toEqual({
      publicationDate: null,
      backlog: true,
    });
  });
});

describe('rescheduleEditorialContent', () => {
  it('delegates the typed payload to the port', async () => {
    const port: EditorialCalendarPort = { rescheduleContent: vi.fn().mockResolvedValue(undefined) };

    await rescheduleEditorialContent(port, 'content-1', '2026-01-01');

    expect(port.rescheduleContent).toHaveBeenCalledWith('content-1', {
      publicationDate: '2026-01-01T18:00:00.000Z',
      backlog: false,
    });
  });
});
