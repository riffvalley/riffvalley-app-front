import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import api from './services/api/api';
import { authInfrastructure, configureAuthHttp, useAuthStore } from '@/modules/auth';

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

// Circle flags
app.use(CircleFlags);
const pinia = createPinia();
app.use(pinia);
configureAuthHttp(api, {
  getAccessToken: authInfrastructure.getAccessToken,
  async onUnauthorized() {
    useAuthStore(pinia).logout('expired');
    if (router.currentRoute.value.name !== 'Login') await router.push({ name: 'Login' });
  },
});
app.use(router);
app.use(VueSweetalert2);

// Registrar componentes globales
app.component('VueDatePicker', VueDatePicker);
app.component('font-awesome-icon', FontAwesomeIcon);

app.mount('#app');
