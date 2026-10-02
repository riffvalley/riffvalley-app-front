import type { CreateSpecialList, SpecialListsResponse } from "../domain/specialLists";

export interface SpecialListsPort {
  getSpecialLists(): Promise<SpecialListsResponse>;
  createSpecialList(data: CreateSpecialList): Promise<unknown>;
  deleteSpecialList(listId: string): Promise<void>;
}
