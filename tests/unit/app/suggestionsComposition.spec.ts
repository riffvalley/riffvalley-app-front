// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  configureSuggestionVersionItemsSource,
  fetchSuggestionVersionOptions,
  getUnreadSuggestionCount,
  isSuggestionRead,
  markPendingSuggestionsAsRead,
  markSuggestionAsRead,
  refreshPendingSuggestionIds,
  setPendingSuggestionIds,
  suggestionsPort,
} from '../../../src/app/dependencies/suggestions';
import type { Suggestion } from '../../../src/modules/releases/suggestions/domain/suggestion';
import type { SuggestionsPort } from '../../../src/modules/releases/suggestions/application/suggestionsPort';
import type { SuggestionVersionOptionsPort } from '../../../src/modules/releases/suggestions/application/suggestionVersionOptionsPort';
import { suggestionsApi } from '../../../src/modules/releases/suggestions/infrastructure/suggestionsApi';
import { useSupportStore } from '../../../src/stores/support/support';

const suggestion = (id: string): Suggestion => ({
  id, title: `Sugerencia ${id}`, description: 'Descripción', type: 'suggestion',
  status: 'in_progress', priority: 'medium', rejectionReason: null, userId: 'user-1',
  user: { id: 'user-1', username: 'ana', image: null }, versionItemId: null,
  createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
});

function makeSuggestionsPort(items: Suggestion[]): SuggestionsPort {
  return {
    create: async () => suggestion('created'),
    listMine: async () => ({ suggestions: items, counts: { in_progress: items.length, done: 0, rejected: 0 } }),
    list: vi.fn(async () => items),
    updatePriority: async () => suggestion('updated'),
    progress: async () => suggestion('progressed'),
    reject: async () => suggestion('rejected'),
    complete: async () => suggestion('completed'),
    delete: async () => undefined,
  };
}

describe('Suggestions app composition', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('composes the Releases API adapter as its suggestions port', () => {
    expect(suggestionsPort).toBe(suggestionsApi);
  });

  it('routes version item lookup through the replaceable port and projects only the fields Releases needs', async () => {
    const source = vi.fn(async () => [{
      id: 'version-item-1', type: 'feat', description: 'Filtros nuevos', state: 'todo',
      frontUser: { id: 'user-2', username: 'bea', isActive: true, image: '/bea.jpg' },
    }]);
    configureSuggestionVersionItemsSource(source);

    await expect(fetchSuggestionVersionOptions()).resolves.toEqual([
      { id: 'version-item-1', type: 'feat', description: 'Filtros nuevos' },
    ]);
    expect(source).toHaveBeenCalledOnce();

    const fakePort: SuggestionVersionOptionsPort = {
      listCurrentVersionOptions: vi.fn(async () => [
        { id: 'replacement-1', type: 'fix', description: 'Cierre del modal' },
      ]),
    };
    await expect(fetchSuggestionVersionOptions(fakePort)).resolves.toEqual([
      { id: 'replacement-1', type: 'fix', description: 'Cierre del modal' },
    ]);
    expect(fakePort.listCurrentVersionOptions).toHaveBeenCalledOnce();
  });

  it('loads pending IDs through Releases and projects them into the support badge state', async () => {
    localStorage.setItem('rv_support_read_ids', '["pending-2"]');
    const store = useSupportStore();
    const port = makeSuggestionsPort([
      suggestion('pending-1'), suggestion('pending-2'), suggestion('pending-3'),
    ]);

    await expect(refreshPendingSuggestionIds(port)).resolves.toEqual([
      'pending-1', 'pending-2', 'pending-3',
    ]);
    expect(port.list).toHaveBeenCalledWith({ status: 'in_progress' });
    expect(store.unreadCount).toBe(2);
    expect(getUnreadSuggestionCount()).toBe(2);
  });

  it('keeps read ID storage format, insertion order, restoration, and pending-count behavior', () => {
    const store = useSupportStore();
    setPendingSuggestionIds(['read-1', 'pending-1', 'pending-2']);
    markSuggestionAsRead('read-1');
    markSuggestionAsRead('pending-1');

    expect(localStorage.getItem('rv_support_read_ids')).toBe('["read-1","pending-1"]');
    expect(isSuggestionRead('pending-1')).toBe(true);
    expect(getUnreadSuggestionCount()).toBe(1);

    setActivePinia(createPinia());
    const restoredStore = useSupportStore();
    expect(isSuggestionRead('read-1')).toBe(true);
    expect(restoredStore.unreadCount).toBe(0);
    restoredStore.setPendingIds(['pending-1', 'pending-2']);
    expect(getUnreadSuggestionCount()).toBe(1);
    markPendingSuggestionsAsRead();
    expect(localStorage.getItem('rv_support_read_ids')).toBe('["read-1","pending-1","pending-2"]');
    expect(restoredStore.unreadCount).toBe(0);
    expect(store).not.toBe(restoredStore);
  });
});
