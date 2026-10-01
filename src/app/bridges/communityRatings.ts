/** Public compatibility surface for legacy consumers of Community rating actions. */
export {
  getCommunityRating,
  getCommunityRatingVotes,
  isCommunityRatingSubmitting,
  loadCommunityRating,
  loadCommunityVotes,
  saveCommunityCoverVote,
  saveCommunityRating,
  seedCommunityRating,
} from "@/app/dependencies/community";
export { useCommunityRatingState } from "@/modules/community/ratings/presentation/composables/useCommunityRatingState";
export { useCommunityRatingRevision } from "@/modules/community/ratings/presentation/composables/useCommunityRatingRevision";
