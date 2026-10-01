/** App composition surface for Community pending state and mutations. */
export {
  getCommunityPending,
  isCommunityPendingSubmitting,
  seedCommunityPending,
  toggleCommunityPending,
} from "@/app/dependencies/community";
export { useCommunityPendingState, useCommunityPendingRevision } from "@/modules/community/pendings/presentation/composables/useCommunityPendingState";
