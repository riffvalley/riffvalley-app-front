// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import GenrePlaylistManager from '../../../../src/views/spotify/components/GenrePlaylistManager.vue';
import {
  genreArtistCatalogKey,
  genrePlaylistArtistTracksKey,
  genrePlaylistDataKey,
  genrePlaylistMaintenanceKey,
} from '../../../../src/modules/editorial';
import type {
  GenreArtistCatalogPort,
  GenrePlaylistArtistTracksPort,
  GenrePlaylistMaintenancePort,
} from '../../../../src/modules/editorial';
import type { GenrePlaylistDataPort } from '../../../../src/modules/editorial';

const mocks = vi.hoisted(() => ({
  getGenrePlaylistLegacy: vi.fn(),
  updateGenrePlaylistLegacy: vi.fn(),
  fetchCatalog: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@services/spotify/genrePlaylists', () => ({
  addGenreArtist: vi.fn(),
  clearGenrePlaylist: vi.fn(),
  getGenrePlaylist: mocks.getGenrePlaylistLegacy,
  removeGenreArtist: vi.fn(),
  replaceGenreArtistTracks: vi.fn(),
  searchGenreArtistTracks: vi.fn(),
  shuffleGenrePlaylist: vi.fn(),
  updateGenrePlaylist: mocks.updateGenrePlaylistLegacy,
  updateGenrePlaylistImage: vi.fn(),
}));
vi.mock('@services/spotify/festivalPlaylists', () => ({
  createPendingFestivalArtist: vi.fn(),
  searchFestivalArtists: vi.fn(),
  validatePlaylistImage: vi.fn(() => null),
}));
vi.mock('@services/spotify/spotify', () => ({ removeSpotify: vi.fn() }));
vi.mock('@stores/catalog/catalog', () => ({
  useCatalogStore: () => ({ fetchCatalog: mocks.fetchCatalog }),
}));
vi.mock('@services/swal/SwalService', () => ({
  default: { error: mocks.error, success: mocks.success, confirm: vi.fn() },
}));

const playlist = () => ({
  id: 'genre-1', name: 'Rock', description: 'Classic rock', status: 'editing' as const,
  link: 'https://open.spotify.com/playlist/1', spotifyPlaylistId: 'spotify-1',
  imageUrl: null, isPublic: true, type: 'genero' as const, updateDate: '2026-10-02',
  createdAt: '2026-10-01', updatedAt: '2026-10-02', playlistArtists: [],
});

const connection = {
  connected: true, spotifyUserId: 'spotify-user', displayName: 'Ana', canUploadImages: true,
  missingScopes: [], authorizationStatus: 'connected' as const, reauthorizationRequired: false,
  reauthorizationReason: null, authorizedAt: null, refreshTokenExpiresAt: null,
  daysUntilReauthorization: null,
};

afterEach(() => vi.clearAllMocks());

function mountManager(port: GenrePlaylistDataPort) {
  mocks.fetchCatalog.mockResolvedValue(undefined);
  return shallowMount(GenrePlaylistManager, {
    props: { playlistId: 'genre-1', playlistName: 'Fallback', connection },
    global: { provide: {
      [genrePlaylistDataKey as symbol]: port,
      [genreArtistCatalogKey as symbol]: {
        searchArtists: vi.fn(), createPendingArtist: vi.fn(),
      } satisfies GenreArtistCatalogPort,
      [genrePlaylistArtistTracksKey as symbol]: {
        searchArtistTracks: vi.fn(), addArtist: vi.fn(),
        replaceArtistTracks: vi.fn(), removeArtist: vi.fn(),
      } satisfies GenrePlaylistArtistTracksPort,
      [genrePlaylistMaintenanceKey as symbol]: {
        clearPlaylist: vi.fn(), shufflePlaylist: vi.fn(),
      } satisfies GenrePlaylistMaintenancePort,
    } },
  });
}

