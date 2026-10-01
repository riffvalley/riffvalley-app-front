import { createRootComment, loadDiscConversation } from "@/modules/community";
import { legacyCommentApi } from "@/modules/community/comments/infrastructure/legacyCommentApi";
import { useAuthStore } from "./identity";

export function loadCommunityConversation(discId: string) {
  return loadDiscConversation(legacyCommentApi, discId);
}

export function createCommunityRootComment(discId: string, comment: string) {
  return createRootComment(legacyCommentApi, discId, comment);
}

export function getCommunityCommentIdentity() {
  const auth = useAuthStore();
  return {
    user: auth.loggedUser,
    avatar: auth.avatarUrl ?? "",
  };
}
