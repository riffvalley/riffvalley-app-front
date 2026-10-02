/** Payload submitted by the legacy weekly/monthly list creation form. */
export interface CreateListData {
  name: string;
  type: string;
  listDate: string | null;
  releaseDate: string | null;
  status: "new";
}
