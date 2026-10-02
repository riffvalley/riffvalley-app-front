export type SuggestionType = 'suggestion' | 'bug';

export type SuggestionStatus = 'in_progress' | 'done' | 'rejected';

export type SuggestionPriority = 'low' | 'medium' | 'high';

export interface SuggestionUser {
  id: string;
  username: string;
  image?: string | null;
}

/** A suggestion owned by Releases, without the related Product Ops version item. */
export interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: SuggestionType;
  status: SuggestionStatus;
  priority: SuggestionPriority;
  rejectionReason: string | null;
  userId: string | null;
  user: SuggestionUser;
  /** Releases stores the association ID; the Product Ops item is composed externally. */
  versionItemId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Optional filters are omitted when the corresponding UI tab is "all". */
export interface SuggestionFilters {
  type?: SuggestionType;
  status?: SuggestionStatus;
}

export interface CreateSuggestionInput {
  title: string;
  description: string;
  type?: SuggestionType;
  priority?: SuggestionPriority;
}

export interface UpdateSuggestionInput {
  title?: string;
  description?: string;
  type?: SuggestionType;
  priority?: SuggestionPriority;
}

export interface RejectSuggestionInput {
  rejectionReason: string;
}

/** An omitted versionItemId represents the existing internal completion flow. */
export interface CompleteSuggestionInput {
  versionItemId?: string;
}
