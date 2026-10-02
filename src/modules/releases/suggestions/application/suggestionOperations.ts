import type {
  CompleteSuggestionInput,
  CreateSuggestionInput,
  RejectSuggestionInput,
  SuggestionFilters,
  SuggestionPriority,
} from '../domain/suggestion';
import type { SuggestionsPort } from './suggestionsPort';
import type { SuggestionVersionOptionsPort } from './suggestionVersionOptionsPort';

export function createSuggestion(port: SuggestionsPort, input: CreateSuggestionInput) {
  return port.create(input);
}

export function listMySuggestions(port: SuggestionsPort, filters?: SuggestionFilters) {
  return port.listMine(filters);
}

export function listSuggestions(port: SuggestionsPort, filters: SuggestionFilters = {}) {
  return port.list(filters);
}

export function updateSuggestionPriority(
  port: SuggestionsPort,
  suggestionId: string,
  priority: SuggestionPriority,
) {
  return port.updatePriority(suggestionId, priority);
}

export function progressSuggestion(port: SuggestionsPort, suggestionId: string) {
  return port.progress(suggestionId);
}

export function rejectSuggestion(
  port: SuggestionsPort,
  suggestionId: string,
  input: RejectSuggestionInput,
) {
  return port.reject(suggestionId, input);
}

export function completeSuggestion(
  port: SuggestionsPort,
  suggestionId: string,
  input: CompleteSuggestionInput = {},
) {
  return port.complete(suggestionId, input);
}

export function deleteSuggestion(port: SuggestionsPort, suggestionId: string) {
  return port.delete(suggestionId);
}

export function listSuggestionVersionOptions(port: SuggestionVersionOptionsPort) {
  return port.listCurrentVersionOptions();
}
