import { createCommentConversationOperations } from "@/modules/community";
import { commentApi } from "@/modules/community/comments/infrastructure/commentApi";
import { commentFeedback } from "@/modules/community/comments/infrastructure/commentFeedback";
import { useAuthStore } from "./identity";

export const communityCommentOperations = createCommentConversationOperations(commentApi);
export const communityCommentFeedback = commentFeedback;

export function getCommunityCommentIdentity() {
  const auth = useAuthStore();
  return {
    user: auth.loggedUser,
    avatar: auth.avatarUrl ?? "",
  };
}
