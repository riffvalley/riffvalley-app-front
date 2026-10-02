import api from "@/shared/infrastructure/http/client";
import type { ListCreationPort } from "../application/listCreationPort";
import type { CreateListData } from "../domain/listCreation";

export const listCreationApi: ListCreationPort = {
  async createList(data: CreateListData) {
    const response = await api.post<unknown>("/lists", data);
    return response.data;
  },
};
