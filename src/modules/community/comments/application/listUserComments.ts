import type { UserCommentsPort } from "./userCommentsPort";
import type { UserCommentsQuery } from "../domain/userComments";

export function listUserComments(port: UserCommentsPort, query: UserCommentsQuery) {
  return port.listByUser(query);
}
