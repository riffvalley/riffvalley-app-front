import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentVersionItems } from '../../../src/services/versions/versions';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@services/api/api', () => ({ default: { get } }));

describe('legacy current version item source for Suggestions composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads current version items from the existing endpoint and returns its data unchanged', async () => {
    const items = [{ id: 'version-item-1', type: 'feat', description: 'Filtros nuevos' }];
    get.mockResolvedValueOnce({ data: items });

    await expect(getCurrentVersionItems()).resolves.toBe(items);
    expect(get).toHaveBeenCalledWith('/versions/current/items');
  });
});
