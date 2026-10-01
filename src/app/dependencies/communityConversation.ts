import { createCommentConversationOperations } from "@/modules/community";
import { commentApi } from "@/modules/community/comments/infrastructure/commentApi";
import type { CommentConversationFeedback } from "@/modules/community";
import { communityCommentFeedback as commentFeedback } from "@/modules/community/comments/presentation/helpers/commentFeedback";
import { useAuthStore } from "./identity";

export const communityCommentOperations = createCommentConversationOperations(commentApi);
export const communityCommentFeedback: CommentConversationFeedback = commentFeedback;

export function getCommunityCommentIdentity() {
  const auth = useAuthStore();
  return {
    user: auth.loggedUser,
    avatar: auth.avatarUrl ?? "",
  };
}
