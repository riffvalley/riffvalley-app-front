import type { CreateListData } from "../domain/listCreation";

export interface ListCreationPort {
  createList(data: CreateListData): Promise<unknown>;
}
