export interface SpecialList {
  id: string;
  name: string;
  specialType?: string | null;
}

export interface CreateSpecialList {
  name: string;
  type: "special";
  specialType: string;
}

/** The legacy endpoint's data may be the list itself or a nested data object. */
export type SpecialListsResponse = SpecialList[] | { data?: SpecialList[] | null };
