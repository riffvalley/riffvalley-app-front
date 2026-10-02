/** List data consumed by the editorial list detail screen. */
export interface ListDetails {
  id: string;
  name: string;
  type: string;
  specialType?: string | null;
  listDate?: string | null;
  releaseDate?: string | null;
  status: string;
  link?: string | null;
  asignations?: unknown[];
}

/** Editable fields submitted by the editorial list detail screen. */
export interface ListDetailsUpdate {
  name: string;
  type: string;
  listDate: string | null;
  releaseDate: string | null;
  status: string;
  specialType?: string | null;
}
