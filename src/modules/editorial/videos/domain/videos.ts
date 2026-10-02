/** Workflow states currently accepted by the video API. */
export type VideoStatus =
  | 'not_started'
  | 'in_progress'
  | 'editing'
  | 'ready'
  | 'published';

export const VIDEO_STATUSES: VideoStatus[] = [
  'not_started',
  'in_progress',
  'editing',
  'ready',
  'published',
];

export type VideoType = 'best' | 'custom';

export const VIDEO_TYPES: VideoType[] = ['best', 'custom'];

export interface VideoPerson {
  id: string;
  username: string;
  image?: string;
}

/** Content summary embedded in video responses. */
export interface VideoContentRef {
  id: string;
  type: 'article' | 'photos' | 'spotify' | 'radar' | 'best' | 'video' | 'reunion';
  name: string;
  publicationDate: string | null;
  backlog: boolean;
  ready?: boolean;
  notes?: string | null;
  closeDate?: string | null;
  author?: {
    id: string;
    username: string;
    isActive: boolean;
    image?: string | null;
  };
}

/** Backend video representation used by the current Kanban and calendar flows. */
export interface Video {
  id: string;
  name: string;
  status: VideoStatus;
  type: VideoType;
  link?: string;
  updateDate: string | null;
  createdAt: string;
  updatedAt: string;
  user?: VideoPerson;
  userId?: string;
  editor?: VideoPerson;
  editorId?: string;
  listId?: string;
  content: VideoContentRef | null;
}

export interface CreateVideo {
  name: string;
  status: VideoStatus;
  type: VideoType;
  link?: string;
  updateDate?: string;
  userId?: string;
  editorId?: string;
  listId?: string;
}

export type UpdateVideo = Partial<CreateVideo>;

/** Result fields consumed when the video endpoint creates its associated list. */
export interface VideoListCreationResult {
  list?: {
    id?: string;
  };
}
