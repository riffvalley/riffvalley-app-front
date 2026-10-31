import type { ContentType } from "@services/contents/contents";
import type { ArticleState, ArticleType } from "@services/articles/articles";
import type { VideoStatus, VideoType } from "@services/videos/videos";

export interface ContentEditorData {
  type: ContentType;
  name: string;
  notes: string;
  publicationDate: string;
  closeDate?: string;
  listDate?: string;
  authorId: string;
}

export interface CreateContentFormData extends ContentEditorData {
  selectedMonth: number;
  selectedWeek: number;
  selectedYear: number;
}

export interface ArticleUpdateData {
  articleId: string;
  name: string;
  type: ArticleType;
  status: ArticleState;
  link: string;
  userId?: string;
  editorId?: string;
}

export interface VideoUpdateData {
  videoId: string;
  name: string;
  type: VideoType;
  status: VideoStatus;
  userId?: string;
  editorId?: string;
}
