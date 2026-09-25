<template>
  <aside :class="[
    'w-72 bg-rv-navy text-white fixed left-0 top-0 z-30 transform transition-transform duration-300 h-screen flex flex-col border-r border-white/10 dark:border-r-2 dark:border-white/20',
    menuVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
  ]">

    <!-- Header -->
    <div class="p-5 flex items-center gap-3 shrink-0 pl-6 bg-rv-navy">
      <img src="/LOGO-RIFF-VALLEY.svg" class="w-8 h-8 drop-shadow-sm" />

      <div class="flex items-baseline gap-1 relative top-[1px]">
        <span class="font-brand text-3xl tracking-wide opacity-90 drop-shadow-sm">
          RIFF VALLEY
        </span>

        <span class="text-sm font-medium tracking-widest lowercase text-white/75">
          app
        </span>
      </div>
    </div>


    <!-- Divider con degradado corporativo -->
    <div class="h-[4px] w-full bg-rv-gradient"></div>


    <div class="flex-1 overflow-y-auto overscroll-contain py-4">
      <ul class="menu w-full px-2 space-y-1">

        <template v-if="showAllAreas || selectedArea === 'app'">
        <li v-for="route in filteredDiscAppRoutes" :key="route.to">
          <router-link :to="route.to" class="flex items-center justify-start py-2 px-4 text-sm font-medium rounded-primary
         transition-all duration-300
         hover:bg-gray-700 hover:text-white" :active-class="'bg-gradient-to-r from-[#e46e8a] to-[#b0669f] text-white'"
            @click="closeMenu">
            <i :class="[route.icon, 'text-base w-5 text-center mr-3']"></i>
            {{ route.label }}
          </router-link>
        </li>
        </template>

        <li v-if="(showAllAreas || selectedArea === 'riff-valley') && filteredRiffValleyRoutes.length > 0" class="pt-2">
          <details :open="!showAllAreas" class="group/area">
          <summary v-if="showAllAreas" class="font-bold uppercase text-xs tracking-wider flex items-center justify-between py-2 px-4 text-gray-400 hover:text-white cursor-pointer list-none">
            <span class="flex items-center">
            <svg viewBox="0 0 128 128" width="20" height="20" fill="currentColor" class="w-5 h-5 mr-3" aria-hidden="true">
              <path d="M90.97,80.48c-33.67-13-33.05-24.71-21.76-33.75,2.05-1.64,4.45-3.2,7.06-4.65s4.67-4.03,5.39-7.02c.25-1.05.36-2.15.26-3.3-.3-3.79-2.71-8.15-8.93-12.88-6.5-4.94-7.99-9.54-6.92-13.54-.5-.01-1-.04-1.51-.04-3.01,0-5.97.24-8.85.7-1.14,3.82-.19,8.17,4.56,12.88,6.4,6.34,5.19,11.87,1.21,16.29-2.05,2.27-4.64,3.98-7.49,5.08-5.07,1.96-9.85,4.13-13.94,6.49-15.58,8.97-21.19,20.62,4.91,33.75,27.32,13.75,13.38,25.41-10.5,34.12,8.77,5.55,19.08,8.76,30.12,8.76,21.67,0,40.57-12.37,50.38-30.58-5.14-3.91-12.88-8.02-23.97-12.31Z" />
              <path d="M75.98,126.83C31.45,134.92-6.92,96.55,1.18,52.02,5.47,28.42,28.51,5.38,52.11,1.09c44.53-8.1,82.91,30.28,74.8,74.82-4.29,23.59-27.34,46.63-50.93,50.92ZM74.57,8.53C35.31,1.39,1.48,35.22,8.62,74.48c4.15,22.81,22.09,40.75,44.9,44.9,39.26,7.15,73.1-26.69,65.96-65.95-4.15-22.81-22.09-40.75-44.9-44.9Z" />
            </svg>
            Riff Valley
            </span>
            <i class="fa-solid fa-chevron-down text-[10px] transition-transform duration-200 group-open/area:rotate-180"></i>
          </summary>

          <ul>
            <li v-for="route in filteredRiffValleyRoutes" :key="route.to" class="mt-1">

              <!-- CON HIJOS (ej: Discos) -->
              <div v-if="route.children && route.children.length > 0">
                <details class="group/child">
                  <summary class="flex items-center justify-start py-2 pl-8 pr-4 text-sm font-medium rounded-primary
           transition-all duration-300
           hover:bg-gray-700 hover:text-white cursor-pointer list-none">
                    <div class="flex items-center justify-between w-full">
                      <div class="flex items-center">
                        <i :class="[route.icon, 'text-base w-5 text-center mr-3']"></i>
                        {{ route.label }}
                      </div>

                      <i class="fa-solid fa-chevron-down text-[10px]
                transition-transform duration-200
                group-open/child:rotate-180"></i>
                    </div>
                  </summary>

                  <ul>
                    <li v-for="child in route.children" :key="child.to" class="mt-1">
                      <router-link :to="child.to" class="flex items-center justify-start py-2 pl-12 pr-4 text-sm font-medium rounded-primary
               transition-all duration-300
               hover:bg-gray-700 hover:text-white"
                        :active-class="'bg-gradient-to-r from-[#2f66c9] to-[#0064d6] text-white'" @click="closeMenu">
                        <i :class="[child.icon, 'text-base w-5 text-center mr-3']"></i>
                        {{ child.label }}
                      </router-link>
                    </li>
                  </ul>
                </details>
              </div>

              <!-- SIN HIJOS (ej: Calendario, Reuniones) -->
              <router-link v-else :to="route.to" class="flex items-center justify-start py-2 pl-8 pr-4 text-sm font-medium rounded-primary
               transition-all duration-300
               hover:bg-gray-700 hover:text-white"
                :active-class="'bg-gradient-to-r from-[#2f66c9] to-[#0064d6] text-white'" @click="closeMenu">
                <i :class="[route.icon, 'text-base w-5 text-center mr-3']"></i>
                {{ route.label }}
              </router-link>
            </li>
          </ul>
          </details>
        </li>

        <li v-if="(showAllAreas || selectedArea === 'management') && filteredManagementRoutes.length > 0" class="pt-2">
          <!-- CABECERA SECCIÓN -->
          <details :open="!showAllAreas" class="group/area">
          <summary v-if="showAllAreas" class="font-bold uppercase text-xs tracking-wider flex justify-between items-center py-2 px-4 text-gray-400 hover:text-white cursor-pointer list-none">
            <div class="flex items-center justify-start">
              <i class="fa-solid fa-gears text-base w-5 text-center mr-3"></i>
              Gestión
            </div>
            <span
              v-if="supportStore.unreadCount > 0"
              class="ml-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
            >
              {{ supportStore.unreadCount > 99 ? '99+' : supportStore.unreadCount }}
            </span>
            <i class="fa-solid fa-chevron-down text-[10px] transition-transform duration-200 group-open/area:rotate-180"></i>
          </summary>

          <!-- ITEMS DE GESTIÓN -->
          <ul>
            <li v-for="route in filteredManagementRoutes" :key="route.to" class="mt-1">

              <!-- CON HIJOS (ej: Versiones) -->
              <div v-if="route.children && route.children.length > 0">
                <details class="group/child">
                  <summary class="flex items-center justify-start py-2 pl-8 pr-4 text-sm font-medium rounded-primary
           transition-all duration-300
           hover:bg-gray-700 hover:text-white cursor-pointer list-none">
                    <div class="flex items-center justify-between w-full">
                      <div class="flex items-center">
                        <i :class="[route.icon, 'text-base w-5 text-center mr-3']"></i>
                        {{ route.label }}
                      </div>

                      <i class="fa-solid fa-chevron-down text-[10px]
                transition-transform duration-200
                group-open/child:rotate-180"></i>
                    </div>
                  </summary>

                  <ul>
                    <li v-for="child in route.children" :key="child.to" class="mt-1">
                      <router-link :to="child.to" class="flex items-center justify-start py-2 pl-12 pr-4 text-sm font-medium rounded-primary
               transition-all duration-300
               hover:bg-gray-700 hover:text-white"
                        :active-class="'bg-gradient-to-r from-[#b0669f] to-[#8a5bb4] text-white'" @click="closeMenu">
                        <i :class="[child.icon, 'text-base w-5 text-center mr-3']"></i>
                        {{ child.label }}
                      </router-link>
                    </li>
                  </ul>
                </details>
              </div>

              <!-- SIN HIJOS (ej: Usuarios) -->
              <router-link v-else :to="route.to" class="flex items-center justify-start py-2 pl-8 pr-4 text-sm font-medium rounded-primary
          transition-all duration-300
          hover:bg-gray-700 hover:text-white"
                :active-class="'bg-gradient-to-r from-[#b0669f] to-[#8a5bb4] text-white'" @click="closeMenu">
                <i :class="[route.icon, 'text-base w-5 text-center mr-3']"></i>
                {{ route.label }}
                <span
                  v-if="route.to === '/suggestions/management' && supportStore.unreadCount > 0"
                  class="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                >
                  {{ supportStore.unreadCount > 99 ? '99+' : supportStore.unreadCount }}
                </span>
              </router-link>

            </li>
          </ul>
          </details>
        </li>

        <li v-if="(showAllAreas || selectedArea === newDiscsAreaId) && filteredNewDiscsRoutes.length > 0" class="pt-2">
          <details :open="!showAllAreas" class="group/area">
          <summary v-if="showAllAreas" class="font-bold uppercase text-xs tracking-wider flex items-center justify-between py-2 px-4 text-gray-400 hover:text-white cursor-pointer list-none">
            <span class="flex items-center">
            <i class="fa-solid fa-circle-plus text-base w-5 text-center mr-3"></i>
            Nuevos Discos
            <span
              v-if="petitionsStore.pendingCount > 0"
              class="ml-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
            >
              {{ petitionsStore.pendingCount > 99 ? '99+' : petitionsStore.pendingCount }}
            </span>
            </span>
            <i class="fa-solid fa-chevron-down text-[10px] transition-transform duration-200 group-open/area:rotate-180"></i>
          </summary>
          <ul>
            <li v-for="route in filteredNewDiscsRoutes" :key="route.to" class="mt-1">
              <router-link :to="route.to" class="flex items-center justify-start py-2 pl-8 pr-4 text-sm font-medium rounded-primary
         transition-all duration-300
         hover:bg-gray-700 hover:text-white" :active-class="'bg-gradient-to-r from-[#d66a43] to-[#ce6241] text-white'"
                @click="closeMenu">
                <i :class="[route.icon, 'text-base w-5 text-center mr-3']"></i>
                {{ route.label }}
                <span
                  v-if="route.to === '/petitions' && petitionsStore.pendingCount > 0"
                  class="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                >
                  {{ petitionsStore.pendingCount > 99 ? '99+' : petitionsStore.pendingCount }}
                </span>
              </router-link>
            </li>
          </ul>
          </details>
        </li>

        <template v-if="showAllAreas || selectedArea === 'app'">
        <li v-if="filteredBottomRoutes.length > 0" class="my-2 border-t border-gray-700/50"></li>

        <li v-for="route in filteredBottomRoutes" :key="route.to">
          <router-link :to="route.to" class="flex items-center justify-start py-2 px-4 text-sm font-medium rounded-primary
         transition-all duration-300
         hover:bg-gray-700 hover:text-white" :active-class="'bg-gradient-to-r from-[#e46e8a] to-[#b0669f] text-white'"
            @click="closeMenu">
            <i :class="[route.icon, 'text-base w-5 text-center mr-3']"></i>
            {{ route.label }}
          </router-link>
        </li>
        </template>

      </ul>
    </div>

