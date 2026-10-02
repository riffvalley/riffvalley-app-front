import { afterEach, describe, expect, it, vi } from 'vitest';
import { genrePlaylistArtistTracksApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genrePlaylistArtistTracksApi';
import { genreArtistCatalogApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genreArtistCatalogApi';
import { genrePlaylistDataApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genrePlaylistDataApi';
import { genrePlaylistLifecycleApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genrePlaylistLifecycleApi';
import { genrePlaylistMaintenanceApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genrePlaylistMaintenanceApi';
import { genrePlaylistRegistrationsApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genrePlaylistRegistrationsApi';

const { get, patch, post, put, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), deleteRequest: vi.fn(),
}));
vi.mock('@/shared/infrastructure/http/client', () => ({
  default: { get, patch, post, put, delete: deleteRequest },
}));

afterEach(() => vi.clearAllMocks());

describe('Editorial genre playlists API', () => {
  it('searches the artist management endpoint with its exact filters', async () => {
    const result = { totalItems: 1, totalPages: 1, currentPage: 1, limit: 30, data: [] };
    get.mockResolvedValue({ data: result });

    await expect(genreArtistCatalogApi.searchArtists('Muse', 30, 0, 'genre-1'))
      .resolves.toBe(result);
    expect(get).toHaveBeenCalledWith('/artists/management', {
      params: { query: 'Muse', limit: 30, offset: 0, genreId: 'genre-1' },
    });
  });

  it('creates an artist in the pending review queue with the current payload', async () => {
    const artist = { id: 'artist-1', name: 'New artist', needsReview: true as const };
    post.mockResolvedValue({ data: artist });

    await expect(genreArtistCatalogApi.createPendingArtist('New artist')).resolves.toBe(artist);
    expect(post).toHaveBeenCalledWith('/artists', { name: 'New artist' });
  });

  it('reads kanban registrations and updates them using the legacy endpoints', async () => {
    const registrations = [{ id: 'genre-1', name: 'Rock', content: null }];
    const registration = { ...registrations[0], status: 'ready' };
    get.mockResolvedValue({ data: registrations });
    patch.mockResolvedValue({ data: registration });

    await expect(genrePlaylistRegistrationsApi.getGenrePlaylistRegistrations())
      .resolves.toBe(registrations);
    await expect(genrePlaylistRegistrationsApi.updateGenrePlaylistRegistration(
      'genre-1', { status: 'ready' },
    )).resolves.toBe(registration);
    expect(get).toHaveBeenCalledWith('/spotify/genres');
    expect(patch).toHaveBeenCalledWith('/spotify/genre-1', { status: 'ready' });
  });

  it('reads and updates genre playlist details and uploads image bytes', async () => {
    const playlist = { id: 'genre-1', type: 'genero', playlistArtists: [] };
    get.mockResolvedValue({ data: playlist });
    patch.mockResolvedValue({ data: playlist });
    put.mockResolvedValue({ data: playlist });

    await expect(genrePlaylistDataApi.getGenrePlaylist('genre-1')).resolves.toBe(playlist);
    const metadata = { name: 'Rock', description: 'Desc', public: false };
    await expect(genrePlaylistDataApi.updateGenrePlaylistMetadata('genre-1', metadata))
      .resolves.toBe(playlist);
    await expect(genrePlaylistDataApi.updateGenrePlaylistImage('genre-1', {
      filename: 'cover.jpg', contentType: 'image/jpeg', bytes: new ArrayBuffer(4),
    })).resolves.toBe(playlist);

    expect(get).toHaveBeenCalledWith('/genre-playlists/genre-1');
    expect(patch).toHaveBeenCalledWith('/genre-playlists/genre-1', metadata);
    const [endpoint, body, config] = put.mock.calls[0];
    expect(endpoint).toBe('/genre-playlists/genre-1/image');
    expect(body).toBeInstanceOf(FormData);
    const uploadedFile = body.get('image') as File;
    expect(uploadedFile.name).toBe('cover.jpg');
    expect(uploadedFile.type).toBe('image/jpeg');
    expect(uploadedFile.size).toBe(4);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  it('creates and links playlists with the existing payloads', async () => {
    const playlist = { id: 'genre-1' };
    post.mockResolvedValue({ data: playlist });

    await expect(genrePlaylistLifecycleApi.createGenrePlaylist({
      name: 'Rock', description: 'Desc', public: true,
    })).resolves.toBe(playlist);
    await expect(genrePlaylistLifecycleApi.createLinkedGenrePlaylist('spotify-url'))
      .resolves.toBe(playlist);
    await expect(genrePlaylistLifecycleApi.linkExistingGenrePlaylist('genre-1'))
      .resolves.toBe(playlist);

    expect(post).toHaveBeenNthCalledWith(1, '/genre-playlists', {
      name: 'Rock', description: 'Desc', public: true,
    });
    expect(post).toHaveBeenNthCalledWith(2, '/genre-playlists/link', { spotifyUrl: 'spotify-url' });
    expect(post).toHaveBeenNthCalledWith(3, '/genre-playlists/genre-1/link');
  });

  it('deletes a genre registration through its legacy endpoint', async () => {
    const result = { ok: true as const };
    deleteRequest.mockResolvedValue({ data: result });

    await expect(genrePlaylistLifecycleApi.deleteGenrePlaylistRegistration('genre-1'))
      .resolves.toBe(result);
    expect(deleteRequest).toHaveBeenCalledWith('/spotify/genre-1');
  });

  it('searches, adds, replaces and removes artists using the legacy routes and data', async () => {
    const playlist = { id: 'genre-1', playlistArtists: [] };
    const search = { artist: { id: 'artist-1', name: 'Artist' }, query: 'live', tracks: [] };
    get.mockResolvedValue({ data: search });
    post.mockResolvedValue({ data: playlist });
    put.mockResolvedValue({ data: playlist });
    deleteRequest.mockResolvedValue({ data: playlist });

    await expect(genrePlaylistArtistTracksApi.searchArtistTracks('genre-1', 'artist-1', ' live '))
      .resolves.toBe(search);
    await genrePlaylistArtistTracksApi.searchArtistTracks('genre-1', 'artist-1', '  ');
    await expect(genrePlaylistArtistTracksApi.addArtist('genre-1', 'artist-1', ['track-1']))
      .resolves.toBe(playlist);
    await expect(genrePlaylistArtistTracksApi.replaceArtistTracks(
      'genre-1', 'artist-1', ['track-2'],
    )).resolves.toBe(playlist);
    await expect(genrePlaylistArtistTracksApi.removeArtist('genre-1', 'artist-1'))
      .resolves.toBe(playlist);

    expect(get).toHaveBeenNthCalledWith(1, '/genre-playlists/genre-1/artists/artist-1/tracks', {
      params: { q: 'live' },
    });
    expect(get).toHaveBeenNthCalledWith(2, '/genre-playlists/genre-1/artists/artist-1/tracks', {
      params: undefined,
    });
    expect(post).toHaveBeenCalledWith('/genre-playlists/genre-1/artists', {
      artistId: 'artist-1', spotifyTrackIds: ['track-1'],
    });
    expect(put).toHaveBeenCalledWith(
      '/genre-playlists/genre-1/artists/artist-1/tracks', { spotifyTrackIds: ['track-2'] },
    );
    expect(deleteRequest).toHaveBeenCalledWith('/genre-playlists/genre-1/artists/artist-1');
  });

  it('clears and shuffles a playlist using the existing routes', async () => {
    const playlist = { id: 'genre-1' };
    deleteRequest.mockResolvedValue({ data: playlist });
    post.mockResolvedValue({ data: playlist });

    await expect(genrePlaylistMaintenanceApi.clearPlaylist('genre-1')).resolves.toBe(playlist);
    await expect(genrePlaylistMaintenanceApi.shufflePlaylist('genre-1')).resolves.toBe(playlist);
    expect(deleteRequest).toHaveBeenCalledWith('/genre-playlists/genre-1/tracks');
    expect(post).toHaveBeenCalledWith('/genre-playlists/genre-1/shuffle');
  });

  it('propagates HTTP failures unchanged', async () => {
    const failure = new Error('request failed');
    get.mockRejectedValue(failure);
    post.mockRejectedValue(failure);
    deleteRequest.mockRejectedValue(failure);

    await expect(genreArtistCatalogApi.searchArtists('Muse', 30, 0))
      .rejects.toBe(failure);
    await expect(genreArtistCatalogApi.createPendingArtist('Muse')).rejects.toBe(failure);
    await expect(genrePlaylistRegistrationsApi.getGenrePlaylistRegistrations())
      .rejects.toBe(failure);
    await expect(genrePlaylistDataApi.getGenrePlaylist('genre-1')).rejects.toBe(failure);
    await expect(genrePlaylistArtistTracksApi.searchArtistTracks('genre-1', 'artist-1'))
      .rejects.toBe(failure);
    await expect(genrePlaylistLifecycleApi.deleteGenrePlaylistRegistration('genre-1'))
      .rejects.toBe(failure);
  });
});
