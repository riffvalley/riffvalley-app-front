// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import ArticlesKanban from '../../../../src/views/articles/ArticlesKanban.vue';
import { articlesKey } from '../../../../src/modules/editorial';
import type { Article, ArticlesPort } from '../../../../src/modules/editorial';

const {
  getArticles, createArticleLegacy, updateArticleLegacy, deleteArticleLegacy,
  getUsersRv, error, confirm, success,
} = vi.hoisted(() => ({
  getArticles: vi.fn(),
  createArticleLegacy: vi.fn(),
  updateArticleLegacy: vi.fn(),
  deleteArticleLegacy: vi.fn(),
  getUsersRv: vi.fn(),
  error: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@services/articles/articles', () => ({
  getArticles,
  createArticle: createArticleLegacy,
  updateArticle: updateArticleLegacy,
  deleteArticle: deleteArticleLegacy,
  createArticleContent: vi.fn(),
  ARTICLE_TYPES: ['cronica', 'festival', 'review', 'entrevista', 'articulo'],
  toISO: (date: Date) => date.toISOString(),
}));
vi.mock('@services/auth/auth', () => ({ getUsersRv }));
vi.mock('@stores/auth/auth', () => ({ useAuthStore: () => ({ userId: 'user-1', username: 'Ana' }) }));
vi.mock('@services/swal/SwalService', () => ({ default: { error, confirm, success } }));

const makeArticle = (): Article => ({
  id: 'article-1', name: 'Crónica', status: 'not_started',
  type: 'cronica' as const, updateDate: null, createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z', content: null,
});

afterEach(() => vi.clearAllMocks());

function mountKanban(port: ArticlesPort) {
  return shallowMount(ArticlesKanban, {
    global: { provide: { [articlesKey as symbol]: port } },
  });
}

function boardColumns(view: ReturnType<typeof mountKanban>) {
  return view.findAll('.border-t-4');
}

describe('Articles Kanban state change', () => {
  it('updates optimistically through Editorial and keeps the card in its new column on success', async () => {
    getUsersRv.mockResolvedValue([
      { id: 'user-1', username: 'Ana' },
      { id: 'user-2', username: 'Bea' },
    ]);
    const loadArticles = vi.fn().mockResolvedValue([makeArticle()]);
    let finishUpdate!: (value: Article) => void;
    const updateArticle = vi.fn(() => new Promise<Article>((resolve) => { finishUpdate = resolve; }));
    const view = mountKanban({
      getArticles: loadArticles, createArticle: vi.fn(), updateArticle,
      deleteArticle: vi.fn(), createArticleContent: vi.fn(), createArticleCalendarContent: vi.fn(),
    });
    await flushPromises();

    const card = view.get('[draggable="true"]');
    await card.trigger('dragstart');
    const pendingDrop = boardColumns(view)[1].trigger('drop');
    await view.vm.$nextTick();

    expect(boardColumns(view)[0].find('[draggable="true"]').exists()).toBe(false);
    expect(boardColumns(view)[1].find('[draggable="true"]').exists()).toBe(true);
    expect(updateArticle).toHaveBeenCalledWith('article-1', { status: 'in_progress' });
    expect(updateArticleLegacy).not.toHaveBeenCalled();
    expect(loadArticles).toHaveBeenCalledWith('user-1');
    expect(getArticles).not.toHaveBeenCalled();

    finishUpdate({ ...makeArticle(), status: 'in_progress' });
    await pendingDrop;
    view.unmount();
  });

  it('keeps published blocked and does not call the Editorial operation', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const loadArticles = vi.fn().mockResolvedValue([makeArticle()]);
    const updateArticle = vi.fn();
    const view = mountKanban({
      getArticles: loadArticles, createArticle: vi.fn(), updateArticle,
      deleteArticle: vi.fn(), createArticleContent: vi.fn(), createArticleCalendarContent: vi.fn(),
    });
    await flushPromises();

    await view.get('[draggable="true"]').trigger('dragstart');
    await boardColumns(view)[4].trigger('drop');

    expect(updateArticle).not.toHaveBeenCalled();
    expect(boardColumns(view)[0].find('[draggable="true"]').exists()).toBe(true);
    expect(boardColumns(view)[4].find('[draggable="true"]').exists()).toBe(false);
    view.unmount();
  });

  it('restores the previous state and keeps the server error message on failure', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const loadArticles = vi.fn().mockResolvedValue([makeArticle()]);
    const failure = { response: { data: { message: 'No se puede mover' } } };
    const updateArticle = vi.fn().mockRejectedValue(failure);
    const view = mountKanban({
      getArticles: loadArticles, createArticle: vi.fn(), updateArticle,
      deleteArticle: vi.fn(), createArticleContent: vi.fn(), createArticleCalendarContent: vi.fn(),
    });
    await flushPromises();

    await view.get('[draggable="true"]').trigger('dragstart');
    await boardColumns(view)[1].trigger('drop');
    await flushPromises();

    expect(updateArticle).toHaveBeenCalledWith('article-1', { status: 'in_progress' });
    expect(boardColumns(view)[0].find('[draggable="true"]').exists()).toBe(true);
    expect(boardColumns(view)[1].find('[draggable="true"]').exists()).toBe(false);
    expect(error).toHaveBeenCalledWith('No se puede mover');
    view.unmount();
  });
});

