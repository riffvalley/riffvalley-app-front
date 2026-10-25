<template>
  <div v-if="hasActivityAccess" class="min-h-screen p-4 md:p-6 bg-white dark:bg-rv-darkBg text-gray-900 dark:text-white">

    <!-- Header compacto -->
    <div class="flex items-center justify-between gap-4 mb-4">
      <div class="flex items-center gap-3">
        <h2 class="text-2xl md:text-3xl font-bold"><i class="fa-solid fa-bolt mr-2"></i>Actividad</h2>
        <span v-if="globalData && !selectedUserId" class="text-xs text-gray-600">
          {{ globalData.totalItems }} votos
        </span>
        <span v-if="selectedUserId" class="text-xs px-2 py-0.5 rounded-full bg-rv-pink/15 text-rv-pink">
          {{ selectedUserName }}
        </span>
      </div>
      <div class="flex items-center gap-1.5">
        <select v-model="selectedUserId" @change="onUserChange"
          class="text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rv-pink cursor-pointer bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-rv-purple/30 text-gray-900 dark:text-white"
          style="min-width:150px">
          <option value="">Todos los usuarios</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.username }}</option>
        </select>
        <button v-if="selectedUserId" @click="clearUser"
          class="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-white/5 transition-colors">
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>
    </div>

    <!-- GLOBAL ACTIVITY -->
    <template v-if="!selectedUserId">
      <div v-if="loadingGlobal" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-rv-pink"></div>
      </div>

      <div v-else-if="isGlobalError" class="text-center py-12 text-gray-500" role="alert">
        <p>Error cargando actividad</p>
        <button class="mt-3 text-xs text-rv-pink hover:underline" @click="retryGlobal">Reintentar</button>
      </div>

      <template v-else>
        <div class="rounded-xl overflow-hidden border border-gray-200 dark:border-rv-purple/15">
          <div v-for="(vote, i) in globalVotes" :key="vote.id"
            class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-default border-b border-gray-100 dark:border-white/[0.04] last:border-0">

            <!-- Usuario -->
            <button @click="selectUser(vote.user.id)"
              class="flex items-center gap-1.5 flex-shrink-0 group w-48">
              <img v-if="vote.user.image" :src="vote.user.image"
                class="w-6 h-6 rounded-full object-cover flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
              <div v-else
                class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style="background:rgba(228,110,138,0.2); color:#e46e8a">
                {{ vote.user.username.charAt(0).toUpperCase() }}
              </div>
              <span class="text-sm font-semibold truncate transition-colors text-rv-pink">
                {{ vote.user.username }}
              </span>
            </button>

            <!-- Disco -->
            <span class="w-28 text-xs truncate flex-shrink-0 text-green-600 dark:text-green-400">{{ vote.disc.name }}</span>

            <!-- Scores + fecha -->
            <div class="flex items-center gap-2 flex-1 justify-end">
              <span v-if="vote.rate !== null" class="score-pill score-pink">{{ vote.rate }}</span>
              <span v-if="vote.cover !== null" class="score-pill score-blue">{{ vote.cover }}</span>
              <span class="text-[11px] text-gray-500 dark:text-gray-600 whitespace-nowrap">{{ fmtDate(vote.createdAt) }}</span>
              <i v-if="vote.editedAt" class="fa-solid fa-pen text-[9px] text-gray-700" title="Editado"></i>
            </div>
          </div>
        </div>

        <!-- Paginación -->
        <div v-if="globalData" class="flex items-center justify-between mt-3">
          <span class="text-[11px] text-gray-500 dark:text-gray-600">
            Página {{ currentPage }} / {{ globalData.totalPages }}
          </span>
          <div class="flex gap-1">
            <button @click="prevPage" :disabled="currentPage === 1" class="page-btn"
              :class="{ 'opacity-30 cursor-not-allowed': currentPage === 1 }">
              <i class="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            <button @click="nextPage" :disabled="currentPage >= (globalData.totalPages || 1)" class="page-btn"
              :class="{ 'opacity-30 cursor-not-allowed': currentPage >= (globalData.totalPages || 1) }">
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>
      </template>
    </template>

    <!-- USER ACTIVITY -->
    <template v-else>
      <section class="mb-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-rv-darkCard sm:p-5" aria-label="Filtros de actividad individual">
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold">Actividad de {{ selectedUserName || selectedUserId }}</h3>
            <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">El rango filtra la evolución diaria. Los días activos y eventos se informan también en sus ventanas disponibles.</p>
          </div>
          <span v-if="detailQuery.isFetching.value && userDetail" class="inline-flex items-center gap-2 text-xs text-rv-purple dark:text-rv-pink" role="status">
            <span class="refresh-dot" aria-hidden="true" /> Actualizando
          </span>
        </div>
        <ActivityPeriodFilters
          v-model="selectedPeriod"
          v-model:from="customFrom"
          v-model:to="customTo"
          :range-reversed="customRangeReversed"
        />
      </section>

      <p v-if="showCustomPrompt" class="mb-5 rounded-lg border border-rv-purple/30 bg-rv-purple/5 px-4 py-3 text-sm text-gray-700 dark:bg-rv-purple/10 dark:text-gray-200" role="status">
        {{ customRangeReversed ? "Corrige el orden de las fechas para consultar este rango." : "Selecciona las dos fechas para consultar el rango personalizado." }}
      </p>

      <section v-if="showCustomPrompt" class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-white/10 dark:bg-rv-darkCard" aria-label="Rango personalizado pendiente">
        <p class="text-sm text-gray-600 dark:text-gray-300">La actividad diaria aparecerá cuando el rango sea válido.</p>
      </section>

      <section v-else-if="isSessionUnavailable" class="rounded-xl border border-amber-200 bg-white p-6 dark:border-amber-300/25 dark:bg-rv-darkCard" role="alert">
        <h3 class="text-lg font-semibold text-amber-900 dark:text-amber-100">Sesión caducada</h3>
        <p class="mt-2 text-sm text-gray-700 dark:text-gray-200">Inicia sesión de nuevo para consultar actividad administrativa.</p>
      </section>

      <section v-else-if="loadingUser" class="detail-loading" aria-label="Cargando actividad del usuario" aria-busy="true">
        <div v-for="index in 6" :key="index" class="detail-loading-kpi" />
        <div class="detail-loading-chart" />
      </section>

      <section v-else-if="isUserError" class="rounded-xl border border-red-200 bg-white p-6 dark:border-red-300/30 dark:bg-rv-darkCard" role="alert">
        <h3 class="text-lg font-semibold text-red-800 dark:text-red-200">{{ userErrorTitle }}</h3>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-700 dark:text-gray-200">{{ userErrorMessage }}</p>
        <button class="mt-4 rounded-lg bg-rv-pink px-4 py-2 text-sm font-semibold text-rv-navy transition-colors hover:bg-rv-pink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple" type="button" @click="retryUser">
          Reintentar
        </button>
      </section>

      <template v-else-if="userDetail">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
          <p>Rango diario: {{ formatDay(queryRange!.from) }} – {{ formatDay(queryRange!.to) }} · Europe/Madrid</p>
          <span v-if="detailQuery.isFetching.value" role="status">Actualizando</span>
        </div>

        <div v-if="hasNoRecordedActivity" class="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:bg-rv-darkSurface dark:text-gray-200" role="status">
          No hay actividad registrada para este usuario en las fuentes disponibles. Revisa la cobertura antes de interpretar el rango como un período completo.
        </div>

        <section class="mb-7" aria-labelledby="user-activity-summary-heading">
          <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h3 id="user-activity-summary-heading" class="text-lg font-semibold">Resumen individual</h3>
            <p class="text-xs text-gray-600 dark:text-gray-300">Los ceros solo se muestran cuando la fuente cubre el período.</p>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <article class="detail-metric">
              <h4>Días activos</h4>
              <p><strong>{{ formatCount(userDetail.activeDays7) }}</strong><span>7 días</span></p>
              <p><strong>{{ formatCount(userDetail.activeDays30) }}</strong><span>30 días</span></p>
              <small>Fechas con presencia App registrada; no son sesiones.</small>
            </article>
            <article class="detail-metric">
              <h4>Última presencia</h4>
              <p class="detail-primary-value">{{ userDetail.lastActiveDate ? formatDay(userDetail.lastActiveDate) : "Sin registro" }}</p>
              <small>{{ coverageText(userDetail.activityCoverage) }}</small>
            </article>
            <article class="detail-metric detail-metric--new">
              <h4>Votos nuevos · set</h4>
              <p><strong>{{ formatCount(userDetail.newVotes7) }}</strong><span>7 días</span></p>
              <p><strong>{{ formatCount(userDetail.newVotes30) }}</strong><span>30 días</span></p>
              <small v-if="userDetail.voteCoverage.status === 'unavailable'">Total de votos nuevos capturados: sin cobertura.</small>
              <small v-else>{{ formatCount(userDetail.newVotesRecorded) }} registrados desde el inicio de captura.</small>
            </article>
            <article class="detail-metric detail-metric--change">
              <h4>Modificaciones · change</h4>
              <p><strong>{{ formatCount(userDetail.changedVotes7) }}</strong><span>7 días</span></p>
              <p><strong>{{ formatCount(userDetail.changedVotes30) }}</strong><span>30 días</span></p>
              <small v-if="userDetail.voteCoverage.status === 'unavailable'">Total de modificaciones capturadas: sin cobertura.</small>
              <small v-else>{{ formatCount(userDetail.changedVotesRecorded) }} registradas desde el inicio de captura.</small>
            </article>
            <article class="detail-metric">
              <h4>Último evento de voto</h4>
              <p class="detail-primary-value">{{ userDetail.lastVoteEventAt ? formatTimestamp(userDetail.lastVoteEventAt) : userDetail.voteCoverage.status === "unavailable" ? "Sin cobertura" : "Sin eventos" }}</p>
              <small>Última acción registrada, sea un voto nuevo o una modificación.</small>
            </article>
            <article class="detail-metric detail-metric--stock">
              <h4>Valoraciones actuales</h4>
              <p class="detail-primary-value">{{ formatCount(userDetail.currentVotes) }}</p>
              <small>Valoraciones existentes ahora; no es un conteo histórico de eventos.</small>
            </article>
          </div>
        </section>

        <section class="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Cobertura de datos">
          <p class="coverage-note"><strong>Presencia:</strong> {{ coverageText(userDetail.activityCoverage) }}</p>
          <p class="coverage-note"><strong>Eventos de voto:</strong> {{ coverageText(userDetail.voteCoverage) }}</p>
        </section>

        <ActivityUserDailyCharts :activity="userDetail" />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAdminActivityQueries } from './composables/useAdminActivityQueries';
