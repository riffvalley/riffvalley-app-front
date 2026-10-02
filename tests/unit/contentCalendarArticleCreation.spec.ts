// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import ContentCalendar from '../../src/views/contentCalendar/ContentCalendar.vue';
import CreateContentModal from '../../src/views/contentCalendar/components/CreateContentModal.vue';
import ArticleActionsModal from '../../src/views/contentCalendar/components/ArticleActionsModal.vue';
import { articlesKey } from '../../src/modules/editorial';
import type { ArticlesPort } from '../../src/modules/editorial';

const {
  getContents, createContentLegacy, updateContent, deleteContent, getContentsByMonth,
  getRvUsers, updateAsignationService, deleteList, getListDetails, updateList,
  updateArticleLegacy, updateVideo, success, error,
} = vi.hoisted(() => ({
  getContents: vi.fn().mockResolvedValue([]),
  createContentLegacy: vi.fn().mockResolvedValue({ id: 'content-1' }),
  updateContent: vi.fn(), deleteContent: vi.fn(), getContentsByMonth: vi.fn().mockResolvedValue([]),
  getRvUsers: vi.fn().mockResolvedValue([]), updateAsignationService: vi.fn(),
  deleteList: vi.fn(), getListDetails: vi.fn(), updateList: vi.fn(),
  updateArticleLegacy: vi.fn(), updateVideo: vi.fn(), success: vi.fn(), error: vi.fn(),
}));

