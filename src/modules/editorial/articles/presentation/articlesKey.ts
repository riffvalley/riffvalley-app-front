import type { InjectionKey } from 'vue';
import type { ArticlesPort } from '../application/articlesPort';

export const articlesKey: InjectionKey<ArticlesPort> = Symbol('editorialArticles');
