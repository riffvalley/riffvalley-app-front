import { describe, expect, it } from 'vitest';
import {
  festivalArtistCatalogPort,
  festivalPlaylistArtistTracksPort,
  festivalPlaylistDataPort,
  festivalPlaylistLifecyclePort,
  festivalPlaylistRegistrationsPort,
} from '../../../../src/app/dependencies/editorial';
import {
  festivalPlaylistDataApi,
  festivalPlaylistLifecycleApi,
  festivalPlaylistRegistrationsApi,
} from '../../../../src/modules/editorial/festival-playlists/infrastructure/festivalPlaylistsApi';
import { festivalArtistCatalogApi } from '../../../../src/modules/editorial/festival-playlists/infrastructure/festivalArtistCatalogApi';
import { festivalPlaylistArtistTracksApi } from '../../../../src/modules/editorial/festival-playlists/infrastructure/festivalPlaylistArtistTracksApi';

describe('Editorial festival playlists composition', () => {
  it('exposes both distinct ports through app dependencies', () => {
    expect(festivalPlaylistRegistrationsPort).toBe(festivalPlaylistRegistrationsApi);
    expect(festivalPlaylistDataPort).toBe(festivalPlaylistDataApi);
    expect(festivalPlaylistLifecyclePort).toBe(festivalPlaylistLifecycleApi);
    expect(festivalArtistCatalogPort).toBe(festivalArtistCatalogApi);
    expect(festivalPlaylistArtistTracksPort).toBe(festivalPlaylistArtistTracksApi);
  });
});
