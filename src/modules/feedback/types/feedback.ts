import type { VersionItem } from "@services/versions/versions";

export type FeedbackType = "suggestion" | "bug";
export type FeedbackStatus = "in_progress" | "done" | "rejected";
export type FeedbackPriority = "low" | "medium" | "high";

export interface FeedbackCounts {
  in_progress: number;
  done: number;
  rejected: number;
}

export interface FeedbackUser {
  id: string;
  username: string;
  image?: string | null;
}

export interface FeedbackEntry {
  id: string;
  title: string;
  description: string;
  type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  rejectionReason: string | null;
  userId: string | null;
  user: FeedbackUser | null;
  versionItemId: string | null;
  versionItem: VersionItem | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackDto {
  title: string;
  description: string;
  type?: FeedbackType;
  priority?: FeedbackPriority;
}

export interface UpdateFeedbackDto {
  title?: string;
  description?: string;
  type?: FeedbackType;
  priority?: FeedbackPriority;
}

export interface FeedbackListResponse {
  data: FeedbackEntry[];
  /** Counts follow the optional type filter and intentionally ignore status. */
  counts: FeedbackCounts;
}

export interface MyFeedbackResponse {
  data: FeedbackEntry[];
  counts: FeedbackCounts;
}

export interface FeedbackListParams {
  type?: FeedbackType;
  status?: FeedbackStatus;
}

export interface RejectFeedbackDto {
  rejectionReason: string;
}

export interface CompleteFeedbackDto {
  versionItemId?: string;
}
