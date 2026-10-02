/** Article workflow states currently accepted by the editorial API. */
export type ArticleState =
  | 'not_started'
  | 'in_progress'
  | 'editing'
  | 'ready'
  | 'published';

export const ARTICLE_STATES: ArticleState[] = [
  'not_started',
  'in_progress',
  'editing',
  'ready',
  'published',
];

export type ArticleType =
  | 'cronica'
  | 'festival'
  | 'review'
  | 'entrevista'
  | 'articulo';

export const ARTICLE_TYPES: ArticleType[] = [
  'cronica',
  'festival',
  'review',
  'entrevista',
  'articulo',
];

export interface ArticlePerson {
  id: string;
  username: string;
  image?: string;
}

/** Embedded content summary returned with an article. */
export interface ArticleContentRef {
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

/** Backend article representation used by the current Kanban and calendar flows. */
export interface Article {
  id: string;
  name: string;
  status: ArticleState;
  type: ArticleType;
  link?: string;
  updateDate: string | null;
  createdAt: string;
  updatedAt: string;
  user?: ArticlePerson;
  userId?: string;
  editor?: ArticlePerson;
  editorId?: string;
  coauthor?: ArticlePerson;
  coauthorId?: string;
  content: ArticleContentRef | null;
}

export interface CreateArticle {
  name: string;
  status: ArticleState;
  type: ArticleType;
  link?: string;
  updateDate?: string;
  userId?: string;
  editorId?: string;
  coauthorId?: string;
}

export type UpdateArticle = Partial<CreateArticle>;

/** Calendar content created from the article option in the existing calendar form. */
export interface CreateArticleCalendarContent {
  type: 'article';
  name: string;
  notes?: string;
  publicationDate?: string;
  closeDate?: string;
  authorId: string;
  listDate?: string;
  backlog: boolean;
}
