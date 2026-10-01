import { communityFavoriteState } from "../../application/favoriteState";
import { useUserDiscStateView } from "../../../shared/presentation/composables/useUserDiscStateView";

export function useCommunityFavoriteState(userId: string, discId: string) {
  return useUserDiscStateView(communityFavoriteState, userId, discId);
}
