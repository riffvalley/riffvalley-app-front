// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import SpotifyGenresKanban from '../../../../src/views/spotify/SpotifyGenresKanban.vue';
import { genrePlaylistLifecycleKey, genrePlaylistRegistrationsKey } from '../../../../src/modules/editorial';
import type { GenrePlaylistLifecyclePort, GenrePlaylistRegistrationsPort } from '../../../../src/modules/editorial';

const mocks = vi.hoisted(() => ({
  getRegistrations: vi.fn(),
  updateRegistration: vi.fn(),
  getSpotifyGenresLegacy: vi.fn(),
  updateSpotifyLegacy: vi.fn(),
  removeSpotifyLegacy: vi.fn(),
  getUsersRv: vi.fn(),
  getSpotifyConnection: vi.fn(),
  createGenrePlaylist: vi.fn(),
  createLinkedGenrePlaylist: vi.fn(),
  linkExistingGenrePlaylist: vi.fn(),
  deleteGenrePlaylistRegistration: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@services/spotify/spotify', () => ({
  getSpotifyGenres: mocks.getSpotifyGenresLegacy,
  updateSpotify: mocks.updateSpotifyLegacy,
  removeSpotify: mocks.removeSpotifyLegacy,
  createSpotifyContent: vi.fn(),
  toISO: (date: Date) => date.toISOString(),
}));
vi.mock('@services/auth/auth', () => ({ getUsersRv: mocks.getUsersRv }));
vi.mock('@stores/auth/auth', () => ({ useAuthStore: () => ({ userId: 'user-1', username: 'Ana' }) }));
vi.mock('@services/swal/SwalService', () => ({
  default: { error: mocks.error, success: mocks.success, confirm: mocks.confirm },
}));
vi.mock('@services/spotify/festivalPlaylists', () => ({
  connectSpotify: vi.fn(),
  getSpotifyConnection: mocks.getSpotifyConnection,
}));
vi.mock('@services/spotify/genrePlaylists', () => ({
  createGenrePlaylist: mocks.createGenrePlaylist,
  createLinkedGenrePlaylist: mocks.createLinkedGenrePlaylist,
  linkExistingGenrePlaylist: mocks.linkExistingGenrePlaylist,
}));

const registration = () => ({
  id: 'genre-1', name: 'Rock', status: 'not_started' as const, link: '', type: 'genero' as const,
  updateDate: '2026-10-02T00:00:00.000Z', createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z', user: { id: 'user-1', username: 'Ana' },
  userId: 'user-1', content: null,
});

afterEach(() => vi.clearAllMocks());

function mountBoard(
  port: GenrePlaylistRegistrationsPort,
  lifecycle: GenrePlaylistLifecyclePort = {
    createGenrePlaylist: mocks.createGenrePlaylist,
    createLinkedGenrePlaylist: mocks.createLinkedGenrePlaylist,
    linkExistingGenrePlaylist: mocks.linkExistingGenrePlaylist,
    deleteGenrePlaylistRegistration: mocks.deleteGenrePlaylistRegistration,
  },
) {
  mocks.getUsersRv.mockResolvedValue([{ id: 'user-1', username: 'Ana' }, { id: 'user-2', username: 'Bea' }]);
  mocks.getSpotifyConnection.mockResolvedValue({
    connected: true, spotifyUserId: null, displayName: null, canUploadImages: false,
    missingScopes: [], authorizationStatus: 'disconnected', reauthorizationRequired: false,
    reauthorizationReason: null, authorizedAt: null, refreshTokenExpiresAt: null,
    daysUntilReauthorization: null,
  });
  return shallowMount(SpotifyGenresKanban, {
    global: { provide: {
      [genrePlaylistRegistrationsKey as symbol]: port,
      [genrePlaylistLifecycleKey as symbol]: lifecycle,
    } },
  });
}

function columns(view: ReturnType<typeof mountBoard>) {
  return view.findAll('.border-t-4');
}

async function openKanban(view: ReturnType<typeof mountBoard>) {
  await view.get('nav[aria-label="Secciones de géneros"] button:nth-child(2)').trigger('click');
}

