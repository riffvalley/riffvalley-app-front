import type {
  CompleteSuggestionInput,
  CreateSuggestionInput,
  RejectSuggestionInput,
  Suggestion,
  SuggestionFilters,
  SuggestionPriority,
} from '../domain/suggestion';

export interface SuggestionStatusCounts {
  in_progress: number;
  done: number;
  rejected: number;
}

export interface MySuggestionsResult {
  suggestions: Suggestion[];
  counts: SuggestionStatusCounts;
}

export interface SuggestionsPort {
  create(input: CreateSuggestionInput): Promise<Suggestion>;
  listMine(filters?: SuggestionFilters): Promise<MySuggestionsResult>;
  list(filters: SuggestionFilters): Promise<Suggestion[]>;
  updatePriority(id: string, priority: SuggestionPriority): Promise<Suggestion>;
  progress(id: string): Promise<Suggestion>;
  reject(id: string, input: RejectSuggestionInput): Promise<Suggestion>;
  complete(id: string, input: CompleteSuggestionInput): Promise<Suggestion>;
  delete(id: string): Promise<void>;
}
