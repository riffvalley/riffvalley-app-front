/** Minimal Product Ops projection used to choose a version item when completing a suggestion. */
export interface SuggestionVersionOption {
  id: string;
  type: string;
  description: string;
}

export interface SuggestionVersionOptionsPort {
  listCurrentVersionOptions(): Promise<SuggestionVersionOption[]>;
}
