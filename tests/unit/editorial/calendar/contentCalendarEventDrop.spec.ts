// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import ContentCalendar from '../../../../src/views/contentCalendar/ContentCalendar.vue';
import { articlesKey, videosKey } from '../../../../src/modules/editorial';
import { rescheduleEditorialContentKey } from '../../../../src/modules/editorial/calendar/presentation/rescheduleEditorialContentKey';
import type { ArticlesPort, VideosPort } from '../../../../src/modules/editorial';

const { getContents, getContentsByMonth, getRvUsers, success, error } = vi.hoisted(() => ({
  getContents: vi.fn().mockResolvedValue([]),
  getContentsByMonth: vi.fn().mockResolvedValue([]),
  getRvUsers: vi.fn().mockResolvedValue([]),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@fullcalendar/vue3', () => ({ default: { name: 'FullCalendar', props: ['options'], template: '<div />' } }));
vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/interaction', () => ({ default: {}, Draggable: vi.fn() }));
vi.mock('@services/contents/contents', () => ({
  getContents,
  createContent: vi.fn(),
  updateContent: vi.fn(),
  deleteContent: vi.fn(),
  getContentsByMonth,
}));
vi.mock('@services/users/users', () => ({ getRvUsers }));
vi.mock('@services/asignation/asignation', () => ({ updateAsignationService: vi.fn() }));
vi.mock('@services/list/list', () => ({ deleteList: vi.fn(), getListDetails: vi.fn(), updateList: vi.fn() }));
vi.mock('@services/articles/articles', () => ({ updateArticle: vi.fn(), ARTICLE_TYPES: [], ARTICLE_STATES: [] }));
vi.mock('@services/videos/videos', () => ({ updateVideo: vi.fn(), VIDEO_TYPES: [], VIDEO_STATUSES: [] }));
vi.mock('@services/swal/SwalService', () => ({ default: { success, error } }));
vi.mock('@stores/auth/auth', () => ({ useAuthStore: () => ({ userId: 'author-1' }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(() => vi.clearAllMocks());

function mountCalendar(rescheduleContent: (contentId: string, date: string | null) => Promise<void>) {
  const articles: ArticlesPort = {
    getArticles: vi.fn().mockResolvedValue([]), createArticle: vi.fn(), updateArticle: vi.fn(),
    deleteArticle: vi.fn(), createArticleContent: vi.fn(), createArticleCalendarContent: vi.fn(),
  };
  const videos: VideosPort = {
    getVideos: vi.fn().mockResolvedValue([]), createVideo: vi.fn(), updateVideo: vi.fn(),
    deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: vi.fn(),
  };
  return shallowMount(ContentCalendar, {
    global: { provide: {
      [articlesKey as symbol]: articles,
      [videosKey as symbol]: videos,
      [rescheduleEditorialContentKey as symbol]: rescheduleContent,
    } },
  });
}

async function eventDrop(view: ReturnType<typeof mountCalendar>, overrides: Record<string, unknown> = {}) {
  await flushPromises();
  const options = view.findComponent({ name: 'FullCalendar' }).props('options') as {
    eventDrop: (info: unknown) => Promise<void>;
  };
  const revert = vi.fn();
  await options.eventDrop({
    event: { id: 'content-1', startStr: '2026-10-03', extendedProps: { contentType: 'article' } },
    revert,
    ...overrides,
  });
  return revert;
}

describe('ContentCalendar eventDrop', () => {
  it('requests Editorial rescheduling, refreshes both collections and confirms success', async () => {
    const rescheduleContent = vi.fn().mockResolvedValue(undefined);
    const view = mountCalendar(rescheduleContent);

    await eventDrop(view);

    expect(rescheduleContent).toHaveBeenCalledWith('content-1', '2026-10-03');
    expect(getContents).toHaveBeenCalledWith(true);
    expect(getContentsByMonth).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Evento reprogramado correctamente');
    view.unmount();
  });

  it('reverts the event and preserves the existing error message when Editorial fails', async () => {
    const rescheduleContent = vi.fn().mockRejectedValue(new Error('offline'));
    const view = mountCalendar(rescheduleContent);

    const revert = await eventDrop(view);

    expect(revert).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith('Error al mover el evento');
    view.unmount();
  });

  it('keeps the assigned Radar movement restriction', async () => {
    const rescheduleContent = vi.fn().mockResolvedValue(undefined);
    const view = mountCalendar(rescheduleContent);

    const revert = await eventDrop(view, {
      event: { id: 'radar-1', startStr: '2026-10-03', extendedProps: { contentType: 'radar', list: { asignations: [{ id: 'a1' }] } } },
    });

    expect(revert).toHaveBeenCalledOnce();
    expect(rescheduleContent).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('No se puede mover un Radar que ya tiene asignaciones.');
    view.unmount();
  });
});