<!-- Selector de áreas + Switch modo oscuro -->
<div class="px-2 mb-3 shrink-0 flex items-center justify-between gap-2">

  <!-- Selector de áreas (solo riffValley / superUser) -->
  <div v-if="showAreaSelector" class="flex items-center gap-1">
    <button
      v-for="area in areaOptions"
      :key="area.id"
      type="button"
      :aria-pressed="selectedArea === area.id"
      :title="area.label"
      @click="setArea(area.id)"
      class="w-12 h-8 py-0 px-3 rounded-primary flex items-center justify-center transition-all duration-300"
      :class="selectedArea === area.id
        ? area.activeClass + ' text-white'
        : 'text-white/50 hover:text-white hover:bg-white/10'"
    >
      <i v-if="area.icon" :class="[area.icon, 'text-sm']"></i>
      <svg v-else-if="area.id === 'riff-valley'" viewBox="0 0 128 128" width="20" height="20" fill="currentColor" class="w-5 h-5" aria-hidden="true">
        <path d="M90.97,80.48c-33.67-13-33.05-24.71-21.76-33.75,2.05-1.64,4.45-3.2,7.06-4.65s4.67-4.03,5.39-7.02c.25-1.05.36-2.15.26-3.3-.3-3.79-2.71-8.15-8.93-12.88-6.5-4.94-7.99-9.54-6.92-13.54-.5-.01-1-.04-1.51-.04-3.01,0-5.97.24-8.85.7-1.14,3.82-.19,8.17,4.56,12.88,6.4,6.34,5.19,11.87,1.21,16.29-2.05,2.27-4.64,3.98-7.49,5.08-5.07,1.96-9.85,4.13-13.94,6.49-15.58,8.97-21.19,20.62,4.91,33.75,27.32,13.75,13.38,25.41-10.5,34.12,8.77,5.55,19.08,8.76,30.12,8.76,21.67,0,40.57-12.37,50.38-30.58-5.14-3.91-12.88-8.02-23.97-12.31Z" />
        <path d="M75.98,126.83C31.45,134.92-6.92,96.55,1.18,52.02,5.47,28.42,28.51,5.38,52.11,1.09c44.53-8.1,82.91,30.28,74.8,74.82-4.29,23.59-27.34,46.63-50.93,50.92ZM74.57,8.53C35.31,1.39,1.48,35.22,8.62,74.48c4.15,22.81,22.09,40.75,44.9,44.9,39.26,7.15,73.1-26.69,65.96-65.95-4.15-22.81-22.09-40.75-44.9-44.9Z" />
      </svg>
    </button>
  </div>

  <label class="ml-auto flex items-center justify-end pr-2 gap-3 text-white/75 cursor-pointer">
    <!-- Sol -->
    <i
      class="fa-regular fa-sun text-base transition-colors"
      :class="!isDark ? 'text-rv-pink' : 'text-white/45'"
    ></i>

    <!-- Toggle -->
    <button
      type="button"
      role="switch"
      :aria-checked="isDark"
      @click="$emit('toggle-theme')"
      class="relative w-11 h-6 rounded-full transition-all duration-300
        border border-white/20
        bg-white/15 hover:bg-white/25
        outline-none focus:outline-none focus-visible:outline-none
        ring-0 focus:ring-0 focus-visible:ring-0"
    >
      <span
        class="absolute top-1/2 left-0.5 -translate-y-1/2
          w-5 h-5 rounded-full bg-white shadow-md
          transition-transform duration-300"
        :class="isDark ? 'translate-x-5' : 'translate-x-0'"
      ></span>
    </button>

    <!-- Luna -->
    <i
      class="fa-solid fa-moon text-base transition-colors"
      :class="isDark ? 'text-rv-pink' : 'text-white/45'"
    ></i>
  </label>
