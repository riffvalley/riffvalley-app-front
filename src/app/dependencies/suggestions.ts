import {
  completeSuggestion as completeSuggestionOperation,
  createSuggestion as createSuggestionOperation,
  deleteSuggestion as deleteSuggestionOperation,
  listMySuggestions,
  listSuggestionVersionOptions,
  listSuggestions,
  progressSuggestion as progressSuggestionOperation,
  rejectSuggestion as rejectSuggestionOperation,
  updateSuggestionPriority as updateSuggestionPriorityOperation,
} from '@/modules/releases/suggestions/application/suggestionOperations';
import type {
  MySuggestionsResult,
  SuggestionsPort,
} from '@/modules/releases/suggestions/application/suggestionsPort';
import type {
  CompleteSuggestionInput,
  CreateSuggestionInput,
  RejectSuggestionInput,
  Suggestion,
  SuggestionFilters,
  SuggestionPriority,
} from '@/modules/releases/suggestions/domain/suggestion';
import type {
  SuggestionVersionOption,
  SuggestionVersionOptionsPort,
} from '@/modules/releases/suggestions/application/suggestionVersionOptionsPort';
import { suggestionsApi } from '@/modules/releases/suggestions/infrastructure/suggestionsApi';
import { useSupportStore } from '@stores/support/support';

export const suggestionsPort: SuggestionsPort = suggestionsApi;

export function createOwnSuggestion(input: CreateSuggestionInput): Promise<Suggestion> {
  return createSuggestionOperation(suggestionsPort, input);
}

export function fetchOwnSuggestions(): Promise<MySuggestionsResult> {
  return listMySuggestions(suggestionsPort);
}

export function fetchManagedSuggestions(filters: SuggestionFilters = {}): Promise<Suggestion[]> {
  return listSuggestions(suggestionsPort, filters);
}

export function createManagedSuggestion(input: CreateSuggestionInput): Promise<Suggestion> {
  return createSuggestionOperation(suggestionsPort, input);
}

export function updateManagedSuggestionPriority(
  id: string,
  priority: SuggestionPriority,
): Promise<Suggestion> {
  return updateSuggestionPriorityOperation(suggestionsPort, id, priority);
}

export function progressManagedSuggestion(id: string): Promise<Suggestion> {
  return progressSuggestionOperation(suggestionsPort, id);
}

export function rejectManagedSuggestion(
  id: string,
  input: RejectSuggestionInput,
): Promise<Suggestion> {
  return rejectSuggestionOperation(suggestionsPort, id, input);
}

export function completeManagedSuggestion(
  id: string,
  input: CompleteSuggestionInput = {},
): Promise<Suggestion> {
  return completeSuggestionOperation(suggestionsPort, id, input);
}

export function deleteManagedSuggestion(id: string): Promise<void> {
  return deleteSuggestionOperation(suggestionsPort, id);
}

type CurrentVersionItemsSource = () => Promise<readonly SuggestionVersionOption[]>;
let currentVersionItemsSource: CurrentVersionItemsSource | null = null;

export function configureSuggestionVersionItemsSource(source: CurrentVersionItemsSource): void {
  currentVersionItemsSource = source;
}

const versionOptionsPort: SuggestionVersionOptionsPort = {
  async listCurrentVersionOptions() {
    if (!currentVersionItemsSource) {
      throw new Error('La fuente de elementos de versión de Sugerencias no está configurada.');
    }
    const items = await currentVersionItemsSource();
    return items.map(({ id, type, description }) => ({ id, type, description }));
  },
};

export function fetchSuggestionVersionOptions(
  port: SuggestionVersionOptionsPort = versionOptionsPort,
): Promise<SuggestionVersionOption[]> {
  return listSuggestionVersionOptions(port);
}

export async function refreshPendingSuggestionIds(
  port: SuggestionsPort = suggestionsPort,
): Promise<string[]> {
  const suggestions = await listSuggestions(port, { status: 'in_progress' });
  const ids = suggestions.map(({ id }) => id);
  useSupportStore().setPendingIds(ids);
  return ids;
}

export function setPendingSuggestionIds(ids: string[]): void {
  useSupportStore().setPendingIds(ids);
}

export function isSuggestionRead(suggestionId: string): boolean {
  return useSupportStore().isRead(suggestionId);
}

export function markSuggestionAsRead(suggestionId: string): void {
  useSupportStore().markAsRead(suggestionId);
}

export function markPendingSuggestionsAsRead(): void {
  useSupportStore().markAllAsRead();
}

export function getUnreadSuggestionCount(): number {
  return useSupportStore().unreadCount;
}
