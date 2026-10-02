import api from "@/shared/infrastructure/http/client";
import type { ListDetailsPort } from "../application/listDetailsPort";
import type { ListDetails } from "../domain/listDetails";

export const listDetailsApi: ListDetailsPort = {
  async getListDetails(listId) {
    const response = await api.get<ListDetails>(`/lists/${listId}`);
    return response.data;
  },

  async updateList(listId, data) {
    const response = await api.patch<unknown>(`/lists/${listId}`, data);
    return response.data;
  },
};
