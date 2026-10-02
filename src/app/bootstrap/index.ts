import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '../../App.vue';
import router from '../router';
import { composeSession } from './session';
import { asignationTextUpdatePort, listDetailsPort, specialListsPort, listCreationPort, listWordPressPublicationPort, reunionsPort, articlesPort, videosPort, rescheduleEditorialCalendarContent, festivalPlaylistRegistrationsPort, festivalPlaylistLifecyclePort, festivalPlaylistDataPort, festivalArtistCatalogPort, festivalPlaylistArtistTracksPort, genrePlaylistRegistrationsPort, genrePlaylistLifecyclePort, genrePlaylistDataPort, genrePlaylistArtistTracksPort, genreArtistCatalogPort, genrePlaylistMaintenancePort } from '../dependencies/editorial';
import { asignationTextUpdateKey } from '../../modules/editorial/asignations/presentation/asignationTextUpdateKey';
import { listDetailsKey } from '../../modules/editorial/lists/presentation/listDetailsKey';
import { specialListsKey } from '../../modules/editorial/lists/presentation/specialListsKey';
import { listCreationKey } from '../../modules/editorial/lists/presentation/listCreationKey';
import { listWordPressPublicationKey } from '../../modules/editorial/lists/presentation/listWordPressPublicationKey';
import { reunionsKey } from '../../modules/editorial/reunions/presentation/reunionsKey';
import { articlesKey } from '../../modules/editorial/articles/presentation/articlesKey';
import { videosKey } from '../../modules/editorial/videos/presentation/videosKey';
import { rescheduleEditorialContentKey } from '../../modules/editorial/calendar/presentation/rescheduleEditorialContentKey';
import { festivalPlaylistRegistrationsKey } from '../../modules/editorial/festival-playlists/presentation/festivalPlaylistRegistrationsKey';
import { festivalPlaylistLifecycleKey } from '../../modules/editorial/festival-playlists/presentation/festivalPlaylistLifecycleKey';
import { festivalPlaylistDataKey } from '../../modules/editorial/festival-playlists/presentation/festivalPlaylistDataKey';
import { festivalArtistCatalogKey } from '../../modules/editorial/festival-playlists/presentation/festivalArtistCatalogKey';
import { festivalPlaylistArtistTracksKey } from '../../modules/editorial/festival-playlists/presentation/festivalPlaylistArtistTracksKey';
import { genrePlaylistRegistrationsKey } from '../../modules/editorial/genre-playlists/presentation/genrePlaylistRegistrationsKey';
import { genrePlaylistLifecycleKey } from '../../modules/editorial/genre-playlists/presentation/genrePlaylistLifecycleKey';
import { genrePlaylistDataKey } from '../../modules/editorial/genre-playlists/presentation/genrePlaylistDataKey';
import { genrePlaylistArtistTracksKey } from '../../modules/editorial/genre-playlists/presentation/genrePlaylistArtistTracksKey';
import { genreArtistCatalogKey } from '../../modules/editorial/genre-playlists/presentation/genreArtistCatalogKey';
import { genrePlaylistMaintenanceKey } from '../../modules/editorial/genre-playlists/presentation/genrePlaylistMaintenanceKey';

// VueSweetalert2
import VueSweetalert2 from 'vue-sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// VueDatePicker
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

// Circle flags
import CircleFlags from "vue-circle-flags";
import "vue-circle-flags/dist/vue-circle-flags.css";


// FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faBookmark, faHeart, faPen, faTrash, faCloudArrowUp, faShareNodes, faCircleChevronDown } from '@fortawesome/free-solid-svg-icons';

// Agregar iconos a la librería de FontAwesome
library.add(faBookmark, faHeart, faPen, faTrash, faCloudArrowUp, faShareNodes, faCircleChevronDown);

import '../../index.css';      // Tailwind
import '../../style.css';      // su CSS global
import '../../assets/fonts.css'; // fuentes

export function bootstrap() {
  const app = createApp(App);
  app.provide(asignationTextUpdateKey, asignationTextUpdatePort);
  app.provide(listDetailsKey, listDetailsPort);
  app.provide(specialListsKey, specialListsPort);
  app.provide(listCreationKey, listCreationPort);
  app.provide(listWordPressPublicationKey, listWordPressPublicationPort);
  app.provide(reunionsKey, reunionsPort);
  app.provide(articlesKey, articlesPort);
  app.provide(videosKey, videosPort);
  app.provide(rescheduleEditorialContentKey, rescheduleEditorialCalendarContent);
  app.provide(festivalPlaylistRegistrationsKey, festivalPlaylistRegistrationsPort);
  app.provide(festivalPlaylistLifecycleKey, festivalPlaylistLifecyclePort);
  app.provide(festivalPlaylistDataKey, festivalPlaylistDataPort);
  app.provide(festivalArtistCatalogKey, festivalArtistCatalogPort);
  app.provide(festivalPlaylistArtistTracksKey, festivalPlaylistArtistTracksPort);
  app.provide(genrePlaylistRegistrationsKey, genrePlaylistRegistrationsPort);
  app.provide(genrePlaylistLifecycleKey, genrePlaylistLifecyclePort);
  app.provide(genrePlaylistDataKey, genrePlaylistDataPort);
  app.provide(genrePlaylistArtistTracksKey, genrePlaylistArtistTracksPort);
  app.provide(genreArtistCatalogKey, genreArtistCatalogPort);
  app.provide(genrePlaylistMaintenanceKey, genrePlaylistMaintenancePort);

  // Circle flags
  app.use(CircleFlags);
  const pinia = createPinia();
  app.use(pinia);
  composeSession(pinia, router);
  app.use(router);
  app.use(VueSweetalert2);

  // Registrar componentes globales
  app.component('VueDatePicker', VueDatePicker);
  app.component('font-awesome-icon', FontAwesomeIcon);

  app.mount('#app');

  return app;
}
