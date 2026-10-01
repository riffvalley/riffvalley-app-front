/** Public compatibility surface for legacy consumers of Community rating actions. */
export {
  getCommunityRating,
  isCommunityRatingSubmitting,
  loadCommunityRating,
  loadCommunityVotes,
  saveCommunityCoverVote,
  saveCommunityRating,
  seedCommunityRating,
} from "@/app/dependencies/community";