import { useAdminUsersQuery } from '@/modules/identity/users/composables/useAdminUsersQuery';
import { ActivityUserDetailContractError, useActivityUserDetailQuery } from '@/modules/identity/activity/composables/useActivityStatisticsQueries';
import { useAuthStore } from '@/modules/identity/auth/stores/auth';
import type { ActivityCoverage, ActivityDateRangeParams } from '@/modules/identity/activity/types/activity';
import { getHttpStatus } from '@/modules/identity/activity/utils/getHttpStatus';
import { getTodayInMadrid } from '@/modules/identity/activity/utils/getTodayInMadrid';
import ActivityUserDailyCharts from './components/ActivityUserDailyCharts.vue';
import ActivityPeriodFilters, { type PeriodSelection } from '@/modules/identity/activity/components/ActivityPeriodFilters.vue';
import SwalService from '@services/swal/SwalService';

const authStore = useAuthStore();
const hasActivityAccess = computed(() =>
  authStore.authStatus === 'authenticated' && authStore.hasRole('superadmin'),
);
const route = useRoute();
const router = useRouter();
const adminUsersQuery = useAdminUsersQuery();
const users = computed(() => adminUsersQuery.data.value ?? []);
const selectedUserId = ref('');
watch(() => route.query.userId, (value) => {
  selectedUserId.value = typeof value === 'string' ? value : '';
}, { immediate: true });
const selectedUserName = computed(() => users.value.find(u => u.id === selectedUserId.value)?.username ?? '');
const currentPage = ref(1);
const pageLimit = 20;
const activityQueries = useAdminActivityQueries({
  limit: pageLimit,
  offset: () => (currentPage.value - 1) * pageLimit,
  enabled: () => !selectedUserId.value,
});
const globalData = computed(() => activityQueries.globalQuery.data.value);
const globalVotes = computed(() => globalData.value?.data ?? []);
const loadingGlobal = computed(() => activityQueries.globalQuery.isFetching.value);
const isGlobalError = computed(() => activityQueries.globalQuery.isError.value && !globalData.value);

