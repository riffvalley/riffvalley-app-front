import type { InjectionKey } from 'vue';
import type { FestivalArtistCatalogPort } from '../application/festivalPlaylistsPort';

export const festivalArtistCatalogKey: InjectionKey<FestivalArtistCatalogPort> =
  Symbol('editorialFestivalArtistCatalog');
