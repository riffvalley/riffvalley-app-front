import type { ListDetails, ListDetailsUpdate } from "../domain/listDetails";

/** Minimal read/update operations required by the editorial list detail screen. */
export interface ListDetailsPort {
  getListDetails(listId: string): Promise<ListDetails>;
  updateList(listId: string, data: ListDetailsUpdate): Promise<unknown>;
}