const selectedPeriod = shallowRef<PeriodSelection>(30);
const customFrom = shallowRef('');
const customTo = shallowRef('');
const hasCustomDates = computed(() => Boolean(customFrom.value && customTo.value));
const customRangeReversed = computed(() => hasCustomDates.value && customFrom.value > customTo.value);
const queryRange = computed<ActivityDateRangeParams | null>(() => {
  if (selectedPeriod.value === 'custom') {
    if (!hasCustomDates.value || customRangeReversed.value) return null;
    return { from: customFrom.value, to: customTo.value };
  }

  const today = getTodayInMadrid(new Date());
  return { from: shiftDate(today, 1 - selectedPeriod.value), to: today };
});
const showCustomPrompt = computed(() => selectedPeriod.value === 'custom' && !queryRange.value);
const detailTargetUserId = computed(() => selectedUserId.value && queryRange.value ? selectedUserId.value : null);
const detailQuery = useActivityUserDetailQuery(
  () => detailTargetUserId.value,
  () => queryRange.value ?? {},
);
const userDetail = computed(() => detailQuery.data.value);
const isSessionUnavailable = computed(() =>
  authStore.authStatus !== 'authenticated' || !authStore.isAuthenticated || getHttpStatus(detailQuery.error.value) === 401,
);
const loadingUser = computed(() => Boolean(selectedUserId.value && queryRange.value && detailQuery.isPending.value));
const isUserError = computed(() => Boolean(selectedUserId.value && queryRange.value && detailQuery.isError.value));
const hasNoRecordedActivity = computed(() => {
  const data = userDetail.value;
  if (!data) return false;
  return data.lastActiveDate === null && data.lastVoteEventAt === null && data.activeDates.length === 0 &&
    data.newVotesRecorded === 0 && data.changedVotesRecorded === 0 && data.currentVotes === 0;
});
const userErrorTitle = computed(() => {
  const error = detailQuery.error.value;
  if (error instanceof ActivityUserDetailContractError) return 'Backend incompatible';
  if (getHttpStatus(error) === 404) return 'Usuario no encontrado';
  if (isSessionUnavailable.value) return 'Sesión caducada';
  return 'Error al cargar la actividad del usuario';
});
const userErrorMessage = computed(() => {
  const error = detailQuery.error.value;
  if (error instanceof ActivityUserDetailContractError) {
    return 'La respuesta no incluye el contrato separado de presencia, votos nuevos y modificaciones. Actualiza el backend para consultar este detalle.';
  }
  if (getHttpStatus(error) === 404) return 'El usuario seleccionado ya no existe o no está disponible.';
  if (isSessionUnavailable.value) return 'Inicia sesión de nuevo para consultar actividad administrativa.';
  if (error && typeof error === 'object' && 'category' in error && error.category === 'stale-session') {
    return 'La sesión administrativa cambió durante la consulta. Actualiza la selección e inténtalo de nuevo.';
  }
  return 'Comprueba la conexión y vuelve a intentarlo.';
});

