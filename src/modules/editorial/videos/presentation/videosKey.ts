import type { InjectionKey } from 'vue';
import type { VideosPort } from '../application/videosPort';

export const videosKey: InjectionKey<VideosPort> = Symbol('editorialVideos');