</div>

    <!-- Version link -->
    <div class="flex justify-end px-4 mb-2 shrink-0">
      <router-link to="/patch-notes"
        class="text-xs font-medium text-white/50 hover:text-white transition-colors uppercase tracking-wider">
        {{ versionDisplay }}
      </router-link>
    </div>

    <!-- Divider corporativo -->
    <div class="h-[1px] w-full bg-rv-gradient"></div>

    <div class="p-2 shrink-0">
      <button @click="handleLogout" class="w-full bg-transparent flex items-center justify-start py-2 px-4 text-sm font-medium rounded-primary
         transition-all duration-300
         border-0 outline-none focus:outline-none focus-visible:outline-none
         ring-0 focus:ring-0 focus-visible:ring-0
         hover:bg-red-600 hover:text-white">
        <i class="fa-solid fa-right-from-bracket text-base w-5 text-center mr-3"></i>
        {{ logoutLabel }}
      </button>
    </div>

  </aside>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted } from 'vue';
import { useAuthStore } from '@stores/auth/auth.ts';
import { getLatestPublicVersion } from '@services/versions/versions';
import { getAllRequests } from '@services/requests/requests';
import { getSuggestions } from '@services/suggestions/suggestions';
import { useSupportStore } from '@stores/support/support';
import { usePetitionsStore } from '@stores/petitions/petitions';
import routesData from './routes.json';

