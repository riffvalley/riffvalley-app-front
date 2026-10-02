// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import VideosKanban from '../../src/views/videos/VideosKanban.vue';
import { videosKey } from '../../src/modules/editorial';
import type { Video, VideosPort } from '../../src/modules/editorial';

const {
  getVideos, createVideoLegacy, updateVideoLegacy, deleteVideo, createVideoList,
  createVideoContent, getUsersRv, error, confirm, success, push,
} = vi.hoisted(() => ({
  getVideos: vi.fn(),
  createVideoLegacy: vi.fn(),
  updateVideoLegacy: vi.fn(),
  deleteVideo: vi.fn(),
  createVideoList: vi.fn(),
  createVideoContent: vi.fn(),
  getUsersRv: vi.fn(),
  error: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@services/videos/videos', () => ({
  getVideos,
  createVideo: createVideoLegacy,
  updateVideo: updateVideoLegacy,
  deleteVideo,
  createVideoList,
  createVideoContent,
  VIDEO_TYPES: ['best', 'custom'],
  toISO: (date: Date) => date.toISOString(),
}));
vi.mock('@services/auth/auth', () => ({ getUsersRv }));
vi.mock('@stores/auth/auth', () => ({ useAuthStore: () => ({ userId: 'user-1', username: 'Ana' }) }));
vi.mock('@services/swal/SwalService', () => ({ default: { error, confirm, success } }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

const makeVideo = (): Video => ({
  id: 'video-1', name: 'Vídeo', status: 'not_started', type: 'best',
  updateDate: null, createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z', content: null,
});

afterEach(() => vi.clearAllMocks());

function mountKanban(port: VideosPort) {
  return shallowMount(VideosKanban, {
    global: { provide: { [videosKey as symbol]: port } },
  });
}

function boardColumns(view: ReturnType<typeof mountKanban>) {
  return view.findAll('.border-t-4');
}

describe('Videos Kanban state change', () => {
  it('updates optimistically through Editorial and keeps the card in the new column on success', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const loadVideos = vi.fn().mockResolvedValue([makeVideo()]);
    let finishUpdate!: (video: Video) => void;
    const updateVideo = vi.fn(() => new Promise<Video>((resolve) => { finishUpdate = resolve; }));
    const view = mountKanban({
      getVideos: loadVideos, createVideo: vi.fn(), updateVideo,
      deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: vi.fn(),
    });
    await flushPromises();

    const card = view.get('[draggable="true"]');
    await card.trigger('dragstart');
    const pendingDrop = boardColumns(view)[1].trigger('drop');
    await view.vm.$nextTick();

    expect(boardColumns(view)[0].find('[draggable="true"]').exists()).toBe(false);
    expect(boardColumns(view)[1].find('[draggable="true"]').exists()).toBe(true);
    expect(updateVideo).toHaveBeenCalledWith('video-1', { status: 'in_progress' });
    expect(updateVideoLegacy).not.toHaveBeenCalled();
    expect(loadVideos).toHaveBeenCalledWith('user-1');
    expect(getVideos).not.toHaveBeenCalled();

    finishUpdate({ ...makeVideo(), status: 'in_progress' });
    await pendingDrop;
    view.unmount();
  });

  it('restores the previous status and shows the server error message when the update fails', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const loadVideos = vi.fn().mockResolvedValue([makeVideo()]);
    const failure = { response: { data: { message: 'No se permite el cambio' } } };
    const updateVideo = vi.fn().mockRejectedValue(failure);
    const view = mountKanban({
      getVideos: loadVideos, createVideo: vi.fn(), updateVideo,
      deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: vi.fn(),
    });
    await flushPromises();

    await view.get('[draggable="true"]').trigger('dragstart');
    await boardColumns(view)[1].trigger('drop');

    expect(boardColumns(view)[0].find('[draggable="true"]').exists()).toBe(true);
    expect(boardColumns(view)[1].find('[draggable="true"]').exists()).toBe(false);
    expect(error).toHaveBeenCalledWith('No se permite el cambio');
    expect(updateVideo).toHaveBeenCalledWith('video-1', { status: 'in_progress' });
    expect(updateVideoLegacy).not.toHaveBeenCalled();
    view.unmount();
  });

  it('keeps published blocked without calling the Editorial mutation', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const loadVideos = vi.fn().mockResolvedValue([makeVideo()]);
    const updateVideo = vi.fn();
    const view = mountKanban({
      getVideos: loadVideos, createVideo: vi.fn(), updateVideo,
      deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: vi.fn(),
    });
    await flushPromises();

    await view.get('[draggable="true"]').trigger('dragstart');
    await boardColumns(view)[4].trigger('drop');

    expect(updateVideo).not.toHaveBeenCalled();
    expect(boardColumns(view)[0].find('[draggable="true"]').exists()).toBe(true);
    expect(boardColumns(view)[4].find('[draggable="true"]').exists()).toBe(false);
    view.unmount();
  });
});

