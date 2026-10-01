import { useUserDiscStateRevision } from "../../../shared/presentation/composables/useUserDiscStateView";
import { communityRatingState } from "../../application/ratingState";

export function useCommunityRatingRevision() {
  return useUserDiscStateRevision(communityRatingState);
}