describe('Genre playlist registration flow', () => {
  it('loads registrations through Editorial and keeps the existing user lookup', async () => {
    const loadRegistrations = vi.fn().mockResolvedValue([registration()]);
    const view = mountBoard({
      getGenrePlaylistRegistrations: loadRegistrations,
      updateGenrePlaylistRegistration: vi.fn(),
    });
    await flushPromises();

    expect(loadRegistrations).toHaveBeenCalledOnce();
    expect(mocks.getSpotifyGenresLegacy).not.toHaveBeenCalled();
    expect(mocks.getUsersRv).toHaveBeenCalledOnce();
    expect(view.text()).toContain('Rock');
    view.unmount();
  });

  it('updates status through Editorial and retains the optimistic Kanban behavior', async () => {
    const updateRegistration = vi.fn().mockResolvedValue(registration());
    const view = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([registration()]),
      updateGenrePlaylistRegistration: updateRegistration,
    });
    await flushPromises();
    await openKanban(view);
    await view.get('[draggable="true"]').trigger('dragstart');
    await columns(view)[1].trigger('drop');

    expect(updateRegistration).toHaveBeenCalledWith('genre-1', { status: 'in_progress' });
    expect(mocks.updateSpotifyLegacy).not.toHaveBeenCalled();
    expect(columns(view)[0].find('[draggable="true"]').exists()).toBe(false);
    expect(columns(view)[1].find('[draggable="true"]').exists()).toBe(true);
    view.unmount();
  });

  it('restores status and shows the backend message when the update fails', async () => {
    const failure = { response: { data: { message: 'No se puede mover' } } };
    const updateRegistration = vi.fn().mockRejectedValue(failure);
    const view = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([registration()]),
      updateGenrePlaylistRegistration: updateRegistration,
    });
    await flushPromises();
    await openKanban(view);
    await view.get('[draggable="true"]').trigger('dragstart');
    await columns(view)[1].trigger('drop');
    await flushPromises();

    expect(updateRegistration).toHaveBeenCalledWith('genre-1', { status: 'in_progress' });
    expect(columns(view)[0].find('[draggable="true"]').exists()).toBe(true);
    expect(columns(view)[1].find('[draggable="true"]').exists()).toBe(false);
    expect(mocks.error).toHaveBeenCalledWith('No se puede mover');
    view.unmount();
  });

  it('assigns users through Editorial and preserves rollback and the legacy error', async () => {
    const updateRegistration = vi.fn().mockResolvedValue(registration());
    const view = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([registration()]),
      updateGenrePlaylistRegistration: updateRegistration,
    });
    await flushPromises();
    await openKanban(view);
    await view.get('.cursor-pointer').trigger('click');
    await view.get('select').setValue('user-2');
    await flushPromises();

    expect(updateRegistration).toHaveBeenCalledWith('genre-1', { userId: 'user-2' });
    expect(mocks.updateSpotifyLegacy).not.toHaveBeenCalled();
    expect(view.get('[draggable="true"]').text()).toContain('Bea');
    view.unmount();

    const failedUpdate = vi.fn().mockRejectedValue(new Error('offline'));
    const failedView = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([registration()]),
      updateGenrePlaylistRegistration: failedUpdate,
    });
    await flushPromises();
    await openKanban(failedView);
    await failedView.get('.cursor-pointer').trigger('click');
    await failedView.get('select').setValue('user-2');
    await flushPromises();

    expect(failedUpdate).toHaveBeenCalledWith('genre-1', { userId: 'user-2' });
    expect(failedView.get('[draggable="true"]').text()).toContain('Ana');
    expect(mocks.error).toHaveBeenCalledWith('Error asignando usuario');
    failedView.unmount();
  });

  it('keeps the current load error and empty states', async () => {
    const loadRegistrations = vi.fn().mockRejectedValue({
      response: { data: { message: 'Sin acceso al tablero' } },
    });
    const view = mountBoard({
      getGenrePlaylistRegistrations: loadRegistrations,
      updateGenrePlaylistRegistration: vi.fn(),
    });
    await flushPromises();

    expect(view.text()).toContain('Sin acceso al tablero');
    expect(mocks.error).toHaveBeenCalledWith('Error cargando datos');
    expect(mocks.getSpotifyGenresLegacy).not.toHaveBeenCalled();
    view.unmount();

    const emptyView = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([]),
      updateGenrePlaylistRegistration: vi.fn(),
    });
    await flushPromises();
    expect(emptyView.text()).toContain('Aún no hay playlists de géneros');
    emptyView.unmount();
  });

  it('creates a genre playlist through Editorial with the current trimmed name and payload', async () => {
    const created = { ...registration(), id: 'created-1', name: 'New Rock' };
    const createGenrePlaylist = vi.fn().mockResolvedValue(created);
    const view = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([]),
      updateGenrePlaylistRegistration: vi.fn(),
    }, {
      createGenrePlaylist,
      createLinkedGenrePlaylist: vi.fn(),
      linkExistingGenrePlaylist: vi.fn(),
      deleteGenrePlaylistRegistration: vi.fn(),
    });
    await flushPromises();

    const newGenreButton = view.findAll('button').find((button) => button.text().includes('Nuevo'));
    await newGenreButton!.trigger('click');
    await view.get('input[type="text"]').setValue('  New Rock  ');
    await view.get('textarea').setValue('Description');
    await view.get('input[type="checkbox"]').setValue(false);
    const saveButton = view.findAll('button').find((button) => button.text() === 'Guardar');
    await saveButton!.trigger('click');
    await flushPromises();

    expect(createGenrePlaylist).toHaveBeenCalledWith({
      name: 'New Rock', description: 'Description', public: false,
    });
    expect(mocks.createGenrePlaylist).not.toHaveBeenCalled();
    expect(mocks.success).toHaveBeenCalledWith('Género creado');
    expect(view.text()).toContain('New Rock');
    view.unmount();
  });

  it('creates from an existing Spotify URL through Editorial', async () => {
    const created = { ...registration(), id: 'linked-1', name: 'Linked Rock' };
    const createLinkedGenrePlaylist = vi.fn().mockResolvedValue(created);
    const view = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([]),
      updateGenrePlaylistRegistration: vi.fn(),
    }, {
      createGenrePlaylist: vi.fn(),
      createLinkedGenrePlaylist,
      linkExistingGenrePlaylist: vi.fn(),
      deleteGenrePlaylistRegistration: vi.fn(),
    });
    await flushPromises();

    const newGenreButton = view.findAll('button').find((button) => button.text().includes('Nuevo'));
    await newGenreButton!.trigger('click');
    const linkMode = view.findAll('button').find((button) => button.text() === 'Vincular existente');
    await linkMode!.trigger('click');
    await view.get('input[type="url"]').setValue('https://open.spotify.com/playlist/example');
    const saveButton = view.findAll('button').find((button) => button.text() === 'Guardar');
    await saveButton!.trigger('click');
    await flushPromises();

    expect(createLinkedGenrePlaylist).toHaveBeenCalledWith('https://open.spotify.com/playlist/example');
    expect(mocks.createLinkedGenrePlaylist).not.toHaveBeenCalled();
    expect(mocks.success).toHaveBeenCalledWith('Género creado');
    view.unmount();
  });

  it('keeps the current generic message when genre creation fails', async () => {
    const createGenrePlaylist = vi.fn().mockRejectedValue(new Error('create failed'));
    const view = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([]),
      updateGenrePlaylistRegistration: vi.fn(),
    }, {
      createGenrePlaylist,
      createLinkedGenrePlaylist: vi.fn(),
      linkExistingGenrePlaylist: vi.fn(),
      deleteGenrePlaylistRegistration: vi.fn(),
    });
    await flushPromises();
    const newGenreButton = view.findAll('button').find((button) => button.text().includes('Nuevo'));
    await newGenreButton!.trigger('click');
    await view.get('input[type="text"]').setValue('Rock');
    const saveButton = view.findAll('button').find((button) => button.text() === 'Guardar');
    await saveButton!.trigger('click');
    await flushPromises();

    expect(createGenrePlaylist).toHaveBeenCalledWith({ name: 'Rock', description: '', public: true });
    expect(mocks.error).toHaveBeenCalledWith('Error guardando género');
    expect(view.text()).toContain('Aún no hay playlists de géneros');
    expect(view.findAll('button').some((button) => button.text() === 'Guardar')).toBe(true);
    view.unmount();
  });

  it('keeps existing link confirmation and cancellation behavior', async () => {
    const existing = { ...registration(), link: 'https://open.spotify.com/playlist/example' };
    const linkExistingGenrePlaylist = vi.fn();
    mocks.confirm.mockResolvedValue({ isConfirmed: false });
    const view = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([existing]),
      updateGenrePlaylistRegistration: vi.fn(),
    }, {
      createGenrePlaylist: vi.fn(),
      createLinkedGenrePlaylist: vi.fn(),
      linkExistingGenrePlaylist,
      deleteGenrePlaylistRegistration: vi.fn(),
    });
    await flushPromises();

    const linkButton = view.findAll('button').find((button) => button.text().includes('Vincular con Spotify'));
    await linkButton!.trigger('click');
    await flushPromises();

    expect(mocks.confirm).toHaveBeenCalledWith(
      '¿Vincular con Spotify?',
      'Se conservarán como protegidas las canciones que ya existan en la playlist.',
      'Sí, vincular',
      'Cancelar',
    );
    expect(linkExistingGenrePlaylist).not.toHaveBeenCalled();
    view.unmount();
  });

  it('links an existing playlist through Editorial and keeps the backend error message', async () => {
    const existing = { ...registration(), link: 'https://open.spotify.com/playlist/example' };
    const linked = { ...registration(), spotifyPlaylistId: 'spotify-1' };
    const linkExistingGenrePlaylist = vi.fn().mockResolvedValue(linked);
    mocks.confirm.mockResolvedValue({ isConfirmed: true });
    const view = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([existing]),
      updateGenrePlaylistRegistration: vi.fn(),
    }, {
      createGenrePlaylist: vi.fn(),
      createLinkedGenrePlaylist: vi.fn(),
      linkExistingGenrePlaylist,
      deleteGenrePlaylistRegistration: vi.fn(),
    });
    await flushPromises();
    const linkButton = view.findAll('button').find((button) => button.text().includes('Vincular con Spotify'));
    await linkButton!.trigger('click');
    await flushPromises();

    expect(linkExistingGenrePlaylist).toHaveBeenCalledWith('genre-1');
    expect(view.text()).toContain('Sincronizada');
    expect(mocks.success).toHaveBeenCalledWith('Playlist vinculada correctamente');
    view.unmount();

    const failure = { isAxiosError: true, response: { data: { message: 'Spotify rechazó el enlace' } } };
    const failedLink = vi.fn().mockRejectedValue(failure);
    const failedView = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([existing]),
      updateGenrePlaylistRegistration: vi.fn(),
    }, {
      createGenrePlaylist: vi.fn(),
      createLinkedGenrePlaylist: vi.fn(),
      linkExistingGenrePlaylist: failedLink,
      deleteGenrePlaylistRegistration: vi.fn(),
    });
    await flushPromises();
    const failedLinkButton = failedView.findAll('button').find((button) => button.text().includes('Vincular con Spotify'));
    await failedLinkButton!.trigger('click');
    await flushPromises();
    expect(failedLink).toHaveBeenCalledWith('genre-1');
    expect(mocks.error).toHaveBeenCalledWith('Spotify rechazó el enlace');
    failedView.unmount();
  });

  it('deletes a registration through Editorial after confirmation and preserves errors', async () => {
    const deleteGenrePlaylistRegistration = vi.fn().mockResolvedValue({ ok: true });
    const view = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([registration()]),
      updateGenrePlaylistRegistration: vi.fn(),
    }, {
      createGenrePlaylist: vi.fn(),
      createLinkedGenrePlaylist: vi.fn(),
      linkExistingGenrePlaylist: vi.fn(),
      deleteGenrePlaylistRegistration,
    });
    await flushPromises();
    await openKanban(view);
    mocks.confirm.mockResolvedValue({ isConfirmed: false });
    const deleteButton = view.findAll('button').find((button) => button.find('.fa-trash').exists());
    await deleteButton!.trigger('click');
    await flushPromises();
    expect(deleteGenrePlaylistRegistration).not.toHaveBeenCalled();
    expect(view.text()).toContain('Rock');

    mocks.confirm.mockResolvedValue({ isConfirmed: true });
    const confirmedDeleteButton = view.findAll('button').find((button) => button.find('.fa-trash').exists());
    await confirmedDeleteButton!.trigger('click');
    await flushPromises();
    expect(deleteGenrePlaylistRegistration).toHaveBeenCalledWith('genre-1');
    expect(view.text()).not.toContain('Rock');
    expect(mocks.success).toHaveBeenCalledWith('Género eliminado');
    view.unmount();

    const failure = Object.assign(new Error('delete failed'), {
      isAxiosError: true,
      response: { data: { message: 'No puedes borrar este género' } },
    });
    mocks.confirm.mockResolvedValue({ isConfirmed: true });
    const failedView = mountBoard({
      getGenrePlaylistRegistrations: vi.fn().mockResolvedValue([registration()]),
      updateGenrePlaylistRegistration: vi.fn(),
    }, {
      createGenrePlaylist: vi.fn(),
      createLinkedGenrePlaylist: vi.fn(),
      linkExistingGenrePlaylist: vi.fn(),
      deleteGenrePlaylistRegistration: vi.fn().mockRejectedValue(failure),
    });
    await flushPromises();
    await openKanban(failedView);
    const failedDeleteButton = failedView.findAll('button').find((button) => button.find('.fa-trash').exists());
    await failedDeleteButton!.trigger('click');
    await flushPromises();
    expect(failedView.text()).toContain('Rock');
    expect(mocks.error).toHaveBeenCalledWith('No puedes borrar este género');
    failedView.unmount();
  });
});
