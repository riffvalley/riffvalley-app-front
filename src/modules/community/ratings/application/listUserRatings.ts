import type { UserRatingsPort } from "./userRatingsPort";
import type { UserRatingsQuery, UserRatingsResult } from "../domain/userRatings";

export function listUserRatings(port: UserRatingsPort, query: UserRatingsQuery): Promise<UserRatingsResult> {
  return port.list(query);
}
