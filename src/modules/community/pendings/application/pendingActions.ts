import type { PendingPort, PendingStatePort } from "./pendingPort";
import type { UserPendingsQuery } from "../domain/pending";

export async function toggleUserPending(
  state: PendingStatePort,
  port: PendingPort,
  userId: string,
  discId: string,
): Promise<string | null | false> {
  const generation = state.getSessionGeneration();
  if (!state.beginSubmit(userId, discId)) return false;
  const current = state.get(userId, discId);
  try {
    if (current.pendingId) {
      await port.remove(current.pendingId);
      if (generation !== state.getSessionGeneration()) return false;
      state.set(userId, discId, null);
      return null;
    }
    const pendingId = await port.create(discId);
    if (generation !== state.getSessionGeneration()) return false;
    state.set(userId, discId, pendingId);
    return pendingId;
  } finally {
    if (generation === state.getSessionGeneration()) state.finishSubmit(userId, discId);
  }
}

export function listUserPendings(port: PendingPort, query: UserPendingsQuery) {
  return port.list(query);
}
