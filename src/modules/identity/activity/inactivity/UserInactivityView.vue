<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import type { UserRole } from "@/modules/identity/shared/types/auth";
import type {
  ActivityInactivityParams,
  ActivityInactivitySortBy,
  ActivityInactivitySortOrder,
} from "@/modules/identity/activity/inactivity/types/activityInactivity";
import ActivityInactivityDistribution from "./components/ActivityInactivityDistribution.vue";
import ActivityInactivityFilters from "./components/ActivityInactivityFilters.vue";
import ActivityInactivityUsersTable from "./components/ActivityInactivityUsersTable.vue";
import { ActivityInactivityContractError, useActivityInactivityQuery } from "./composables/useActivityInactivityQuery";
import { useAuthStore } from "@/modules/identity/auth/stores/auth";
import { getHttpStatus } from "@/modules/identity/activity/utils/getHttpStatus";
import { getTodayInMadrid } from "@/modules/identity/activity/utils/getTodayInMadrid";

const pageSize = 20;
const authStore = useAuthStore();
const hasActivityAccess = computed(() =>
  authStore.authStatus === "authenticated" && authStore.hasRole("superadmin"),
);
const asOf = shallowRef(getTodayInMadrid(new Date()));
const role = shallowRef<UserRole | "">("");
const isActive = shallowRef<"" | "true" | "false">("");
const sortBy = shallowRef<ActivityInactivitySortBy>("daysSinceLastVote");
const sortOrder = shallowRef<ActivityInactivitySortOrder>("desc");
const offset = shallowRef(0);

watch([asOf, role, isActive, sortBy, sortOrder], () => {
  offset.value = 0;
});

