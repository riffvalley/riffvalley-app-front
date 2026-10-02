import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  festivalPlaylistDataApi,
  festivalPlaylistLifecycleApi,
  festivalPlaylistRegistrationsApi,
} from '../../../../src/modules/editorial/festival-playlists/infrastructure/festivalPlaylistsApi';
import { festivalArtistCatalogApi } from '../../../../src/modules/editorial/festival-playlists/infrastructure/festivalArtistCatalogApi';
import { festivalPlaylistArtistTracksApi } from '../../../../src/modules/editorial/festival-playlists/infrastructure/festivalPlaylistArtistTracksApi';

const { get, patch, post, put, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), deleteRequest: vi.fn(),
}));
vi.mock('@/shared/infrastructure/http/client', () => ({
  default: { get, patch, post, put, delete: deleteRequest },
}));

afterEach(() => vi.clearAllMocks());

describe('Editorial festival playlists API', () => {
  it('reads festival registrations from the existing endpoint unchanged', async () => {
    const registrations = [{
      id: 'festival-1', name: 'Festival', status: 'in_progress', link: '', type: 'festival',
      updateDate: '2026-10-02', content: null,
    }];
    get.mockResolvedValue({ data: registrations });

    await expect(festivalPlaylistRegistrationsApi.getFestivalRegistrations())
      .resolves.toBe(registrations);
    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith('/spotify/festivals');
  });

  it('reads playlist data using the existing detail endpoint', async () => {
    const playlist = {
      id: 'festival-1', name: 'Festival', description: null, status: 'in_progress',
      link: '', spotifyPlaylistId: 'spotify-1', imageUrl: null, isPublic: true,
      type: 'festival', updateDate: '2026-10-02', createdAt: '2026-10-01',
      updatedAt: '2026-10-02', playlistArtists: [],
    };
    get.mockResolvedValue({ data: playlist });

    await expect(festivalPlaylistDataApi.getFestivalPlaylistData('festival-1'))
      .resolves.toBe(playlist);
    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith('/festival-playlists/festival-1');
  });

  it('updates metadata through the existing PATCH endpoint and payload', async () => {
    const payload = { name: 'Nombre actualizado', public: false };
    patch.mockResolvedValue({ data: { id: 'festival-1' } });

    await expect(festivalPlaylistDataApi.updateFestivalPlaylistMetadata(
      'festival-1', payload,
    )).resolves.toBeUndefined();
    expect(patch).toHaveBeenCalledWith('/festival-playlists/festival-1', payload);
  });

  it('uploads image bytes as the existing multipart image field', async () => {
    const bytes = new ArrayBuffer(4);
    put.mockResolvedValue({ data: { imageUrl: 'https://cdn.example/image.jpg' } });

    await expect(festivalPlaylistDataApi.updateFestivalPlaylistImage('festival-1', {
      filename: 'cover.jpg',
      contentType: 'image/jpeg',
      bytes,
    })).resolves.toEqual({ imageUrl: 'https://cdn.example/image.jpg' });

    const [endpoint, body, config] = put.mock.calls[0];
    expect(endpoint).toBe('/festival-playlists/festival-1/image');
    expect(body).toBeInstanceOf(FormData);
    const uploadedFile = body.get('image') as File;
    expect(uploadedFile.name).toBe('cover.jpg');
    expect(uploadedFile.type).toBe('image/jpeg');
    expect(uploadedFile.size).toBe(4);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  it('searches festival artists with the existing endpoint and params', async () => {
    const result = { data: [], totalItems: 0, totalPages: 0, currentPage: 1, limit: 15 };
    get.mockResolvedValue({ data: result });

    await expect(festivalArtistCatalogApi.searchArtists('Muse', 15, 0)).resolves.toBe(result);
    expect(get).toHaveBeenCalledWith('/artists/management', {
      params: { query: 'Muse', limit: 15, offset: 0, genreId: undefined },
    });
  });

  it('creates a pending artist using the unchanged name payload', async () => {
    const artist = { id: 'artist-1', name: 'New artist', needsReview: true as const };
    post.mockResolvedValue({ data: artist });

    await expect(festivalArtistCatalogApi.createPendingArtist('New artist')).resolves.toBe(artist);
    expect(post).toHaveBeenCalledWith('/artists', { name: 'New artist' });
  });

  it('loads top songs using the existing query parameters', async () => {
    const result = { artist: 'Muse', setlistsAnalyzed: 10, songs: [], sources: [] };
    get.mockResolvedValue({ data: result });

    await expect(festivalArtistCatalogApi.getTopSongs('Muse', 10, 10)).resolves.toBe(result);
    expect(get).toHaveBeenCalledWith('/festival-playlists/artists/top-songs', {
      params: { artist: 'Muse', limit: 10, recentSetlists: 10 },
    });
  });

  it('adds an artist with the exact selection limits', async () => {
    const playlist = { id: 'festival-1', playlistArtists: [] };
    post.mockResolvedValue({ data: playlist });

    await expect(festivalPlaylistArtistTracksApi.addArtist('festival-1', 'artist-1', 10, 20))
      .resolves.toBe(playlist);
    expect(post).toHaveBeenCalledWith('/festival-playlists/festival-1/artists', {
      artistId: 'artist-1', tracksPerArtist: 10, recentSetlists: 20,
    });
  });

  it('searches failed artist tracks with the existing q parameter', async () => {
    const result = { artist: { id: 'artist-1', name: 'Artist' }, query: '', tracks: [] };
    get.mockResolvedValue({ data: result });

    await expect(festivalPlaylistArtistTracksApi.searchFailedArtistTracks(
      'festival-1', 'artist-1', '',
    )).resolves.toBe(result);
    expect(get).toHaveBeenCalledWith(
      '/festival-playlists/festival-1/artists/artist-1/tracks',
      { params: { q: undefined } },
    );
  });

  it('replaces failed tracks with the unchanged spotifyTrackIds payload', async () => {
    const playlist = { id: 'festival-1', playlistArtists: [] };
    put.mockResolvedValue({ data: playlist });

    await expect(festivalPlaylistArtistTracksApi.replaceFailedArtistTracks(
      'festival-1', 'artist-1', ['track-1', 'track-2'],
    )).resolves.toBe(playlist);
    expect(put).toHaveBeenCalledWith(
      '/festival-playlists/festival-1/artists/artist-1/tracks',
      { spotifyTrackIds: ['track-1', 'track-2'] },
    );
  });

  it('removes artists and clears playlist tracks using the separate legacy endpoints', async () => {
    const playlist = { id: 'festival-1', playlistArtists: [] };
    deleteRequest.mockResolvedValue({ data: playlist });

    await expect(festivalPlaylistArtistTracksApi.removeArtist('festival-1', 'artist-1'))
      .resolves.toBe(playlist);
    expect(deleteRequest).toHaveBeenCalledWith(
      '/festival-playlists/festival-1/artists/artist-1',
    );

    deleteRequest.mockResolvedValueOnce({ data: playlist });
    await expect(festivalPlaylistArtistTracksApi.clearPlaylistTracks('festival-1'))
      .resolves.toBe(playlist);
    expect(deleteRequest).toHaveBeenCalledWith('/festival-playlists/festival-1/tracks');
  });

  it('updates festival status through the existing endpoint and payload', async () => {
    const updated = { id: 'festival-1', status: 'editing' };
    patch.mockResolvedValue({ data: updated });

    await expect(festivalPlaylistRegistrationsApi.updateFestivalRegistration(
      'festival-1', { status: 'editing' },
    )).resolves.toBe(updated);
    expect(patch).toHaveBeenCalledOnce();
    expect(patch).toHaveBeenCalledWith('/spotify/festival-1', { status: 'editing' });
  });

  it('updates the assigned user with the existing nullable userId payload', async () => {
    const updated = { id: 'festival-1', userId: null };
    patch.mockResolvedValue({ data: updated });

    await expect(festivalPlaylistRegistrationsApi.updateFestivalRegistration(
      'festival-1', { userId: null },
    )).resolves.toBe(updated);
    expect(patch).toHaveBeenCalledOnce();
    expect(patch).toHaveBeenCalledWith('/spotify/festival-1', { userId: null });
  });

  it('creates a Spotify playlist with the existing payload', async () => {
    const payload = { name: 'Festival', description: 'Selección oficial', public: true };
    const created = { id: 'festival-1', name: 'Festival' };
    post.mockResolvedValue({ data: created });

    await expect(festivalPlaylistLifecycleApi.createFestivalPlaylist(payload))
      .resolves.toBe(created);
    expect(post).toHaveBeenCalledWith('/festival-playlists', payload);
  });

  it('creates a linked playlist with the existing Spotify URL payload', async () => {
    const created = { id: 'festival-1', name: 'Festival' };
    post.mockResolvedValue({ data: created });

    await expect(festivalPlaylistLifecycleApi.createLinkedFestivalPlaylist(
      'https://open.spotify.com/playlist/abc',
    )).resolves.toBe(created);
    expect(post).toHaveBeenCalledWith('/festival-playlists/link', {
      spotifyUrl: 'https://open.spotify.com/playlist/abc',
    });
  });

  it('links an existing registration without a request body', async () => {
    const linked = { id: 'festival-1', name: 'Festival' };
    post.mockResolvedValue({ data: linked });

    await expect(festivalPlaylistLifecycleApi.linkExistingFestivalPlaylist('festival-1'))
      .resolves.toBe(linked);
    expect(post).toHaveBeenCalledWith('/festival-playlists/festival-1/link');
  });

  it('deletes the legacy festival registration using the existing endpoint', async () => {
    const deleted = { ok: true as const };
    deleteRequest.mockResolvedValue({ data: deleted });

    await expect(festivalPlaylistLifecycleApi.deleteFestivalRegistration('festival-1'))
      .resolves.toBe(deleted);
    expect(deleteRequest).toHaveBeenCalledWith('/spotify/festival-1');
  });

  it('propagates request errors unchanged', async () => {
    const failure = new Error('request failed');
    get.mockRejectedValueOnce(failure);
    get.mockRejectedValueOnce(failure);
    get.mockRejectedValueOnce(failure);
    get.mockRejectedValueOnce(failure);
    get.mockRejectedValueOnce(failure);
    patch.mockRejectedValueOnce(failure);
    patch.mockRejectedValueOnce(failure);
    patch.mockRejectedValueOnce(failure);
    put.mockRejectedValueOnce(failure);
    put.mockRejectedValueOnce(failure);
    post.mockRejectedValueOnce(failure);
    post.mockRejectedValueOnce(failure);
    post.mockRejectedValueOnce(failure);
    post.mockRejectedValueOnce(failure);
    post.mockRejectedValueOnce(failure);
    deleteRequest.mockRejectedValueOnce(failure);
    deleteRequest.mockRejectedValueOnce(failure);
    deleteRequest.mockRejectedValueOnce(failure);

    await expect(festivalPlaylistRegistrationsApi.getFestivalRegistrations())
      .rejects.toBe(failure);
    await expect(festivalPlaylistDataApi.getFestivalPlaylistData('festival-1'))
      .rejects.toBe(failure);
    await expect(festivalPlaylistDataApi.updateFestivalPlaylistMetadata(
      'festival-1', { name: 'Festival' },
    )).rejects.toBe(failure);
    await expect(festivalPlaylistDataApi.updateFestivalPlaylistImage('festival-1', {
      filename: 'cover.jpg', contentType: 'image/jpeg', bytes: new ArrayBuffer(1),
    })).rejects.toBe(failure);
    await expect(festivalPlaylistRegistrationsApi.updateFestivalRegistration(
      'festival-1', { status: 'ready' },
    )).rejects.toBe(failure);
    await expect(festivalPlaylistRegistrationsApi.updateFestivalRegistration(
      'festival-1', { userId: 'user-1' },
    )).rejects.toBe(failure);
    await expect(festivalPlaylistLifecycleApi.createFestivalPlaylist({ name: 'Festival' }))
      .rejects.toBe(failure);
    await expect(festivalPlaylistLifecycleApi.createLinkedFestivalPlaylist('spotify-url'))
      .rejects.toBe(failure);
    await expect(festivalPlaylistLifecycleApi.linkExistingFestivalPlaylist('festival-1'))
      .rejects.toBe(failure);
    await expect(festivalPlaylistLifecycleApi.deleteFestivalRegistration('festival-1'))
      .rejects.toBe(failure);
    await expect(festivalArtistCatalogApi.searchArtists('Muse', 15, 0))
      .rejects.toBe(failure);
    await expect(festivalArtistCatalogApi.getTopSongs('Muse', 10, 10))
      .rejects.toBe(failure);
    await expect(festivalPlaylistArtistTracksApi.searchFailedArtistTracks(
      'festival-1', 'artist-1', '',
    )).rejects.toBe(failure);
    await expect(festivalPlaylistArtistTracksApi.replaceFailedArtistTracks(
      'festival-1', 'artist-1', ['track-1'],
    )).rejects.toBe(failure);
    await expect(festivalPlaylistArtistTracksApi.removeArtist('festival-1', 'artist-1'))
      .rejects.toBe(failure);
    await expect(festivalPlaylistArtistTracksApi.clearPlaylistTracks('festival-1'))
      .rejects.toBe(failure);
    await expect(festivalArtistCatalogApi.createPendingArtist('New artist'))
      .rejects.toBe(failure);
    await expect(festivalPlaylistArtistTracksApi.addArtist(
      'festival-1', 'artist-1', 10, 10,
    )).rejects.toBe(failure);
  });
});
