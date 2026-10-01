import type { UserRatingsQuery, UserRatingsResult } from "../domain/userRatings";

export interface UserRatingsPort {
  list(query: UserRatingsQuery): Promise<UserRatingsResult>;
}
