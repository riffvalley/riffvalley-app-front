/** Public compatibility surface for legacy consumers of Community favorite actions. */
export {
  getCommunityFavorite,
  isCommunityFavoriteSubmitting,
  seedCommunityFavorite,
  toggleCommunityFavorite,
} from "@/app/dependencies/community";
export { useCommunityFavoriteState } from "@/modules/community/favorites/presentation/composables/useCommunityFavoriteState";