describe('Articles Kanban load and user filter', () => {
  it('loads through Editorial using the selected user and reloads after changing the filter', async () => {
    const loaded = [makeArticle()];
    getUsersRv.mockResolvedValue([
      { id: 'user-1', username: 'Ana' },
      { id: 'user-2', username: 'Bea' },
    ]);
    const loadArticles = vi.fn().mockResolvedValue(loaded);
    const view = mountKanban({
      getArticles: loadArticles, createArticle: vi.fn(), updateArticle: vi.fn(),
      deleteArticle: vi.fn(), createArticleContent: vi.fn(), createArticleCalendarContent: vi.fn(),
    });
    await flushPromises();

    expect(loadArticles).toHaveBeenCalledWith('user-1');
    expect(getArticles).not.toHaveBeenCalled();
    expect(view.get('[draggable="true"]').text()).toContain('Crónica');

    loadArticles.mockResolvedValueOnce([]);
    await view.get('select').setValue('user-2');
    await flushPromises();

    expect(loadArticles).toHaveBeenLastCalledWith('user-2');
    expect(view.find('[draggable="true"]').exists()).toBe(false);
    view.unmount();
  });

  it('preserves empty and error states from the current load flow', async () => {
    getUsersRv.mockResolvedValue([
      { id: 'user-1', username: 'Ana' },
      { id: 'user-2', username: 'Bea' },
    ]);
    const loadArticles = vi.fn().mockResolvedValue([]);
    const view = mountKanban({
      getArticles: loadArticles, createArticle: vi.fn(), updateArticle: vi.fn(),
      deleteArticle: vi.fn(), createArticleContent: vi.fn(), createArticleCalendarContent: vi.fn(),
    });
    await flushPromises();
    expect(view.find('[draggable="true"]').exists()).toBe(false);

    const failure = { response: { data: { message: 'No se pudieron cargar' } } };
    loadArticles.mockRejectedValueOnce(failure);
    await view.get('select').setValue('user-2');
    await flushPromises();

    expect(view.text()).toContain('No se pudieron cargar');
    expect(error).toHaveBeenCalledWith('Error cargando datos');
    expect(getArticles).not.toHaveBeenCalled();
    view.unmount();
  });
});

