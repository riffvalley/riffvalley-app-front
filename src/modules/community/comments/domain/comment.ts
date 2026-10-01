export interface CommentUser {
  id: string;
  username: string;
  image?: string | null;
  avatarUrl?: string | null;
}

export interface DiscComment {
  id: string;
  parentId?: string | null;
  comment: string;
  createdAt: string;
  editedAt?: string | null;
  user: CommentUser;
  isDeleted?: boolean;
  replies: DiscComment[];
}

export interface FlatDiscComment extends Omit<DiscComment, "replies"> {}

export function buildCommentTree(flatComments: FlatDiscComment[]): DiscComment[] {
  const commentMap = new Map<string, DiscComment>();
  for (const comment of flatComments) {
    commentMap.set(comment.id, { ...comment, replies: [] });
  }

  const roots: DiscComment[] = [];
  for (const comment of flatComments) {
    const node = commentMap.get(comment.id);
    if (!node) continue;
    const parent = comment.parentId ? commentMap.get(comment.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

export function countComments(comments: DiscComment[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}
