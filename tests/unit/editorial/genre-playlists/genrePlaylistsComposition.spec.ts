import { describe, expect, it } from 'vitest';
import {
  genrePlaylistArtistTracksPort,
  genreArtistCatalogPort,
  genrePlaylistDataPort,
  genrePlaylistLifecyclePort,
  genrePlaylistMaintenancePort,
  genrePlaylistRegistrationsPort,
} from '../../../../src/app/dependencies/editorial';
import { genrePlaylistArtistTracksApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genrePlaylistArtistTracksApi';
import { genreArtistCatalogApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genreArtistCatalogApi';
import { genrePlaylistDataApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genrePlaylistDataApi';
import { genrePlaylistLifecycleApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genrePlaylistLifecycleApi';
import { genrePlaylistMaintenanceApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genrePlaylistMaintenanceApi';
import { genrePlaylistRegistrationsApi } from '../../../../src/modules/editorial/genre-playlists/infrastructure/genrePlaylistRegistrationsApi';

describe('Editorial genre playlists composition', () => {
  it('publishes each port through app composition', () => {
    expect(genrePlaylistRegistrationsPort).toBe(genrePlaylistRegistrationsApi);
    expect(genrePlaylistDataPort).toBe(genrePlaylistDataApi);
    expect(genrePlaylistLifecyclePort).toBe(genrePlaylistLifecycleApi);
    expect(genrePlaylistArtistTracksPort).toBe(genrePlaylistArtistTracksApi);
    expect(genrePlaylistMaintenancePort).toBe(genrePlaylistMaintenanceApi);
    expect(genreArtistCatalogPort).toBe(genreArtistCatalogApi);
  });
});