describe('Articles Kanban form and delete flow', () => {
  function basePort(overrides: Partial<ArticlesPort> = {}): ArticlesPort {
    return {
      getArticles: vi.fn().mockResolvedValue([makeArticle()]),
      createArticle: vi.fn(),
      updateArticle: vi.fn(),
      deleteArticle: vi.fn(),
      createArticleContent: vi.fn(),
      createArticleCalendarContent: vi.fn(),
      ...overrides,
    };
  }

  async function openCreate(view: ReturnType<typeof mountKanban>) {
    await view.findAll('button').find(button => button.text().includes('Nuevo'))!.trigger('click');
  }

  it('keeps required field validation and does not submit an invalid form', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const port = basePort();
    const view = mountKanban(port);
    await flushPromises();
    await openCreate(view);
    await view.findAll('button').find(button => button.text().includes('Guardar'))!.trigger('click');

    expect(error).toHaveBeenCalledWith('Completa los campos obligatorios');
    expect(port.createArticle).not.toHaveBeenCalled();
    expect(createArticleLegacy).not.toHaveBeenCalled();
    view.unmount();
  });

  it('creates and edits with the same payloads, updating the Kanban locally', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const created = makeArticle();
    const updated = { ...makeArticle(), name: 'Crónica editada', type: 'festival' as const };
    const port = basePort({
      createArticle: vi.fn().mockResolvedValue(created),
      updateArticle: vi.fn().mockResolvedValue(updated),
    });
    const view = mountKanban(port);
    await flushPromises();

    await openCreate(view);
    await view.find('input[type="text"]').setValue('Nuevo artículo');
    await view.findAll('select')[1].setValue('festival');
    await view.find('input[type="url"]').setValue('https://example.test/article');
    await view.find('input[type="date"]').setValue('2026-10-12');
    await view.findAll('button').find(button => button.text().includes('Guardar'))!.trigger('click');
    await flushPromises();

    expect(port.createArticle).toHaveBeenCalledWith({
      name: 'Nuevo artículo', type: 'festival', link: 'https://example.test/article',
      status: 'not_started', updateDate: new Date('2026-10-12').toISOString(), userId: 'user-1',
    });
    expect(createArticleLegacy).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Artículo creado');

    await view.get('[title="Editar"]').trigger('click');
    await view.find('input[type="text"]').setValue('Crónica editada');
    await view.findAll('select')[1].setValue('festival');
    await view.find('input[type="url"]').setValue('https://example.test/edited');
    await view.find('input[type="date"]').setValue('2026-10-15');
    await view.findAll('button').find(button => button.text().includes('Guardar'))!.trigger('click');
    await flushPromises();

    expect(port.updateArticle).toHaveBeenCalledWith('article-1', {
      name: 'Crónica editada', type: 'festival', link: 'https://example.test/edited',
      updateDate: new Date('2026-10-15').toISOString(),
    });
    expect(updateArticleLegacy).not.toHaveBeenCalled();
    expect(success).toHaveBeenLastCalledWith('Artículo actualizado');
    expect(view.text()).toContain('Crónica editada');
    view.unmount();
  });

  it('preserves delete confirmation, cancellation, and server error feedback', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    confirm.mockResolvedValueOnce({ isConfirmed: false }).mockResolvedValueOnce({ isConfirmed: true });
    const failure = { response: { data: { message: 'No se pudo borrar' } } };
    const port = basePort({ deleteArticle: vi.fn().mockRejectedValue(failure) });
    const view = mountKanban(port);
    await flushPromises();

    await view.get('[title="Eliminar"]').trigger('click');
    expect(confirm).toHaveBeenCalledWith(
      '¿Eliminar artículo?',
      'Vas a eliminar "Crónica". Esta acción no se puede deshacer.',
      'Sí, eliminar', 'Cancelar',
    );
    expect(port.deleteArticle).not.toHaveBeenCalled();

    await view.get('[title="Eliminar"]').trigger('click');
    await flushPromises();
    expect(port.deleteArticle).toHaveBeenCalledWith('article-1');
    expect(deleteArticleLegacy).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('No se pudo borrar');
    expect(view.find('[draggable="true"]').exists()).toBe(true);
    view.unmount();
  });
});

describe('Articles Kanban assignments', () => {
  it('keeps the users lookup and saves each assignment field through Editorial', async () => {
    getUsersRv.mockResolvedValue([
      { id: 'user-1', username: 'Ana' },
      { id: 'user-2', username: 'Bea' },
    ]);
    const assignedArticle: Article = {
      ...makeArticle(),
      user: { id: 'user-1', username: 'Ana' },
      editor: { id: 'user-1', username: 'Ana' },
      coauthor: { id: 'user-1', username: 'Ana' },
    };
    const failure = new Error('offline');
    const updateArticle = vi.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(assignedArticle)
      .mockResolvedValueOnce(assignedArticle);
    const port: ArticlesPort = {
      getArticles: vi.fn().mockResolvedValue([assignedArticle]),
      createArticle: vi.fn(), updateArticle, deleteArticle: vi.fn(),
      createArticleContent: vi.fn(), createArticleCalendarContent: vi.fn(),
    };
    const view = mountKanban(port);
    await flushPromises();
    const card = view.get('[draggable="true"]');
    const assignments = () => card.findAll('div.cursor-pointer');

    expect(getUsersRv).toHaveBeenCalledOnce();
    expect(card.text()).toContain('Ana');

    await assignments()[0].trigger('click');
    await card.get('select').setValue('user-2');
    await flushPromises();
    expect(updateArticle).toHaveBeenNthCalledWith(1, 'article-1', { userId: 'user-2' });
    expect(error).toHaveBeenCalledWith('Error asignando usuario');
    expect(assignments()[0].text()).toContain('Ana');

    await assignments()[1].trigger('click');
    await card.get('select').setValue('user-2');
    await flushPromises();
    expect(updateArticle).toHaveBeenNthCalledWith(2, 'article-1', { editorId: 'user-2' });
    expect(assignments()[1].text()).toContain('Bea');

    await assignments()[2].trigger('click');
    await card.get('select').setValue('user-2');
    await flushPromises();
    expect(updateArticle).toHaveBeenNthCalledWith(3, 'article-1', { coauthorId: 'user-2' });
    expect(assignments()[2].text()).toContain('Bea');
    expect(updateArticleLegacy).not.toHaveBeenCalled();
    view.unmount();
  });
});