watch(activityQueries.globalQuery.error, (error) => {
  if (error && !selectedUserId.value && authStore.authStatus === 'authenticated' && authStore.hasRole('superadmin')) {
    console.error(error);
    SwalService.error('Error cargando actividad');
  }
});
watch(adminUsersQuery.error, (error) => {
  if (error) console.error(error);
});

function onUserChange() {
  if (!selectedUserId.value) currentPage.value = 1;
}

function selectUser(userId: string) {
  selectedUserId.value = userId;
}

function clearUser() {
  selectedUserId.value = '';
  currentPage.value = 1;
  if (typeof route.query.userId === 'string') {
    void router.replace({ name: 'UserStatsUsers', query: { ...route.query, userId: undefined } });
  }
}

function prevPage() {
  if (currentPage.value <= 1) return;
  currentPage.value--;
}

function nextPage() {
  if (!globalData.value || currentPage.value >= globalData.value.totalPages) return;
  currentPage.value++;
}

const retryGlobal = () => activityQueries.globalQuery.refetch();
const retryUser = () => detailQuery.refetch();

function shiftDate(date: string, dayOffset: number): string {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + dayOffset);
  return shifted.toISOString().slice(0, 10);
}

function formatCount(value: number | null): string {
  return value === null ? 'Sin cobertura' : new Intl.NumberFormat('es-ES').format(value);
}

