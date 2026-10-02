// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import GenrePlaylistManager from '../../../../src/views/spotify/components/GenrePlaylistManager.vue';
import {
  genreArtistCatalogKey,
  genrePlaylistArtistTracksKey,
  genrePlaylistDataKey,
  genrePlaylistLifecycleKey,
  genrePlaylistMaintenanceKey,
} from '../../../../src/modules/editorial';
import type {
  GenreArtistCatalogPort,
  GenrePlaylistArtistTracksPort,
  GenrePlaylistDataPort,
  GenrePlaylistLifecyclePort,
  GenrePlaylistMaintenancePort,
} from '../../../../src/modules/editorial';

const mocks = vi.hoisted(() => ({
  fetchCatalog: vi.fn(),
  confirm: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@services/spotify/genrePlaylists', () => ({
  updateGenrePlaylistImage: vi.fn(),
}));
vi.mock('@services/spotify/festivalPlaylists', () => ({ validatePlaylistImage: vi.fn(() => null) }));
vi.mock('@services/spotify/spotify', () => ({ removeSpotify: vi.fn() }));
vi.mock('@stores/catalog/catalog', () => ({
  useCatalogStore: () => ({ genres: [], fetchCatalog: mocks.fetchCatalog }),
}));
vi.mock('@services/swal/SwalService', () => ({
  default: { error: mocks.error, success: mocks.success, confirm: mocks.confirm },
}));

const playlist = (withArtist = true) => ({
  id: 'genre-1', name: 'Rock', description: null, status: 'editing' as const,
  link: 'https://open.spotify.com/playlist/1', spotifyPlaylistId: 'spotify-1',
  imageUrl: null, isPublic: true, type: 'genero' as const, updateDate: '2026-10-02',
  createdAt: '2026-10-01', updatedAt: '2026-10-02',
  playlistArtists: withArtist ? [{
    id: 'association-1', spotifyId: 'spotify-artist', artistId: 'artist-1',
    artist: { id: 'artist-1', name: 'Muse' }, status: 'synced' as const,
    setlistsAnalyzed: 0, tracks: [], lastError: null, createdAt: '2026-10-01', updatedAt: '2026-10-02',
  }] : [],
});

const connection = {
  connected: true, spotifyUserId: 'spotify-user', displayName: 'Ana', canUploadImages: true,
  missingScopes: [], authorizationStatus: 'connected' as const, reauthorizationRequired: false,
  reauthorizationReason: null, authorizedAt: null, refreshTokenExpiresAt: null,
  daysUntilReauthorization: null,
};

afterEach(() => vi.clearAllMocks());

function mountManager(maintenance: GenrePlaylistMaintenancePort) {
  mocks.fetchCatalog.mockResolvedValue(undefined);
  const details: GenrePlaylistDataPort = {
    getGenrePlaylist: vi.fn().mockResolvedValue(playlist()),
    updateGenrePlaylistMetadata: vi.fn(),
    updateGenrePlaylistImage: vi.fn(),
  };
  const artists: GenreArtistCatalogPort = {
    searchArtists: vi.fn(), createPendingArtist: vi.fn(),
  };
  const tracks: GenrePlaylistArtistTracksPort = {
    searchArtistTracks: vi.fn(), addArtist: vi.fn(),
    replaceArtistTracks: vi.fn(), removeArtist: vi.fn(),
  };
  return shallowMount(GenrePlaylistManager, {
    props: { playlistId: 'genre-1', playlistName: 'Fallback', connection },
    global: { provide: {
      [genrePlaylistDataKey as symbol]: details,
      [genrePlaylistLifecycleKey as symbol]: {
        createGenrePlaylist: vi.fn(),
        createLinkedGenrePlaylist: vi.fn(),
        linkExistingGenrePlaylist: vi.fn(),
        deleteGenrePlaylistRegistration: vi.fn(),
      } satisfies GenrePlaylistLifecyclePort,
      [genreArtistCatalogKey as symbol]: artists,
      [genrePlaylistArtistTracksKey as symbol]: tracks,
      [genrePlaylistMaintenanceKey as symbol]: maintenance,
    } },
  });
}

