import api from "@/shared/infrastructure/http/client";
import type { DiscListParams, DiscListPort, DiscListResult } from "../application/discListPort";

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
