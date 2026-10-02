import { describe, expect, it, vi } from 'vitest';
import type {
  CompleteSuggestionInput,
  CreateSuggestionInput,
  RejectSuggestionInput,
  Suggestion,
  SuggestionFilters,
  SuggestionPriority,
} from '../../../../src/modules/releases/suggestions/domain/suggestion';
import {
  completeSuggestion,
  createSuggestion,
  deleteSuggestion,
  listMySuggestions,
  listSuggestions,
  listSuggestionVersionOptions,
  progressSuggestion,
  rejectSuggestion,
  updateSuggestionPriority,
} from '../../../../src/modules/releases/suggestions/application/suggestionOperations';
import type {
  MySuggestionsResult,
  SuggestionsPort,
} from '../../../../src/modules/releases/suggestions/application/suggestionsPort';
import type { SuggestionVersionOptionsPort } from '../../../../src/modules/releases/suggestions/application/suggestionVersionOptionsPort';

const suggestion: Suggestion = {
  id: 'suggestion-1',
  title: 'Mejorar búsqueda',
  description: 'Añadir filtros',
  type: 'suggestion',
  status: 'in_progress',
  priority: 'medium',
  rejectionReason: null,
  userId: 'user-1',
  user: { id: 'user-1', username: 'ana', image: null },
  versionItemId: null,
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const ownSuggestions: MySuggestionsResult = {
  suggestions: [suggestion],
  counts: { in_progress: 1, done: 0, rejected: 0 },
};

function makeSuggestionsPort(): SuggestionsPort {
  return {
    create: vi.fn(async (_input: CreateSuggestionInput) => suggestion),
    listMine: vi.fn(async (_filters?: SuggestionFilters) => ownSuggestions),
    list: vi.fn(async (_filters: SuggestionFilters) => [suggestion]),
    updatePriority: vi.fn(async (_id: string, _priority: SuggestionPriority) => suggestion),
    progress: vi.fn(async (_id: string) => suggestion),
    reject: vi.fn(async (_id: string, _input: RejectSuggestionInput) => suggestion),
    complete: vi.fn(async (_id: string, _input: CompleteSuggestionInput) => suggestion),
    delete: vi.fn(async (_id: string) => undefined),
  };
}

describe('Releases suggestion operations', () => {
  it('delegates creation and own-list queries with the domain inputs and result', async () => {
    const port = makeSuggestionsPort();
    const createInput: CreateSuggestionInput = {
      title: 'Mejorar búsqueda', description: 'Añadir filtros', type: 'suggestion',
    };
    const filters: SuggestionFilters = { type: 'bug', status: 'rejected' };

    await expect(createSuggestion(port, createInput)).resolves.toBe(suggestion);
    await expect(listMySuggestions(port, filters)).resolves.toBe(ownSuggestions);

    expect(port.create).toHaveBeenCalledWith(createInput);
    expect(port.listMine).toHaveBeenCalledWith(filters);
  });

  it('delegates filtered listing and each Releases-owned workflow action', async () => {
    const port = makeSuggestionsPort();
    const filters: SuggestionFilters = { type: 'suggestion', status: 'in_progress' };
    const rejection: RejectSuggestionInput = { rejectionReason: 'No se puede reproducir' };
    const internalCompletion: CompleteSuggestionInput = {};
    const linkedCompletion: CompleteSuggestionInput = { versionItemId: 'version-item-1' };

    await expect(listSuggestions(port, filters)).resolves.toEqual([suggestion]);
    await updateSuggestionPriority(port, 'suggestion-1', 'high');
    await progressSuggestion(port, 'suggestion-1');
    await rejectSuggestion(port, 'suggestion-1', rejection);
    await completeSuggestion(port, 'suggestion-1', internalCompletion);
    await completeSuggestion(port, 'suggestion-1', linkedCompletion);

    expect(port.list).toHaveBeenCalledWith(filters);
    expect(port.updatePriority).toHaveBeenCalledWith('suggestion-1', 'high');
    expect(port.progress).toHaveBeenCalledWith('suggestion-1');
    expect(port.reject).toHaveBeenCalledWith('suggestion-1', rejection);
    expect(port.complete).toHaveBeenNthCalledWith(1, 'suggestion-1', internalCompletion);
    expect(port.complete).toHaveBeenNthCalledWith(2, 'suggestion-1', linkedCompletion);
  });

  it('delegates deletion and version selection through a separate minimal projection port', async () => {
    const suggestionsPort = makeSuggestionsPort();
    const versionOptionsPort: SuggestionVersionOptionsPort = {
      listCurrentVersionOptions: vi.fn(async () => [
        { id: 'version-item-1', type: 'feat', description: 'Filtros nuevos' },
      ]),
    };

    await expect(deleteSuggestion(suggestionsPort, 'suggestion-1')).resolves.toBeUndefined();
    await expect(listSuggestionVersionOptions(versionOptionsPort)).resolves.toEqual([
      { id: 'version-item-1', type: 'feat', description: 'Filtros nuevos' },
    ]);
    expect(suggestionsPort.delete).toHaveBeenCalledWith('suggestion-1');
    expect(versionOptionsPort.listCurrentVersionOptions).toHaveBeenCalledOnce();
  });

  it('propagates port failures unchanged', async () => {
    const port = makeSuggestionsPort();
    const failure = new Error('transport failure');
    const failingPort: SuggestionsPort = {
      ...port,
      create: async () => { throw failure; },
    };

    await expect(createSuggestion(failingPort, {
      title: 'Título', description: 'Descripción',
    })).rejects.toBe(failure);
  });
});