const queryParams = computed<ActivityInactivityParams>(() => ({
  ...(asOf.value ? { asOf: asOf.value } : {}),
  ...(role.value ? { role: role.value } : {}),
  ...(isActive.value ? { isActive: isActive.value } : {}),
  limit: pageSize,
  offset: offset.value,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));

const inactivityQuery = useActivityInactivityQuery(() => queryParams.value);
const response = computed(() => inactivityQuery.data.value);
const rows = computed(() => response.value?.data ?? []);
const totalPages = computed(() => response.value ? Math.ceil(response.value.totalUsers / response.value.limit) : 0);
const currentPage = computed(() => response.value && response.value.totalUsers > 0
  ? Math.floor(response.value.offset / response.value.limit) + 1
  : 0);
const pageSummary = computed(() => {
  const data = response.value;
  if (!data) return "";
  if (rows.value.length === 0) return `Sin filas en esta página · ${data.totalUsers} usuarios`;
  return `${data.offset + 1}–${Math.min(data.offset + rows.value.length, data.totalUsers)} de ${data.totalUsers}`;
});
const isContractError = computed(() => inactivityQuery.error.value instanceof ActivityInactivityContractError);
const httpStatus = computed(() => getHttpStatus(inactivityQuery.error.value));
const isSessionExpired = computed(() => authStore.authStatus !== "authenticated" || httpStatus.value === 401);
const isPermissionDenied = computed(() => authStore.authStatus === "authenticated" && !authStore.hasRole("superadmin") || httpStatus.value === 403);
const errorTitle = computed(() => {
  if (isContractError.value) return "Backend incompatible";
  if (isSessionExpired.value) return "Sesión caducada";
  if (isPermissionDenied.value) return "Acceso no autorizado";
  return "No se pudo cargar la inactividad";
});
const errorDescription = computed(() => {
  if (isContractError.value) return "La respuesta no coincide con el contrato de inactividad. Actualiza el backend antes de volver a intentarlo.";
  if (isSessionExpired.value) return "Inicia sesión de nuevo para consultar estas estadísticas administrativas.";
  if (isPermissionDenied.value) return "Esta pantalla y sus datos están reservados a cuentas superadmin.";
  return "Comprueba la conexión y vuelve a intentarlo.";
});

function formatDate(value: string | null): string {
  if (!value) return "Sin corte registrado";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium", timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Sin corte registrado";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

function previousPage() {
  offset.value = Math.max(0, offset.value - pageSize);
}

function nextPage() {
  if (response.value && offset.value + pageSize < response.value.totalUsers) {
    offset.value += pageSize;
  }
}

function retry() {
  void inactivityQuery.refetch();
}
</script>

<template>
  <main v-if="hasActivityAccess" class="inactivity-page min-h-full bg-gray-50 px-4 py-6 text-rv-navy dark:bg-rv-darkBg dark:text-white sm:px-6 lg:px-8">
    <div class="inactivity-shell mx-auto max-w-7xl">
      <header class="page-header">
        <div>
          <h1>Inactividad de voto nuevo</h1>
          <p>Tiempo desde la última valoración nueva registrada. Las modificaciones y la presencia se muestran aparte.</p>
        </div>
        <span v-if="response" class="population-count">
          {{ response.totalUsers.toLocaleString("es-ES") }} usuarios analizados
        </span>
      </header>

      <section class="filter-panel" aria-label="Filtros de la población">
        <ActivityInactivityFilters
          v-model:as-of="asOf"
          v-model:role="role"
          v-model:is-active="isActive"
          v-model:sort-by="sortBy"
          v-model:sort-order="sortOrder"
        />
      </section>

      <section v-if="inactivityQuery.isPending.value" class="loading-panel" aria-label="Cargando estadísticas de inactividad" aria-busy="true">
        <div v-for="index in 6" :key="index" class="loading-line" />
      </section>

      <section v-else-if="inactivityQuery.isError.value && !response" class="error-panel" role="alert">
        <h2>{{ errorTitle }}</h2>
        <p>{{ errorDescription }}</p>
        <button type="button" class="retry-button" @click="retry">Reintentar</button>
      </section>

      <template v-else-if="response">
        <div class="query-status">
          <p>Referencia: <strong>{{ response.asOf }}</strong> · {{ response.timezone }}</p>
          <span v-if="inactivityQuery.isFetching.value" role="status">Actualizando resultados…</span>
        </div>

        <section class="coverage-panel" aria-labelledby="coverage-heading">
          <div class="coverage-heading-row">
            <h2 id="coverage-heading">Cobertura del historial de votos</h2>
            <span class="coverage-status" :class="response.coverage.status === 'partial' ? 'coverage-status--partial' : 'coverage-status--unavailable'">
              {{ response.coverage.status === "partial" ? "Parcial" : "No disponible" }}
            </span>
          </div>
          <p>{{ response.coverage.interpretation }}</p>
          <dl>
            <div><dt>Captura iniciada</dt><dd>{{ formatTimestamp(response.coverage.captureStartedAt) }}</dd></div>
            <div><dt>Fecha de corte informativa</dt><dd>{{ formatDate(response.coverage.captureDataSince) }}</dd></div>
          </dl>
        </section>

        <ActivityInactivityDistribution :groups="response.groups" />

        <section class="users-section" aria-labelledby="users-heading">
          <div class="users-heading-row">
            <div>
              <h2 id="users-heading">Usuarios</h2>
              <p>Los grupos sin último voto fiable conservan su clasificación propia.</p>
            </div>
            <p v-if="response.totalUsers > 0" class="page-count">Página {{ currentPage }} de {{ totalPages }}</p>
          </div>

          <p v-if="response.totalUsers === 0" class="empty-state" role="status">No hay usuarios en la población seleccionada.</p>
          <p v-else-if="rows.length === 0" class="empty-state" role="status">Esta página no contiene resultados. Vuelve a la primera página para continuar.</p>
          <ActivityInactivityUsersTable v-else :users="rows" />

          <nav v-if="response.totalUsers > 0" class="pagination" aria-label="Paginación de usuarios">
            <button type="button" class="pagination-previous" :disabled="offset === 0" @click="previousPage">Anterior</button>
            <span>{{ pageSummary }}</span>
            <button type="button" class="pagination-next" :disabled="offset + pageSize >= response.totalUsers" @click="nextPage">Siguiente</button>
          </nav>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.inactivity-shell {
  display: grid;
  gap: 1.15rem;
}

.page-header,
.users-heading-row,
.coverage-heading-row,
.query-status,
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
}

.page-header {
  align-items: end;
  padding-bottom: 1.1rem;
  border-bottom: 1px solid rgb(148 163 184 / 26%);
}

.page-header h1 {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 750;
  letter-spacing: -0.025em;
}

.page-header p,
.users-heading-row p {
  max-width: 66ch;
  margin: 0.35rem 0 0;
  color: #596579;
  font-size: 0.82rem;
  line-height: 1.5;
}

.population-count {
  color: #783f75;
  font-size: 0.82rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.filter-panel,
.coverage-panel,
.error-panel,
.loading-panel,
.empty-state {
  border: 1px solid rgb(148 163 184 / 24%);
  border-radius: 0.9rem;
  background: white;
  padding: 1rem 1.15rem;
}

.query-status {
  color: #596579;
  font-size: 0.74rem;
}

.query-status p {
  margin: 0;
}

.coverage-panel h2,
.users-heading-row h2,
.error-panel h2 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
}

.coverage-panel > p {
  max-width: 88ch;
  margin: 0.6rem 0 0;
  color: #596579;
  font-size: 0.78rem;
  line-height: 1.5;
}

.coverage-panel dl {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 2rem;
  margin: 0.8rem 0 0;
  font-size: 0.75rem;
}

.coverage-panel dl div {
  display: flex;
  gap: 0.4rem;
}

.coverage-panel dt {
  color: #596579;
}

.coverage-panel dd {
  margin: 0;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.coverage-status {
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.68rem;
  font-weight: 700;
}

.coverage-status--partial {
  background: #fbf2e5;
  color: #765022;
}

.coverage-status--unavailable {
  background: #f0f1f3;
  color: #555d6b;
}

.users-section {
  display: grid;
  gap: 0.8rem;
  margin-top: 0.25rem;
}

.page-count {
  color: #596579;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.empty-state {
  margin: 0;
  color: #596579;
  font-size: 0.85rem;
}

.pagination {
  justify-content: flex-end;
  color: #596579;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.pagination button,
.retry-button {
  min-height: 2.25rem;
  border: 1px solid #d8dce5;
  border-radius: 0.55rem;
  background: white;
  padding: 0.35rem 0.75rem;
  color: #263247;
  font-size: 0.78rem;
  font-weight: 650;
}

.pagination button:not(:disabled):hover,
.retry-button:hover {
  border-color: #b0669f;
  color: #783f75;
}

.pagination button:focus-visible,
.retry-button:focus-visible {
  outline: 2px solid #b0669f;
  outline-offset: 2px;
}

.pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.error-panel h2 {
  color: #8c293a;
}

.error-panel p {
  margin: 0.45rem 0 0.9rem;
  color: #4b5568;
  font-size: 0.83rem;
  line-height: 1.5;
}

.loading-panel {
  display: grid;
  gap: 0.85rem;
  padding-block: 1.3rem;
}

.loading-line {
  height: 1.15rem;
  border-radius: 0.35rem;
  background: linear-gradient(90deg, #edf0f4, #f7f8fa, #edf0f4);
  background-size: 200% 100%;
  animation: inactivity-loading 1.35s ease-in-out infinite;
}

.loading-line:nth-child(2n) {
  width: 84%;
}

.loading-line:nth-child(3n) {
  width: 68%;
}

:global(.dark) .page-header {
  border-bottom-color: rgb(255 255 255 / 10%);
}

:global(.dark) .page-header p,
:global(.dark) .users-heading-row p,
:global(.dark) .query-status,
:global(.dark) .coverage-panel > p,
:global(.dark) .coverage-panel dt,
:global(.dark) .empty-state,
:global(.dark) .pagination,
:global(.dark) .error-panel p {
  color: #c2c7d2;
}

:global(.dark) .population-count {
  color: #e7a9d4;
}

:global(.dark) .filter-panel,
:global(.dark) .coverage-panel,
:global(.dark) .error-panel,
:global(.dark) .loading-panel,
:global(.dark) .empty-state {
  border-color: rgb(255 255 255 / 10%);
  background: #171923;
}

:global(.dark) .coverage-status--partial {
  background: #493a2a;
  color: #ead1ac;
}

:global(.dark) .coverage-status--unavailable {
  background: #343744;
  color: #e0e3ea;
}

:global(.dark) .pagination button,
:global(.dark) .retry-button {
  border-color: rgb(255 255 255 / 16%);
  background: #20232d;
  color: #f4f5f8;
}

:global(.dark) .error-panel h2 {
  color: #ff9ba8;
}

:global(.dark) .loading-line {
  background: linear-gradient(90deg, #252833, #303440, #252833);
  background-size: 200% 100%;
}

@keyframes inactivity-loading {
  to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .loading-line {
    animation: none;
  }
}
</style>
