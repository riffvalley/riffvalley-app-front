export interface WordPressListPost {
  position: number;
  wpPostId: number;
  link: string;
  title: string;
  added?: number;
  updated?: number;
  removed?: number;
  warning?: string;
  adopted?: boolean;
}

export interface CreateWordPressListPostsResult {
  created: number;
  posts: WordPressListPost[];
}

export interface GenerateBestDiscsWordPressPostResult {
  wpPostId: number;
  link: string;
  title: string;
  skipped?: boolean;
  added?: number;
  removed?: number;
  message?: string;
  warning?: string;
}

export interface ListWordPressPublicationPort {
  publishRadarPosts(listId: string, position?: number): Promise<CreateWordPressListPostsResult>;
  publishBestDiscsList(listId: string): Promise<GenerateBestDiscsWordPressPostResult>;
}
