import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from '@/modules/identity/stores/auth';
import { installQuery } from '@/app/queryClient';
import { observePrivateQueryCache } from '@/app/privateQueryCache';
import { configureApiAuth } from '@services/api/api';
import {
  subscribeToRemoteAuthLogin,
  subscribeToRemoteAuthLogout,
} from '@/modules/identity/api/sessionAuthCoordinator';

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
installQuery(app);
app.use(VueSweetalert2);

const authStore = useAuthStore(pinia);
observePrivateQueryCache(authStore);
configureApiAuth({
  getSession: () => ({
    token: authStore.token,
    isAuthenticated: authStore.isAuthenticated,
    sessionMode: authStore.sessionMode,
    generation: authStore.authSessionGeneration,
  }),
  renewSession: (generation) => authStore.renewSession(generation),
  clearSessionLocally: () => authStore.clearSessionLocally(),
  logout: () => authStore.logout(),
  redirectToLogin: () => router.currentRoute.value.name === 'Login'
    ? Promise.resolve()
    : router.push({ name: 'Login' }),
});

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

// Auth callbacks and Pinia are ready before Vue Router starts its initial navigation.
app.use(router);

// Registrar componentes globales
app.component('VueDatePicker', VueDatePicker);
app.component('font-awesome-icon', FontAwesomeIcon);

app.mount('#app');
