import { communityPendingState } from "../../application/pendingState";
import { useUserDiscStateRevision, useUserDiscStateView } from "../../../shared/presentation/composables/useUserDiscStateView";

export function useCommunityPendingState(userId: string, discId: string) {
  return useUserDiscStateView(communityPendingState, userId, discId);
}

export function useCommunityPendingRevision() {
  return useUserDiscStateRevision(communityPendingState);
}
