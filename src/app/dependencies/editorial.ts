import { asignationTextUpdateApi } from "@/modules/editorial/asignations/infrastructure/asignationTextUpdateApi";
import { listDetailsApi } from "@/modules/editorial/lists/infrastructure/listDetailsApi";
import { specialListsApi } from "@/modules/editorial/lists/infrastructure/specialListsApi";
import { listCreationApi } from "@/modules/editorial/lists/infrastructure/listCreationApi";
import { listWordPressPublicationApi } from "@/modules/editorial/lists/infrastructure/listWordPressPublicationApi";
import { reunionsApi } from "@/modules/editorial/reunions/infrastructure/reunionsApi";
import { articlesApi } from "@/modules/editorial/articles/infrastructure/articlesApi";
import { videosApi } from "@/modules/editorial/videos/infrastructure/videosApi";
import { editorialCalendarApi } from "@/modules/editorial/calendar/infrastructure/editorialCalendarApi";
import { rescheduleEditorialContent } from "@/modules/editorial/calendar/application/rescheduleEditorialContent";
import { festivalArtistCatalogApi } from "@/modules/editorial/festival-playlists/infrastructure/festivalArtistCatalogApi";
import { festivalPlaylistArtistTracksApi } from "@/modules/editorial/festival-playlists/infrastructure/festivalPlaylistArtistTracksApi";
import {
  festivalPlaylistDataApi,
  festivalPlaylistLifecycleApi,
  festivalPlaylistRegistrationsApi,
} from "@/modules/editorial/festival-playlists/infrastructure/festivalPlaylistsApi";
import { genrePlaylistArtistTracksApi } from "@/modules/editorial/genre-playlists/infrastructure/genrePlaylistArtistTracksApi";
import { genreArtistCatalogApi } from "@/modules/editorial/genre-playlists/infrastructure/genreArtistCatalogApi";
import { genrePlaylistDataApi } from "@/modules/editorial/genre-playlists/infrastructure/genrePlaylistDataApi";
import { genrePlaylistLifecycleApi } from "@/modules/editorial/genre-playlists/infrastructure/genrePlaylistLifecycleApi";
import { genrePlaylistMaintenanceApi } from "@/modules/editorial/genre-playlists/infrastructure/genrePlaylistMaintenanceApi";
import { genrePlaylistRegistrationsApi } from "@/modules/editorial/genre-playlists/infrastructure/genrePlaylistRegistrationsApi";

export const asignationTextUpdatePort = asignationTextUpdateApi;
export const listDetailsPort = listDetailsApi;
export const specialListsPort = specialListsApi;
export const listCreationPort = listCreationApi;
export const listWordPressPublicationPort = listWordPressPublicationApi;
export const reunionsPort = reunionsApi;
export const articlesPort = articlesApi;
export const videosPort = videosApi;
export const festivalPlaylistRegistrationsPort = festivalPlaylistRegistrationsApi;
export const festivalPlaylistDataPort = festivalPlaylistDataApi;
export const festivalPlaylistLifecyclePort = festivalPlaylistLifecycleApi;
export const festivalArtistCatalogPort = festivalArtistCatalogApi;
export const festivalPlaylistArtistTracksPort = festivalPlaylistArtistTracksApi;
export const genrePlaylistRegistrationsPort = genrePlaylistRegistrationsApi;
export const genrePlaylistDataPort = genrePlaylistDataApi;
export const genrePlaylistLifecyclePort = genrePlaylistLifecycleApi;
export const genrePlaylistArtistTracksPort = genrePlaylistArtistTracksApi;
export const genreArtistCatalogPort = genreArtistCatalogApi;
export const genrePlaylistMaintenancePort = genrePlaylistMaintenanceApi;
export const rescheduleEditorialCalendarContent = (contentId: string, date: string | null) =>
  rescheduleEditorialContent(editorialCalendarApi, contentId, date);
