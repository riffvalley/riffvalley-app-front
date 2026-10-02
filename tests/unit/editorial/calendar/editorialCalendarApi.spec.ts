import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('@/shared/infrastructure/http/client', () => ({ default: { patch } }));

import { editorialCalendarApi } from '../../../../src/modules/editorial/calendar/infrastructure/editorialCalendarApi';

describe('editorialCalendarApi', () => {
  beforeEach(() => patch.mockReset().mockResolvedValue({ data: {} }));

  it('uses the existing content endpoint and payload for reprogramming', async () => {
    await editorialCalendarApi.rescheduleContent('content-1', {
      publicationDate: '2026-01-01T18:00:00.000Z',
      backlog: false,
    });

    expect(patch).toHaveBeenCalledWith('/contents/content-1', {
      publicationDate: '2026-01-01T18:00:00.000Z',
      backlog: false,
    });
  });
});
