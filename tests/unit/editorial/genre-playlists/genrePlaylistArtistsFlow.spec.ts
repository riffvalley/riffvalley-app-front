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
  error: vi.fn(),
  success: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@services/spotify/genrePlaylists', () => ({
  clearGenrePlaylist: vi.fn(),
  shuffleGenrePlaylist: vi.fn(),
  updateGenrePlaylistImage: vi.fn(),
}));
vi.mock('@services/spotify/festivalPlaylists', () => ({ validatePlaylistImage: vi.fn(() => null) }));
vi.mock('@services/spotify/spotify', () => ({ removeSpotify: vi.fn() }));
vi.mock('@stores/catalog/catalog', () => ({
  useCatalogStore: () => ({ genres: [{ id: 'genre-1', name: 'Rock' }], fetchCatalog: mocks.fetchCatalog }),
}));
vi.mock('@services/swal/SwalService', () => ({
  default: { error: mocks.error, success: mocks.success, confirm: mocks.confirm },
}));

const track = (id: string) => ({
  spotifyTrackId: id, uri: `spotify:track:${id}`, name: `Track ${id}`,
  url: `https://open.spotify.com/track/${id}`, plays: 0,
  artists: [{ id: 'spotify-artist', name: 'Muse' }],
});

const artist = { id: 'artist-1', name: 'Muse', image: null, description: null };

const association = () => ({
  id: 'association-1', spotifyId: 'spotify-artist', artistId: artist.id, artist,
  status: 'synced' as const, selectionMode: 'manual' as const, spotifyArtistId: 'spotify-artist',
  setlistsAnalyzed: 0, tracks: [track('saved-1'), track('saved-2')], lastError: null,
  createdAt: '2026-10-01', updatedAt: '2026-10-02',
});

const playlist = (playlistArtists = [association()]) => ({
  id: 'genre-1', name: 'Rock', description: null, status: 'editing' as const,
  link: 'https://open.spotify.com/playlist/1', spotifyPlaylistId: 'spotify-playlist',
  imageUrl: null, isPublic: true, type: 'genero' as const, updateDate: '2026-10-02',
  createdAt: '2026-10-01', updatedAt: '2026-10-02', playlistArtists,
});

const connection = {
  connected: true, spotifyUserId: 'spotify-user', displayName: 'Ana', canUploadImages: true,
  missingScopes: [], authorizationStatus: 'connected' as const, reauthorizationRequired: false,
  reauthorizationReason: null, authorizedAt: null, refreshTokenExpiresAt: null,
  daysUntilReauthorization: null,
};

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

function mountManager(options?: {
  artists?: GenreArtistCatalogPort;
  tracks?: GenrePlaylistArtistTracksPort;
  details?: GenrePlaylistDataPort;
}) {
  mocks.fetchCatalog.mockResolvedValue(undefined);
  const details = options?.details ?? {
    getGenrePlaylist: vi.fn().mockResolvedValue(playlist()),
    updateGenrePlaylistMetadata: vi.fn(),
    updateGenrePlaylistImage: vi.fn(),
  };
  const artists = options?.artists ?? {
    searchArtists: vi.fn().mockResolvedValue({
      totalItems: 1, totalPages: 1, currentPage: 1, limit: 30, data: [artist],
    }),
    createPendingArtist: vi.fn().mockResolvedValue({ ...artist, needsReview: true as const }),
  };
  const tracks = options?.tracks ?? {
    searchArtistTracks: vi.fn().mockResolvedValue({
      artist: { id: artist.id, name: artist.name }, query: '', tracks: [track('track-1'), track('track-2'), track('track-3')],
    }),
    addArtist: vi.fn().mockResolvedValue(playlist()),
    replaceArtistTracks: vi.fn().mockResolvedValue(playlist()),
    removeArtist: vi.fn().mockResolvedValue(playlist([])),
  };
  const view = shallowMount(GenrePlaylistManager, {
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
      [genrePlaylistMaintenanceKey as symbol]: {
        clearPlaylist: vi.fn().mockResolvedValue(playlist([])),
        shufflePlaylist: vi.fn().mockResolvedValue(playlist()),
      } satisfies GenrePlaylistMaintenancePort,
    } },
  });
  return { view, artists, tracks };
}