// Tipo actualizado con 'new-discs'
type AppRoute = {
  to: string;
  label: string;
  type: 'disc-app' | 'new-discs' | 'riff-valley' | 'management' | 'bottom';
  activeClass?: string;
  requiredRole?: string | string[];
  icon?: string;
  children?: AppRoute[];
};

type SidebarAreaId = 'app' | 'riff-valley' | 'management';

type SidebarArea = {
  id: SidebarAreaId;
  label: string;
  activeClass: string;
  icon?: string;
};

export default defineComponent({
  name: 'SidebarMenu',
props: {
  menuVisible: { type: Boolean, required: true },
  isDark: { type: Boolean, required: true },
},
emits: ['close-menu', 'toggle-theme'],
  setup(_, { emit }) {
    const authStore = useAuthStore();
    const supportStore = useSupportStore();
    const petitionsStore = usePetitionsStore();
    const allRoutes = routesData as AppRoute[];
    const latestVersion = ref<string | null>(null);

    const handleLogout = () => {
      authStore.logout();
      window.location.href = '/';
    };

    const closeMenu = () => {
      emit('close-menu');
    };

    const filterByRole = (routes: AppRoute[]) => {
      return routes.filter((route) => {
        if (!route.requiredRole) return true;
        const requiredRoles = Array.isArray(route.requiredRole) ? route.requiredRole : [route.requiredRole];
        return requiredRoles.some((role) => authStore.hasRole(role));
      });
    };

    // 1. Disc App
    const filteredDiscAppRoutes = computed(() =>
      filterByRole(allRoutes.filter((r) => r.type === 'disc-app'))
    );

    // 2. Nuevos Discos (NUEVA CATEGORÍA)
    const filteredNewDiscsRoutes = computed(() =>
      filterByRole(allRoutes.filter((r) => r.type === 'new-discs'))
    );

    // 3. Riff Valley
    const filteredRiffValleyRoutes = computed(() =>
      filterByRole(allRoutes.filter((r) => r.type === 'riff-valley'))
    );

    // 4. Gestión
    const filteredManagementRoutes = computed(() =>
      filterByRole(allRoutes.filter((r) => r.type === 'management'))
    );

    // 5. Bottom
    const filteredBottomRoutes = computed(() =>
      filterByRole(allRoutes.filter((r) => r.type === 'bottom'))
    );

    // Selector de áreas (App / Riff Valley / Gestión) — visible solo para riffValley y superUser
    const canSeeRiffValleyArea = computed(() => authStore.hasRole('riffValley'));
    const canSeeManagementArea = computed(() => authStore.hasRole('superUser'));
    const showAreaSelector = computed(() => canSeeRiffValleyArea.value || canSeeManagementArea.value);
    const showAllAreas = computed(() => !authStore.dashboardButtonsEnabled);

    // Nuevos Discos vive en la pestaña Gestión: los riffValley sin superUser
    // solo verán ahí los discos nuevos (el resto de Gestión se filtra por rol).
    // Los roles sin selector de áreas lo ven siempre en su única vista ("app").
    const newDiscsAreaId = computed<SidebarAreaId>(() =>
      showAreaSelector.value ? 'management' : 'app'
    );

    const areaOptions = computed<SidebarArea[]>(() => {
      const options: SidebarArea[] = [];
      if (!showAreaSelector.value) return options;

      options.push({
        id: 'app',
        label: 'App',
        icon: 'fa-solid fa-compact-disc',
        activeClass: 'bg-gradient-to-r from-[#e46e8a] to-[#b0669f]',
      });

      if (canSeeRiffValleyArea.value) {
        options.push({
          id: 'riff-valley',
          label: 'Riff Valley',
          activeClass: 'bg-gradient-to-r from-[#2f66c9] to-[#0064d6]',
        });
      }

      // Gestión es visible para riffValley y superUser; los riffValley sin
      // superUser solo verán Nuevos Discos dentro de esta pestaña.
      options.push({
        id: 'management',
        label: 'Gestión',
        icon: 'fa-solid fa-gear',
        activeClass: 'bg-gradient-to-r from-[#b0669f] to-[#8a5bb4]',
      });

      return options;
    });

    const selectedArea = ref<SidebarAreaId>('app');

    const setArea = (id: SidebarAreaId) => {
      selectedArea.value = id;
    };

    // Fetch latest public version + badge counts
    onMounted(async () => {
      try {
        const data = await getLatestPublicVersion();
        if (data) latestVersion.value = data.version;
      } catch {}

      if (authStore.hasRole('user')) {
        try {
          const result = await getAllRequests();
          const reqs: any[] = Array.isArray(result) ? result : ((result as any).data ?? []);
          petitionsStore.setPendingCount(reqs.filter((r: any) => r.status === 'pending').length);
        } catch {}
      }

      if (authStore.hasRole('superUser')) {
        try {
          const result = await getSuggestions({ status: 'in_progress' });
          const items: any[] = Array.isArray(result) ? result : ((result as any).data ?? []);
          supportStore.setPendingIds(items.map((s: any) => s.id));
        } catch {}
      }
    });

    // Computed version display with fallback
    const versionDisplay = computed(() => {
      return latestVersion.value ? `version ${latestVersion.value}` : 'version-';
    });

    return {
      handleLogout,
      closeMenu,
      supportStore,
      petitionsStore,
      logoutLabel: 'Cerrar sesión',
      filteredDiscAppRoutes,
      filteredNewDiscsRoutes,
      filteredRiffValleyRoutes,
      filteredManagementRoutes,
      filteredBottomRoutes,
      versionDisplay,
      areaOptions,
      showAllAreas,
      showAreaSelector: computed(() => showAreaSelector.value && !showAllAreas.value),
      selectedArea,
      setArea,
      newDiscsAreaId,
    };
  },
});
</script>