describe('Genre playlist metadata flow', () => {
  it('loads playlist metadata through Editorial and populates the existing form', async () => {
    const value = playlist();
    const getGenrePlaylist = vi.fn().mockResolvedValue(value);
    const view = mountManager({
      getGenrePlaylist,
      updateGenrePlaylistMetadata: vi.fn(),
      updateGenrePlaylistImage: vi.fn(),
    });
    await flushPromises();

    expect(getGenrePlaylist).toHaveBeenCalledWith('genre-1');
    expect(mocks.getGenrePlaylistLegacy).not.toHaveBeenCalled();
    expect(view.get('input:not([type])').element).toMatchObject({ value: 'Rock', maxLength: 100 });
    expect(view.get('textarea').element).toMatchObject({ value: 'Classic rock', maxLength: 300 });
    expect(view.text()).toContain('La visibilidad se guarda automáticamente');
    view.unmount();
  });

  it('keeps the required name validation and sends trimmed metadata', async () => {
    const updateGenrePlaylistMetadata = vi.fn().mockResolvedValue(playlist());
    const view = mountManager({
      getGenrePlaylist: vi.fn().mockResolvedValue(playlist()),
      updateGenrePlaylistMetadata,
      updateGenrePlaylistImage: vi.fn(),
    });
    await flushPromises();

    const name = view.get('input:not([type])');
    await name.setValue('   ');
    const saveName = view.get('button[title="Guardar nombre"]');
    expect((saveName.element as HTMLButtonElement).disabled).toBe(true);
    await saveName.trigger('click');
    expect(updateGenrePlaylistMetadata).not.toHaveBeenCalled();

    await name.setValue('  New Rock  ');
    await view.get('button[title="Guardar nombre"]').trigger('click');
    await flushPromises();

    expect(updateGenrePlaylistMetadata).toHaveBeenCalledWith('genre-1', { name: 'New Rock' });
    expect(mocks.updateGenrePlaylistLegacy).not.toHaveBeenCalled();
    expect(view.find('h2').text()).toBe('New Rock');
    view.unmount();
  });

  it('saves description and visibility using their existing payloads', async () => {
    const updateGenrePlaylistMetadata = vi.fn().mockResolvedValue(playlist());
    const view = mountManager({
      getGenrePlaylist: vi.fn().mockResolvedValue(playlist()),
      updateGenrePlaylistMetadata,
      updateGenrePlaylistImage: vi.fn(),
    });
    await flushPromises();

    await view.get('textarea').setValue('New description');
    await view.get('button[title="Guardar descripción"]').trigger('click');
    await flushPromises();
    expect(updateGenrePlaylistMetadata).toHaveBeenCalledWith('genre-1', {
      description: 'New description',
    });

    await view.get('input[type="checkbox"]').setValue(false);
    await flushPromises();
    expect(updateGenrePlaylistMetadata).toHaveBeenLastCalledWith('genre-1', { public: false });
    view.unmount();
  });

  it('keeps the edited value and reports the backend message when saving fails', async () => {
    const failure = Object.assign(new Error('request failed'), {
      isAxiosError: true,
      response: { data: { message: 'Nombre no permitido' } },
    });
    const updateGenrePlaylistMetadata = vi.fn().mockRejectedValue(failure);
    const view = mountManager({
      getGenrePlaylist: vi.fn().mockResolvedValue(playlist()),
      updateGenrePlaylistMetadata,
      updateGenrePlaylistImage: vi.fn(),
    });
    await flushPromises();

    await view.get('input:not([type])').setValue('New Rock');
    await view.get('button[title="Guardar nombre"]').trigger('click');
    await flushPromises();

    expect(updateGenrePlaylistMetadata).toHaveBeenCalledWith('genre-1', { name: 'New Rock' });
    expect(view.find('h2').text()).toBe('Rock');
    expect(view.get('input:not([type])').element).toMatchObject({ value: 'New Rock' });
    expect(mocks.error).toHaveBeenCalledWith('Nombre no permitido');
    view.unmount();
  });

  it('keeps the load error message and closes the manager when details cannot load', async () => {
    const failure = Object.assign(new Error('request failed'), {
      isAxiosError: true,
      response: { data: { message: 'No se pudo leer' } },
    });
    const view = mountManager({
      getGenrePlaylist: vi.fn().mockRejectedValue(failure),
      updateGenrePlaylistMetadata: vi.fn(),
      updateGenrePlaylistImage: vi.fn(),
    });
    await flushPromises();

    expect(mocks.getGenrePlaylistLegacy).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('No se pudo leer');
    expect(view.emitted('close')).toHaveLength(1);
    view.unmount();
  });
});