describe('Genre playlist maintenance flow', () => {
  it('keeps clear confirmation, cancellation, success result and message', async () => {
    const clearPlaylist = vi.fn().mockResolvedValue(playlist(false));
    const view = mountManager({ clearPlaylist, shufflePlaylist: vi.fn() });
    await flushPromises();
    mocks.confirm.mockResolvedValue({ isConfirmed: false });
    await view.findAll('button').find((button) => button.text().includes('Vaciar canciones'))!.trigger('click');
    expect(mocks.confirm).toHaveBeenCalledWith(
      '¿Vaciar completamente la playlist?',
      'Se eliminarán todas las canciones reales y asociaciones de artistas.',
      'Sí, vaciar',
      'Cancelar',
    );
    expect(clearPlaylist).not.toHaveBeenCalled();

    mocks.confirm.mockResolvedValue({ isConfirmed: true });
    await view.findAll('button').find((button) => button.text().includes('Vaciar canciones'))!.trigger('click');
    await flushPromises();
    expect(clearPlaylist).toHaveBeenCalledWith('genre-1');
    expect(view.text()).toContain('Todavía no hay artistas.');
    expect(mocks.success).toHaveBeenCalledWith('Playlist vaciada');
    expect(view.emitted('updated')?.at(-1)?.[0]).toMatchObject({ playlistArtists: [] });
    view.unmount();
  });

  it('keeps the clear error message and current playlist data on failure', async () => {
    const failure = Object.assign(new Error('request failed'), {
      isAxiosError: true, response: { data: { message: 'No se pudo vaciar' } },
    });
    const clearPlaylist = vi.fn().mockRejectedValue(failure);
    const view = mountManager({ clearPlaylist, shufflePlaylist: vi.fn() });
    await flushPromises();
    mocks.confirm.mockResolvedValue({ isConfirmed: true });
    await view.findAll('button').find((button) => button.text().includes('Vaciar canciones'))!.trigger('click');
    await flushPromises();

    expect(clearPlaylist).toHaveBeenCalledWith('genre-1');
    expect(view.text()).toContain('Muse');
    expect(mocks.error).toHaveBeenCalledWith('No se pudo vaciar');
    view.unmount();
  });

  it('keeps shuffle confirmation, cancellation, success result and message', async () => {
    const shufflePlaylist = vi.fn().mockResolvedValue(playlist());
    const view = mountManager({ clearPlaylist: vi.fn(), shufflePlaylist });
    await flushPromises();
    mocks.confirm.mockResolvedValue({ isConfirmed: false });
    await view.findAll('button').find((button) => button.text().includes('Mezclar orden'))!.trigger('click');
    expect(mocks.confirm).toHaveBeenCalledWith(
      '¿Mezclar el orden de la playlist?',
      'Se conservarán todas las canciones, pero cambiará su orden real en Spotify.',
      'Sí, mezclar',
      'Cancelar',
    );
    expect(shufflePlaylist).not.toHaveBeenCalled();

    mocks.confirm.mockResolvedValue({ isConfirmed: true });
    await view.findAll('button').find((button) => button.text().includes('Mezclar orden'))!.trigger('click');
    await flushPromises();
    expect(shufflePlaylist).toHaveBeenCalledWith('genre-1');
    expect(mocks.success).toHaveBeenCalledWith('Orden de la playlist mezclado');
    view.unmount();
  });

  it('keeps the shuffle error message and current playlist data on failure', async () => {
    const failure = Object.assign(new Error('request failed'), {
      isAxiosError: true, response: { data: { message: 'No se pudo mezclar' } },
    });
    const shufflePlaylist = vi.fn().mockRejectedValue(failure);
    const view = mountManager({ clearPlaylist: vi.fn(), shufflePlaylist });
    await flushPromises();
    mocks.confirm.mockResolvedValue({ isConfirmed: true });
    await view.findAll('button').find((button) => button.text().includes('Mezclar orden'))!.trigger('click');
    await flushPromises();

    expect(shufflePlaylist).toHaveBeenCalledWith('genre-1');
    expect(view.text()).toContain('Muse');
    expect(mocks.error).toHaveBeenCalledWith('No se pudo mezclar');
    view.unmount();
  });
});