describe('Genre playlist artist and track flow', () => {
  it('searches artists with the existing query and page limits, then keeps the two-track limit', async () => {
    const searchArtists = vi.fn().mockResolvedValue({
      totalItems: 1, totalPages: 1, currentPage: 1, limit: 30, data: [artist],
    });
    const searchArtistTracks = vi.fn().mockResolvedValue({
      artist: { id: artist.id, name: artist.name }, query: '',
      tracks: [track('track-1'), track('track-2'), track('track-3')],
    });
    const addArtist = vi.fn().mockResolvedValue(playlist([]));
    const { view } = mountManager({
      artists: { searchArtists, createPendingArtist: vi.fn() },
      tracks: {
        searchArtistTracks, addArtist, replaceArtistTracks: vi.fn(), removeArtist: vi.fn(),
      },
      details: {
        getGenrePlaylist: vi.fn().mockResolvedValue(playlist([])),
        updateGenrePlaylistMetadata: vi.fn(),
        updateGenrePlaylistImage: vi.fn(),
      },
    });
    await flushPromises();
    await view.findAll('button').find((button) => button.text().includes('Añadir artista'))!.trigger('click');
    await flushPromises();

    expect(searchArtists).toHaveBeenCalledWith('', 30, 0, undefined);
    await view.findAll('button').find((button) => button.text().includes('Muse'))!.trigger('click');
    await flushPromises();
    expect(searchArtistTracks).toHaveBeenCalledWith('genre-1', 'artist-1', '');

    const trackButtons = () => view.findAll('button').filter((button) => /Track track-/.test(button.text()));
    await trackButtons()[0].trigger('click');
    await trackButtons()[1].trigger('click');
    await trackButtons()[2].trigger('click');
    expect(view.text()).toContain('2/2 seleccionadas');
    expect(mocks.error).toHaveBeenCalledWith('Sólo puedes seleccionar dos canciones');
    await view.get('footer button').trigger('click');
    await flushPromises();

    expect(addArtist).toHaveBeenCalledWith('genre-1', 'artist-1', ['track-1', 'track-2']);
    expect(mocks.success).toHaveBeenCalledWith('Artista y canciones sincronizados');
    view.unmount();
  });

  it('creates a pending artist with the trimmed name and searches its tracks', async () => {
    const createPendingArtist = vi.fn().mockResolvedValue({ ...artist, needsReview: true as const });
    const searchArtistTracks = vi.fn().mockResolvedValue({
      artist: { id: artist.id, name: artist.name }, query: '', tracks: [],
    });
    const { view } = mountManager({
      artists: {
        searchArtists: vi.fn().mockResolvedValue({
          totalItems: 0, totalPages: 0, currentPage: 1, limit: 30, data: [],
        }),
        createPendingArtist,
      },
      tracks: {
        searchArtistTracks, addArtist: vi.fn(), replaceArtistTracks: vi.fn(), removeArtist: vi.fn(),
      },
    });
    await flushPromises();
    await view.findAll('button').find((button) => button.text().includes('Añadir artista'))!.trigger('click');
    await flushPromises();
    await view.get('input[type="search"]').setValue(' New artist ');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await flushPromises();

    const createButton = view.findAll('button').find((button) => button.text().includes('Crear artista'));
    await createButton!.trigger('click');
    await flushPromises();
    expect(createPendingArtist).toHaveBeenCalledWith('New artist');
    expect(searchArtistTracks).toHaveBeenCalledWith('genre-1', 'artist-1', '');
    expect(view.text()).toContain('Canciones de Muse');
    view.unmount();
  });

  it('replaces tracks in their existing order when editing an association', async () => {
    const replaceArtistTracks = vi.fn().mockResolvedValue(playlist());
    const searchArtistTracks = vi.fn().mockResolvedValue({
      artist: { id: artist.id, name: artist.name }, query: '', tracks: [],
    });
    const { view } = mountManager({
      tracks: {
        searchArtistTracks, addArtist: vi.fn(), replaceArtistTracks, removeArtist: vi.fn(),
      },
    });
    await flushPromises();
    await view.get('button[title="Cambiar canciones"]').trigger('click');
    await flushPromises();
    expect(searchArtistTracks).toHaveBeenCalledWith('genre-1', 'artist-1', '');
    expect(view.text()).toContain('2/2 seleccionadas');
    await view.findAll('button').find((button) => button.text().includes('Guardar nuevas canciones'))!.trigger('click');
    await flushPromises();

    expect(replaceArtistTracks).toHaveBeenCalledWith('genre-1', 'artist-1', ['saved-1', 'saved-2']);
    view.unmount();
  });

  it('removes an artist only after confirmation and preserves the error message', async () => {
    const removeArtist = vi.fn().mockResolvedValue(playlist([]));
    const { view } = mountManager({
      tracks: {
        searchArtistTracks: vi.fn(), addArtist: vi.fn(),
        replaceArtistTracks: vi.fn(), removeArtist,
      },
    });
    await flushPromises();
    mocks.confirm.mockResolvedValue({ isConfirmed: false });
    await view.get('button[title="Eliminar artista"]').trigger('click');
    expect(removeArtist).not.toHaveBeenCalled();

    mocks.confirm.mockResolvedValue({ isConfirmed: true });
    await view.get('button[title="Eliminar artista"]').trigger('click');
    await flushPromises();
    expect(removeArtist).toHaveBeenCalledWith('genre-1', 'artist-1');
    expect(mocks.success).toHaveBeenCalledWith('Artista eliminado');
    view.unmount();

    mocks.confirm.mockResolvedValue({ isConfirmed: true });
    const failedRemove = vi.fn().mockRejectedValue({
      isAxiosError: true, response: { data: { message: 'Artista protegido' } },
    });
    const failedView = mountManager({
      tracks: {
        searchArtistTracks: vi.fn(), addArtist: vi.fn(),
        replaceArtistTracks: vi.fn(), removeArtist: failedRemove,
      },
    }).view;
    await flushPromises();
    await failedView.get('button[title="Eliminar artista"]').trigger('click');
    await flushPromises();
    expect(failedRemove).toHaveBeenCalledWith('genre-1', 'artist-1');
    expect(mocks.error).toHaveBeenCalledWith('Artista protegido');
    failedView.unmount();
  });

  it('preserves empty search state and reports artist and track errors', async () => {
    const searchArtists = vi.fn().mockRejectedValue({
      isAxiosError: true, response: { data: { message: 'No hay permiso' } },
    });
    const { view } = mountManager({
      artists: {
        searchArtists,
        createPendingArtist: vi.fn(),
      },
      tracks: {
        searchArtistTracks: vi.fn().mockRejectedValue({
          isAxiosError: true, response: { data: { message: 'Spotify no responde' } },
        }),
        addArtist: vi.fn(), replaceArtistTracks: vi.fn(), removeArtist: vi.fn(),
      },
    });
    await flushPromises();
    await view.findAll('button').find((button) => button.text().includes('Añadir artista'))!.trigger('click');
    await flushPromises();
    expect(view.text()).toContain('No hay artistas para estos filtros.');
    expect(mocks.error).toHaveBeenCalledWith('No hay permiso');
    view.unmount();

    const failingTracks = vi.fn().mockRejectedValue({
      isAxiosError: true, response: { data: { message: 'Spotify no responde' } },
    });
    const trackView = mountManager({
      tracks: {
        searchArtistTracks: failingTracks,
        addArtist: vi.fn(), replaceArtistTracks: vi.fn(), removeArtist: vi.fn(),
      },
    }).view;
    await flushPromises();
    await trackView.findAll('button').find((button) => button.text().includes('Añadir artista'))!.trigger('click');
    await flushPromises();
    await trackView.findAll('button').find((button) => button.text().includes('Muse'))!.trigger('click');
    await flushPromises();
    expect(failingTracks).toHaveBeenCalledWith('genre-1', 'artist-1', '');
    expect(mocks.error).toHaveBeenCalledWith('Spotify no responde');
    trackView.unmount();
  });
});
