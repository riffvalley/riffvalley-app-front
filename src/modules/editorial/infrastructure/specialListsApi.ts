import api from "@/shared/infrastructure/http/client";
import type { SpecialListsPort } from "../application/specialListsPort";
import type { CreateSpecialList, SpecialListsResponse } from "../domain/specialLists";

export const specialListsApi: SpecialListsPort = {
  async getSpecialLists() {
    const response = await api.get<SpecialListsResponse>("/lists/special");
    return response.data;
  },

  async createSpecialList(data: CreateSpecialList) {
    const response = await api.post<unknown>("/lists", data);
    return response.data;
  },

  async deleteSpecialList(listId) {
    await api.delete(`/lists/${listId}`);
  },
};
