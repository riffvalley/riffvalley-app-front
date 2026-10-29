export interface SavedDiscFilterCriteria {
  genreIds: string[];
  countryId: string | null;
  yearFrom: number | null;
  yearTo: number | null;
}

export interface SavedDiscFilter {
  id: string;
  name: string;
  filters: SavedDiscFilterCriteria;
  missingGenreIds: string[];
  countryMissing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveDiscFilterPayload {
  name: string;
  filters: SavedDiscFilterCriteria;
}

export interface UpdateDiscFilterPayload {
  name?: string;
  filters?: SavedDiscFilterCriteria;
}
