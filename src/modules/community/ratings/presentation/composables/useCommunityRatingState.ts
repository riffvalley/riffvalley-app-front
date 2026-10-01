import { computed } from "vue";
import { communityRatingState } from "../../application/ratingState";
import { useUserDiscStateView } from "../../../shared/presentation/composables/useUserDiscStateView";

export function useCommunityRatingState(userId: string, discId: string) {
  const view = useUserDiscStateView(communityRatingState, userId, discId);
  const votes = computed(() => {
    view.revision.value;
    return communityRatingState.getVotes(userId, discId);
  });
  return { state: view.state, votes, isSubmitting: view.isSubmitting };
}