describe('Videos Kanban query', () => {
  it('loads through Editorial using the initial user selection and preserves the user filter', async () => {
    getUsersRv.mockResolvedValue([
      { id: 'user-1', username: 'Ana' },
      { id: 'user-2', username: 'Bea' },
    ]);
    const firstVideo = makeVideo();
    const secondVideo = { ...makeVideo(), id: 'video-2', name: 'Otro vídeo' };
    const loadVideos = vi.fn()
      .mockResolvedValueOnce([firstVideo])
      .mockResolvedValueOnce([secondVideo]);
    const view = mountKanban({
      getVideos: loadVideos, createVideo: vi.fn(), updateVideo: vi.fn(),
      deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: vi.fn(),
    });
    await flushPromises();

    expect(loadVideos).toHaveBeenCalledWith('user-1');
    expect(view.text()).toContain('Vídeo');
    expect(getVideos).not.toHaveBeenCalled();

    await view.get('select').setValue('user-2');
    await flushPromises();

    expect(loadVideos).toHaveBeenLastCalledWith('user-2');
    expect(view.text()).toContain('Otro vídeo');
    expect(getVideos).not.toHaveBeenCalled();
    view.unmount();
  });

  it('preserves loading, empty and query error states', async () => {
    let resolveUsers!: (users: { id: string; username: string }[]) => void;
    getUsersRv.mockReturnValue(new Promise((resolve) => { resolveUsers = resolve; }));
    const loadVideos = vi.fn()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce({ response: { data: { message: 'Detalle backend' } } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = mountKanban({
      getVideos: loadVideos, createVideo: vi.fn(), updateVideo: vi.fn(),
      deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: vi.fn(),
    });

    await view.vm.$nextTick();
    expect(view.text()).toContain('Cargando vídeos...');
    resolveUsers([{ id: 'user-1', username: 'Ana' }, { id: 'user-2', username: 'Bea' }]);
    await flushPromises();
    expect(view.findAll('.border-t-4')).toHaveLength(5);
    expect(loadVideos).toHaveBeenCalledWith('user-1');
    expect(view.findAll('[draggable="true"]')).toHaveLength(0);

    await view.get('select').setValue('user-2');
    await flushPromises();
    expect(view.text()).toContain('Detalle backend');
    expect(error).toHaveBeenCalledWith('Error cargando datos');
    expect(loadVideos).toHaveBeenLastCalledWith('user-2');
    expect(getVideos).not.toHaveBeenCalled();
    consoleError.mockRestore();
    view.unmount();
  });
});

describe('Videos Kanban form and deletion', () => {
  it('validates required fields and uses Editorial for create and update with the legacy payloads', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const created = makeVideo();
    const updated = { ...created, name: 'Vídeo editado' };
    const createVideo = vi.fn().mockRejectedValueOnce(new Error('request failed')).mockResolvedValue(created);
    const updateVideo = vi.fn().mockResolvedValue(updated);
    const view = mountKanban({
      getVideos: vi.fn().mockResolvedValue([]), createVideo, updateVideo,
      deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: vi.fn(),
    });
    await flushPromises();

    await view.findAll('button').find((button) => button.text().includes('Nuevo'))!.trigger('click');
    await view.findAll('button').find((button) => button.text().includes('Guardar'))!.trigger('click');
    expect(error).toHaveBeenCalledWith('Completa los campos obligatorios');
    expect(createVideo).not.toHaveBeenCalled();

    await view.get('input[type="text"]').setValue('Vídeo nuevo');
    await view.findAll('select')[1].setValue('custom');
    await view.get('input[type="url"]').setValue('https://example.test/video');
    await view.get('input[type="date"]').setValue('2026-10-03');
    await view.findAll('button').find((button) => button.text().includes('Guardar'))!.trigger('click');

    expect(error).toHaveBeenLastCalledWith('Error guardando vídeo');
    expect(view.text()).toContain('Nuevo Vídeo');
    await view.findAll('button').find((button) => button.text().includes('Guardar'))!.trigger('click');

    expect(createVideo).toHaveBeenCalledWith({
      name: 'Vídeo nuevo', type: 'custom', link: 'https://example.test/video',
      status: 'not_started', updateDate: '2026-10-03T00:00:00.000Z', userId: 'user-1',
    });
    expect(createVideoLegacy).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Vídeo creado');

    await view.get('button[title="Editar"]').trigger('click');
    await view.get('input[type="text"]').setValue('Vídeo editado');
    await view.findAll('button').find((button) => button.text().includes('Guardar'))!.trigger('click');

    expect(updateVideo).toHaveBeenCalledWith('video-1', {
      name: 'Vídeo editado', type: 'best', link: undefined, updateDate: undefined,
    });
    expect(updateVideoLegacy).not.toHaveBeenCalled();
    expect(success).toHaveBeenLastCalledWith('Vídeo actualizado');
    view.unmount();
  });

  it('keeps delete cancellation and error behavior through Editorial', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const removeVideo = vi.fn().mockRejectedValue({ response: { data: { message: 'No se pudo borrar' } } });
    const view = mountKanban({
      getVideos: vi.fn().mockResolvedValue([makeVideo()]), createVideo: vi.fn(),
      updateVideo: vi.fn(), deleteVideo: removeVideo, createVideoList: vi.fn(), createVideoContent: vi.fn(),
    });
    await flushPromises();

    confirm.mockResolvedValueOnce({ isConfirmed: false }).mockResolvedValueOnce({ isConfirmed: true });
    await view.get('button[title="Eliminar"]').trigger('click');
    expect(removeVideo).not.toHaveBeenCalled();
    expect(view.text()).toContain('Vídeo');

    await view.get('button[title="Eliminar"]').trigger('click');
    await flushPromises();
    expect(removeVideo).toHaveBeenCalledWith('video-1');
    expect(deleteVideo).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('No se pudo borrar');
    expect(view.text()).toContain('Vídeo');
    view.unmount();
  });
});