vi.mock('@fullcalendar/vue3', () => ({ default: { name: 'FullCalendar', props: ['options'], template: '<div />' } }));
vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/interaction', () => ({ default: {}, Draggable: vi.fn() }));
vi.mock('@services/contents/contents', () => ({
  getContents,
  createContent: createContentLegacy,
  updateContent,
  deleteContent,
  getContentsByMonth,
}));
vi.mock('@services/users/users', () => ({ getRvUsers }));
vi.mock('@services/asignation/asignation', () => ({ updateAsignationService }));
vi.mock('@services/list/list', () => ({ deleteList, getListDetails, updateList }));
vi.mock('@services/articles/articles', () => ({
  updateArticle: updateArticleLegacy,
  ARTICLE_TYPES: ['cronica', 'festival', 'review', 'entrevista', 'articulo'],
  ARTICLE_STATES: ['not_started', 'in_progress', 'editing', 'ready', 'published'],
}));
vi.mock('@services/videos/videos', () => ({ updateVideo }));
vi.mock('@services/swal/SwalService', () => ({ default: { success, error } }));
vi.mock('@stores/auth/auth', () => ({ useAuthStore: () => ({ userId: 'author-1' }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(() => vi.clearAllMocks());

function makePort(overrides: Partial<ArticlesPort> = {}): ArticlesPort {
  return {
    getArticles: vi.fn().mockResolvedValue([]),
    createArticle: vi.fn(),
    updateArticle: vi.fn(),
    deleteArticle: vi.fn(),
    createArticleContent: vi.fn(),
    createArticleCalendarContent: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function mountCalendar(port: ArticlesPort) {
  return shallowMount(ContentCalendar, {
    global: { provide: { [articlesKey as symbol]: port } },
  });
}

async function submitCreate(view: ReturnType<typeof mountCalendar>, data: object) {
  view.findComponent(CreateContentModal).vm.$emit('create', data);
  await flushPromises();
}

describe('Content calendar article creation', () => {
  it('uses Editorial with the legacy article content payload and date conversion', async () => {
    const port = makePort();
    const view = mountCalendar(port);
    await flushPromises();
    const inputDate = '2026-10-02T12:30';

    await submitCreate(view, {
      type: 'article', name: 'Artículo desde calendario', notes: 'Notas',
      publicationDate: inputDate, closeDate: '2026-10-10', authorId: 'author-1',
      listDate: '2026-10-04',
    });

    expect(port.createArticleCalendarContent).toHaveBeenCalledWith({
      type: 'article', name: 'Artículo desde calendario', notes: 'Notas',
      publicationDate: new Date(inputDate).toISOString(), closeDate: '2026-10-10',
      authorId: 'author-1', listDate: '2026-10-04', backlog: false,
    });
    expect(createContentLegacy).not.toHaveBeenCalled();
    expect(getContents).toHaveBeenCalledWith(true);
    expect(getContentsByMonth).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Evento creado correctamente');
    view.unmount();
  });

  it('preserves backlog payload and the existing create error message', async () => {
    const failure = new Error('offline');
    const port = makePort({ createArticleCalendarContent: vi.fn().mockRejectedValue(failure) });
    const view = mountCalendar(port);
    await flushPromises();

    await submitCreate(view, {
      type: 'article', name: 'Artículo en backlog', notes: '',
      publicationDate: '', closeDate: '', authorId: 'author-1', listDate: '',
    });

    expect(port.createArticleCalendarContent).toHaveBeenCalledWith({
      type: 'article', name: 'Artículo en backlog', notes: undefined,
      publicationDate: undefined, closeDate: undefined,
      authorId: 'author-1', listDate: undefined, backlog: true,
    });
    expect(error).toHaveBeenCalledWith('Error al crear el contenido. Por favor, intenta de nuevo.');
    expect(createContentLegacy).not.toHaveBeenCalled();
    view.unmount();
  });

  it('leaves creation of other calendar content types on the current service', async () => {
    const port = makePort();
    const view = mountCalendar(port);
    await flushPromises();

    await submitCreate(view, {
      type: 'photos', name: 'Fotos', notes: '', publicationDate: '',
      closeDate: '', authorId: 'author-1', listDate: '',
    });

    expect(createContentLegacy).toHaveBeenCalledWith({
      type: 'photos', name: 'Fotos', notes: undefined, publicationDate: undefined,
      closeDate: undefined, authorId: 'author-1', listDate: undefined, backlog: true,
    });
    expect(port.createArticleCalendarContent).not.toHaveBeenCalled();
    view.unmount();
  });

  it('routes the article editor update through Editorial and preserves its error message', async () => {
    const updateArticle = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('offline'));
    const port = makePort({ updateArticle });
    const content = {
      id: 'content-1', type: 'article', name: 'Artículo', notes: null,
      publicationDate: '2026-10-02T12:00:00.000Z', closeDate: null, backlog: false,
      author: { id: 'author-1', username: 'Ana', isActive: true }, list: null, spotify: null,
      article: { id: 'article-1', name: 'Artículo', status: 'ready', type: 'review' },
    };
    getContentsByMonth.mockResolvedValue([content]);
    const view = mountCalendar(port);
    await flushPromises();
    const calendarOptions = view.findComponent({ name: 'FullCalendar' }).props('options') as {
      eventClick: (info: { event: { id: string } }) => Promise<void>;
    };
    await calendarOptions.eventClick({ event: { id: 'content-1' } });
    await flushPromises();
    const articleModal = view.findComponent(ArticleActionsModal);
    expect(articleModal.exists()).toBe(true);
    const payload = {
      articleId: 'article-1', name: 'Artículo editado', type: 'review', status: 'editing',
      link: 'https://example.test/article', userId: 'user-2', editorId: 'editor-1',
    };

    articleModal.vm.$emit('update-article', payload);
    await flushPromises();

    expect(updateArticle).toHaveBeenCalledWith('article-1', {
      name: 'Artículo editado', type: 'review', status: 'editing',
      link: 'https://example.test/article', userId: 'user-2', editorId: 'editor-1',
    });
    expect(updateArticleLegacy).not.toHaveBeenCalled();
    articleModal.vm.$emit('update-article', payload);
    await flushPromises();

    expect(error).toHaveBeenCalledWith('Error al actualizar el artículo');
    expect(updateArticleLegacy).not.toHaveBeenCalled();
    view.unmount();
  });
});

describe('Content calendar article editor', () => {
  it('loads existing values and emits the same article update payload on save', async () => {
    const content = {
      id: 'content-1', type: 'article' as const, name: 'Artículo original', notes: 'Notas originales',
      publicationDate: '2026-10-02T00:00:00.000Z', closeDate: null, backlog: false,
      author: { id: 'author-1', username: 'Ana', isActive: true }, list: null, spotify: null,
      article: {
        id: 'article-1', name: 'Artículo original', status: 'ready' as const, type: 'review' as const,
        updateDate: null, createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z', content: null,
        link: 'https://example.test/original', userId: 'user-2', editorId: 'editor-1',
      },
    };
    const view = shallowMount(ArticleActionsModal, {
      props: { show: true, content, rvUsers: [] },
    });
    await flushPromises();

    expect((view.get('input[type="text"]').element as HTMLInputElement).value).toBe('Artículo original');
    expect((view.get('textarea').element as HTMLTextAreaElement).value).toBe('Notas originales');
    expect((view.get('input[type="datetime-local"]').element as HTMLInputElement).value)
      .toBe('2026-10-02T00:00');

    await view.findAll('button').find(button => button.text().includes('Guardar Cambios'))!.trigger('click');

    expect(view.emitted('update-article')?.[0]).toEqual([{
      articleId: 'article-1', name: 'Artículo original', type: 'review', status: 'ready',
      link: 'https://example.test/original', userId: 'user-2', editorId: 'editor-1',
    }]);
    view.unmount();
  });
});