function formatDay(value: string): string {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  });
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid',
  }).format(new Date(value));
}

function coverageText(coverage: ActivityCoverage): string {
  if (coverage.status === 'complete') return 'completa para el rango';
  if (coverage.status === 'incomplete') return `parcial${coverage.dataSince ? ` desde ${formatDay(coverage.dataSince)}` : ''}; los valores no representan todo el rango`;
  return 'no disponible; los valores sin cobertura no se interpretan como cero';
}

function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.score-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 4px;
}
.score-pink {
  background: rgba(228, 110, 138, 0.12);
  color: #e46e8a;
  border: 1px solid rgba(228, 110, 138, 0.25);
}
.score-blue {
  background: rgba(0, 100, 214, 0.1);
  color: #0064d6;
  border: 1px solid rgba(0, 100, 214, 0.2);
}
:global(.dark) .score-blue {
  color: #60a5fa;
}
.page-btn {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(176, 102, 159, 0.12);
  color: #b0669f;
  transition: background 0.15s;
}
.page-btn:hover:not(:disabled) { background: rgba(176, 102, 159, 0.25); }
.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(176, 102, 159, 0.2); border-radius: 2px; }
.detail-metric { min-width: 0; border: 1px solid rgb(148 163 184 / 30%); border-radius: 0.75rem; background: white; padding: 1rem; }
.detail-metric h4 { margin: 0 0 0.65rem; color: #475569; font-size: 0.8rem; font-weight: 700; }
.detail-metric p { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; margin: 0.2rem 0; }
.detail-metric strong { color: #26364a; font-size: 1.2rem; font-variant-numeric: tabular-nums; }
.detail-metric p span { color: #64748b; font-size: 0.72rem; }
.detail-metric small { display: block; margin-top: 0.65rem; color: #64748b; font-size: 0.7rem; line-height: 1.45; }
.detail-metric--new { border-color: rgb(228 110 138 / 35%); }
.detail-metric--change { border-color: rgb(130 99 166 / 35%); }
.detail-metric--stock { background: #f8fafc; }
.detail-metric .detail-primary-value { min-height: 2rem; color: #26364a; font-size: 1.05rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.coverage-note { margin: 0; border: 1px solid rgb(148 163 184 / 30%); border-radius: 0.65rem; background: #f8fafc; padding: 0.7rem 0.85rem; color: #475569; font-size: 0.75rem; line-height: 1.45; }
.detail-loading { display: grid; grid-template-columns: repeat(1, minmax(0, 1fr)); gap: 0.75rem; }
.detail-loading-kpi, .detail-loading-chart { border-radius: 0.75rem; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: detail-shimmer 1.3s ease-in-out infinite; }
.detail-loading-kpi { height: 7.5rem; }
.detail-loading-chart { grid-column: 1 / -1; height: 20rem; }
.refresh-dot { width: 0.45rem; height: 0.45rem; border-radius: 9999px; background: currentColor; }
@keyframes detail-shimmer { to { background-position: -200% 0; } }
:global(.dark) .detail-metric { border-color: rgb(255 255 255 / 12%); background: #242536; }
:global(.dark) .detail-metric h4, :global(.dark) .detail-metric p span, :global(.dark) .detail-metric small { color: #cbd5e1; }
:global(.dark) .detail-metric strong, :global(.dark) .detail-metric .detail-primary-value { color: #f8fafc; }
:global(.dark) .detail-metric--stock, :global(.dark) .coverage-note { background: #2a2b3d; }
:global(.dark) .coverage-note { border-color: rgb(255 255 255 / 12%); color: #cbd5e1; }
@media (min-width: 640px) { .detail-loading { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1280px) { .detail-loading { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .detail-loading-kpi, .detail-loading-chart { animation: none; } }
</style>