describe('Videos Kanban assignments', () => {
  it('uses Editorial payloads to assign both the user and editor', async () => {
    getUsersRv.mockResolvedValue([
      { id: 'user-1', username: 'Ana', image: 'ana.png' },
      { id: 'user-2', username: 'Bea', image: 'bea.png' },
    ]);
    const updateVideo = vi.fn().mockResolvedValue(makeVideo());
    const view = mountKanban({
      getVideos: vi.fn().mockResolvedValue([makeVideo()]), createVideo: vi.fn(), updateVideo,
      deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: vi.fn(),
    });
    await flushPromises();

    await view.findAll('span').find((span) => span.text() === 'Sin asignar')!.trigger('click');
    await view.vm.$nextTick();
    await view.findAll('select')[1].setValue('user-2');
    await flushPromises();
    expect(updateVideo).toHaveBeenNthCalledWith(1, 'video-1', { userId: 'user-2' });
    expect(view.text()).toContain('Bea');

    await view.findAll('span').find((span) => span.text() === 'Sin editor')!.trigger('click');
    await view.vm.$nextTick();
    await view.findAll('select')[1].setValue('user-2');
    await flushPromises();
    expect(updateVideo).toHaveBeenNthCalledWith(2, 'video-1', { editorId: 'user-2' });
    expect(view.text()).toContain('Editor:');
    expect(updateVideoLegacy).not.toHaveBeenCalled();
    expect(getUsersRv).toHaveBeenCalledOnce();
    view.unmount();
  });

  it('rolls back failed user and editor assignments with the existing error messages', async () => {
    getUsersRv.mockResolvedValue([
      { id: 'user-1', username: 'Ana' },
      { id: 'user-2', username: 'Bea' },
    ]);
    const assignedVideo = {
      ...makeVideo(),
      user: { id: 'user-1', username: 'Ana' },
      editor: { id: 'user-1', username: 'Ana' },
    };
    const updateVideo = vi.fn()
      .mockRejectedValueOnce(new Error('user assignment failed'))
      .mockRejectedValueOnce(new Error('editor assignment failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = mountKanban({
      getVideos: vi.fn().mockResolvedValue([assignedVideo]), createVideo: vi.fn(), updateVideo,
      deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: vi.fn(),
    });
    await flushPromises();

    await view.findAll('span').find((span) => span.text() === 'Ana')!.trigger('click');
    await view.vm.$nextTick();
    await view.findAll('select')[1].setValue('user-2');
    await flushPromises();
    expect(updateVideo).toHaveBeenNthCalledWith(1, 'video-1', { userId: 'user-2' });
    expect(error).toHaveBeenCalledWith('Error asignando usuario');
    expect(view.text()).toContain('Ana');

    await view.findAll('span').find((span) => span.text() === 'Editor: Ana')!.trigger('click');
    await view.vm.$nextTick();
    await view.findAll('select')[1].setValue('user-2');
    await flushPromises();
    expect(updateVideo).toHaveBeenNthCalledWith(2, 'video-1', { editorId: 'user-2' });
    expect(error).toHaveBeenLastCalledWith('Error asignando editor');
    expect(view.text()).toContain('Editor:');
    expect(updateVideoLegacy).not.toHaveBeenCalled();
    consoleError.mockRestore();
    view.unmount();
  });
});

