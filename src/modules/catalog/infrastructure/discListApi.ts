import api from "@services/api/api.ts";
import type { DiscListParams, DiscListPort, DiscListResult } from "../application/catalogPort";

export const discListApi: DiscListPort = {
  async getDiscs(params: DiscListParams) {
    const response = await api.get<DiscListResult>("/discs", {
      params: {
        ...params,
        ...(params.country && { countryId: params.country }),
      },
    });
    return response.data;
  },
};
