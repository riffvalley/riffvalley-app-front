import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '../../App.vue';
import router from '../router';
import { composeSession } from './session';
import { asignationTextUpdatePort, listDetailsPort, specialListsPort, listCreationPort, listWordPressPublicationPort, reunionsPort } from '../dependencies/editorial';
import { asignationTextUpdateKey } from '../../modules/editorial/presentation/asignationTextUpdateKey';
import { listDetailsKey } from '../../modules/editorial/presentation/listDetailsKey';
import { specialListsKey } from '../../modules/editorial/presentation/specialListsKey';
import { listCreationKey } from '../../modules/editorial/presentation/listCreationKey';
import { listWordPressPublicationKey } from '../../modules/editorial/presentation/listWordPressPublicationKey';
import { reunionsKey } from '../../modules/editorial/presentation/reunionsKey';

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