describe('Videos Kanban list creation', () => {
  it('creates the video-associated list through Editorial and preserves list navigation', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const createList = vi.fn().mockResolvedValue({ list: { id: 'list-1' } });
    const view = mountKanban({
      getVideos: vi.fn().mockResolvedValue([makeVideo()]), createVideo: vi.fn(), updateVideo: vi.fn(),
      deleteVideo: vi.fn(), createVideoList: createList, createVideoContent: vi.fn(),
    });
    await flushPromises();

    await view.get('button[title="Crear lista"]').trigger('click');
    expect(createList).toHaveBeenCalledWith('video-1');
    expect(createVideoList).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Lista creada');
    await view.get('button[title="Ver lista"]').trigger('click');
    expect(push).toHaveBeenCalledWith('/videos/list/list-1?videoType=best');
    view.unmount();
  });

  it('keeps the existing list creation error message on failure', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const createList = vi.fn().mockRejectedValue(new Error('request failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = mountKanban({
      getVideos: vi.fn().mockResolvedValue([makeVideo()]), createVideo: vi.fn(), updateVideo: vi.fn(),
      deleteVideo: vi.fn(), createVideoList: createList, createVideoContent: vi.fn(),
    });
    await flushPromises();

    await view.get('button[title="Crear lista"]').trigger('click');
    expect(createList).toHaveBeenCalledWith('video-1');
    expect(error).toHaveBeenCalledWith('Error creando lista');
    expect(createVideoList).not.toHaveBeenCalled();
    expect(view.find('button[title="Crear lista"]').exists()).toBe(true);
    consoleError.mockRestore();
    view.unmount();
  });
});

describe('Videos Kanban calendar association', () => {
  it('requires an assigned user and associates the returned content through Editorial', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const content = {
      id: 'content-1', type: 'video' as const, name: 'Vídeo',
      publicationDate: null, backlog: true,
    };
    const createContent = vi.fn().mockResolvedValue({ ...makeVideo(), content });
    const unassignedView = mountKanban({
      getVideos: vi.fn().mockResolvedValue([makeVideo()]), createVideo: vi.fn(), updateVideo: vi.fn(),
      deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: createContent,
    });
    await flushPromises();
    expect(unassignedView.get('button[title="Asigna un usuario para poder añadir al calendario"]').attributes('disabled')).toBeDefined();
    expect(createContent).not.toHaveBeenCalled();
    unassignedView.unmount();

    const assignedVideo = { ...makeVideo(), user: { id: 'user-1', username: 'Ana' } };
    const view = mountKanban({
      getVideos: vi.fn().mockResolvedValue([assignedVideo]), createVideo: vi.fn(), updateVideo: vi.fn(),
      deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: createContent,
    });
    await flushPromises();

    await view.get('button[title="Añadir al calendario"]').trigger('click');
    expect(createContent).toHaveBeenCalledWith('video-1');
    expect(createVideoContent).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Añadido al calendario');
    expect(view.find('button[title="Añadir al calendario"]').exists()).toBe(false);
    view.unmount();
  });

  it('preserves the server error message when calendar association fails', async () => {
    getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }]);
    const createContent = vi.fn().mockRejectedValue({ response: { data: { message: 'No se pudo asociar' } } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = mountKanban({
      getVideos: vi.fn().mockResolvedValue([
        { ...makeVideo(), user: { id: 'user-1', username: 'Ana' } },
      ]), createVideo: vi.fn(), updateVideo: vi.fn(),
      deleteVideo: vi.fn(), createVideoList: vi.fn(), createVideoContent: createContent,
    });
    await flushPromises();

    await view.get('button[title="Añadir al calendario"]').trigger('click');
    expect(createContent).toHaveBeenCalledWith('video-1');
    expect(createVideoContent).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('No se pudo asociar');
    expect(view.find('button[title="Añadir al calendario"]').exists()).toBe(true);
    consoleError.mockRestore();
    view.unmount();
  });
});
