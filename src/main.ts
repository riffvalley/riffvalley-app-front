import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from '@stores/auth/auth';
import {
  subscribeToRemoteAuthLogin,
  subscribeToRemoteAuthLogout,
} from '@services/auth/sessionAuthCoordinator';

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

import './index.css';      // Tailwind
import './style.css';      // su CSS global
import './assets/fonts.css'; // fuentes

const app = createApp(App);
const pinia = createPinia();

// Circle flags
app.use(CircleFlags);
app.use(pinia);
app.use(router);
app.use(VueSweetalert2);

const authStore = useAuthStore(pinia);
subscribeToRemoteAuthLogout(() => {
  authStore.clearSessionLocally();
  if (router.currentRoute.value.meta.requiresAuth) {
    void router.replace({ name: 'Login' });
  }
});
subscribeToRemoteAuthLogin(() => {
  const protectedRoute = router.currentRoute.value.meta.requiresAuth;
  void authStore.restoreAfterRemoteLogin();
  if (protectedRoute) void router.replace({ name: 'Login' });
});

// Registrar componentes globales
app.component('VueDatePicker', VueDatePicker);
app.component('font-awesome-icon', FontAwesomeIcon);

app.mount('#app');
