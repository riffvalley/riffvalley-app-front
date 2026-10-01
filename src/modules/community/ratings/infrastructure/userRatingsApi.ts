import { getRatesByUser } from "@services/rates/rates";
import type { UserRatingsPort } from "../application/userRatingsPort";
import type { UserRatingsQuery, UserRatingsResult } from "../domain/userRatings";

export const userRatingsApi: UserRatingsPort = {
  async list(query: UserRatingsQuery): Promise<UserRatingsResult> {
    const response = await getRatesByUser(
      query.limit, query.offset, query.query, query.dateRange, query.genre,
      query.country, query.type, query.orderBy,
    );
    return response as unknown as UserRatingsResult;
  },
};
