<template>
  <div class="view-container p-4 md:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-rv-pink">Estadísticas de Usuarios</h2>
      <p class="text-gray-400 text-sm mt-1">Actividad y registros de la plataforma</p>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div class="stat-card">
        <p class="stat-label">Total usuarios</p>
        <p class="stat-value">{{ totalItems }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Nunca accedieron</p>
        <p class="stat-value">{{ neverAccessed }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Registros hoy</p>
        <p class="stat-value">{{ registrosHoy }}</p>
      </div>
    </div>

    <!-- Charts row 1 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Registrations chart -->
      <div class="card">
        <h3 class="text-base font-semibold text-white mb-4">Usuarios registrados por fecha</h3>
        <UsersPerDayChart :users-per-day="usersPerDay" />
      </div>

      <!-- Last login chart -->
      <div class="card">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 class="text-base font-semibold text-white">Accesos únicos por día</h3>
          <div class="flex gap-1">
            <button
              v-for="opt in accessDaysOptions"
              :key="opt.value ?? 'all'"
              class="filter-btn"
              :class="{ 'filter-btn--active-purple': accessDays === opt.value }"
              @click="setAccessDays(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <LastLoginPerDayChart :last-login-per-day="lastLoginPerDay" />
      </div>
    </div>

    <!-- Charts row 2 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Last vote distribution -->
      <div class="card">
        <h3 class="text-base font-semibold text-white mb-4">Distribución de último voto por mes</h3>
        <LastVotePerDayChart :last-vote-per-day="lastVotePerDay" />
      </div>

      <!-- Inactive voters evolution -->
      <div class="card">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 class="text-base font-semibold text-white">Evolución de inactividad votante</h3>
          <div class="flex gap-1">
            <button
              v-for="opt in inactiveDaysOptions"
              :key="opt.value"
              class="filter-btn"
              :class="{ 'filter-btn--active': inactiveDays === opt.value }"
              @click="setInactiveDays(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <InactiveVotersChart :inactive-voters-per-day="inactiveVotersPerDay" />
      </div>
    </div>

    <!-- User list -->
    <div class="card">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 class="text-base font-semibold text-white">Listado de usuarios</h3>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-gray-400">Sin voto en:</span>
          <div class="flex gap-1">
            <button
              v-for="opt in notVotedDaysOptions"
              :key="opt.value ?? 'all'"
              class="filter-btn"
              :class="{ 'filter-btn--active': notVotedDays === opt.value }"
              @click="setNotVotedDays(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center py-10 text-gray-500">Cargando…</div>

      <div v-else-if="users.length === 0" class="text-center py-10 text-gray-500">
        No hay usuarios
      </div>

      <div v-else class="space-y-3">
        <div v-for="user in users" :key="user.id" class="user-row">
          <!-- Avatar -->
          <div class="flex-shrink-0">
            <img
              v-if="user.image"
              :src="user.image"
              :alt="user.username"
              class="w-10 h-10 rounded-full object-cover border border-white/20"
            />
            <div v-else class="avatar-placeholder">
              {{ user.username.charAt(0).toUpperCase() }}
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1">
            <div class="min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ user.username }}</p>
              <p class="text-xs text-gray-400 truncate">{{ user.email }}</p>
            </div>
            <div>
              <p class="stat-field-label">Registrado</p>
              <p class="stat-field-value">{{ formatDate(user.createdAt) }}</p>
            </div>
            <div>
              <p class="stat-field-label">Último acceso</p>
              <p class="stat-field-value" :class="{ 'text-gray-500': !user.lastLogin }">
                {{ user.lastLogin ? formatDate(user.lastLogin) : "Nunca" }}
              </p>
            </div>
            <div>
              <p class="stat-field-label">Último voto</p>
              <p class="stat-field-value" :class="{ 'text-gray-500': !user.lastVoteDate }">
                {{ user.lastVoteDate ? formatDate(user.lastVoteDate) : "Nunca" }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
        <button
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
          class="pagination-btn"
          :class="{ 'opacity-40 cursor-not-allowed': currentPage <= 1 }"
        >
          <i class="fa-solid fa-chevron-left text-xs mr-1"></i>
          Anterior
        </button>

        <span class="text-sm text-gray-400">
          Página <span class="text-white font-medium">{{ currentPage }}</span> de
          <span class="text-white font-medium">{{ totalPages }}</span>
        </span>

        <button
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
          class="pagination-btn"
          :class="{ 'opacity-40 cursor-not-allowed': currentPage >= totalPages }"
        >
          Siguiente
          <i class="fa-solid fa-chevron-right text-xs ml-1"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { getAdminStats } from "@services/auth/auth";
import type { AdminStatsUser, UsersPerDay, InactiveVotersPerDay } from "@services/auth/auth";
import SwalService from "@services/swal/SwalService";
import UsersPerDayChart from "./components/UsersPerDayChart.vue";
import LastLoginPerDayChart from "./components/LastLoginPerDayChart.vue";
import LastVotePerDayChart from "./components/LastVotePerDayChart.vue";
import InactiveVotersChart from "./components/InactiveVotersChart.vue";

const LIMIT = 10;

const notVotedDaysOptions = [
  { label: "Todos", value: undefined },
  { label: "7 días", value: 7 },
  { label: "15 días", value: 15 },
  { label: "30 días", value: 30 },
];

const accessDaysOptions = [
  { label: "Todo", value: undefined },
  { label: "7 días", value: 7 },
  { label: "15 días", value: 15 },
  { label: "30 días", value: 30 },
];

const inactiveDaysOptions = [
  { label: "7 días", value: 7 },
  { label: "15 días", value: 15 },
  { label: "30 días", value: 30 },
];

export default defineComponent({
  name: "AdminStats",
  components: { UsersPerDayChart, LastLoginPerDayChart, LastVotePerDayChart, InactiveVotersChart },
  setup() {
    const loading = ref(false);
    const users = ref<AdminStatsUser[]>([]);
    const usersPerDay = ref<UsersPerDay[]>([]);
    const lastLoginPerDay = ref<UsersPerDay[]>([]);
    const lastVotePerDay = ref<UsersPerDay[]>([]);
    const inactiveVotersPerDay = ref<InactiveVotersPerDay[]>([]);
    const neverAccessed = ref(0);
    const totalItems = ref(0);
    const totalPages = ref(0);
    const currentPage = ref(1);
    const notVotedDays = ref<number | undefined>(undefined);
    const accessDays = ref<number | undefined>(undefined);
    const inactiveDays = ref<number>(7);

    const registrosHoy = computed(() => {
      const today = new Date().toISOString().split("T")[0];
      const found = usersPerDay.value.find((d) => d.date === today);
      return found ? found.count : 0;
    });

    const fetchStats = async (page: number) => {
      loading.value = true;
      try {
        const offset = (page - 1) * LIMIT;
        const data = await getAdminStats({
          limit: LIMIT,
          offset,
          notVotedDays: notVotedDays.value,
          accessDays: accessDays.value,
          inactiveDays: inactiveDays.value,
        });
        users.value = data.users.data;
        totalItems.value = data.users.totalItems;
        totalPages.value = data.users.totalPages;
        currentPage.value = data.users.currentPage;
        usersPerDay.value = data.usersPerDay;
        lastLoginPerDay.value = data.lastLoginPerDay;
        neverAccessed.value = data.neverAccessed;
        lastVotePerDay.value = data.lastVotePerDay;
        inactiveVotersPerDay.value = data.inactiveVotersPerDay;
      } catch (error) {
        console.error("Error loading admin stats:", error);
        SwalService.error("Error al cargar las estadísticas");
      } finally {
        loading.value = false;
      }
    };

    const goToPage = (page: number) => {
      if (page < 1 || page > totalPages.value) return;
      fetchStats(page);
    };

    const setNotVotedDays = (value: number | undefined) => {
      notVotedDays.value = value;
      fetchStats(1);
    };

    const setAccessDays = (value: number | undefined) => {
      accessDays.value = value;
      fetchStats(1);
    };

    const setInactiveDays = (value: number) => {
      inactiveDays.value = value;
      fetchStats(1);
    };

    const formatDate = (dateString: string) => {
      if (!dateString) return "-";
      return new Date(dateString).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    };

    onMounted(() => fetchStats(1));

    return {
      loading,
      users,
      usersPerDay,
      lastLoginPerDay,
      lastVotePerDay,
      inactiveVotersPerDay,
      neverAccessed,
      totalItems,
      totalPages,
      currentPage,
      notVotedDays,
      accessDays,
      inactiveDays,
      notVotedDaysOptions,
      accessDaysOptions,
      inactiveDaysOptions,
      registrosHoy,
      goToPage,
      setNotVotedDays,
      setAccessDays,
      setInactiveDays,
      formatDate,
    };
  },
});
</script>

<style scoped>
.view-container {
  background: #00021f;
  min-height: 100vh;
}

.card {
  background: rgba(0, 2, 31, 0.6);
  border: 1px solid rgba(176, 102, 159, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
}

.stat-card {
  background: rgba(0, 2, 31, 0.6);
  border: 1px solid rgba(176, 102, 159, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
}

.stat-label {
  font-size: 0.75rem;
  color: #e46e8a;
  font-weight: 500;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.filter-btn {
  padding: 0.25rem 0.625rem;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 500;
  transition: all 0.15s;
  cursor: pointer;
}

.filter-btn:hover {
  background: rgba(228, 110, 138, 0.15);
  color: #e46e8a;
  border-color: rgba(228, 110, 138, 0.3);
}

.filter-btn--active {
  background: rgba(228, 110, 138, 0.2);
  color: #e46e8a;
  border-color: rgba(228, 110, 138, 0.5);
}

.filter-btn--active-purple {
  background: rgba(176, 102, 159, 0.2);
  color: #b0669f;
  border-color: rgba(176, 102, 159, 0.5);
}

.filter-btn--active-purple:hover {
  background: rgba(176, 102, 159, 0.3);
  color: #b0669f;
  border-color: rgba(176, 102, 159, 0.6);
}

.user-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}

.avatar-placeholder {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  background: linear-gradient(135deg, #e46e8a, #b0669f);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.stat-field-label {
  font-size: 0.65rem;
  color: #e46e8a;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-field-value {
  font-size: 0.8rem;
  color: #d1d5db;
}

.pagination-btn {
  padding: 0.4rem 0.875rem;
  background: rgba(228, 110, 138, 0.12);
  color: #e46e8a;
  border: 1px solid rgba(228, 110, 138, 0.3);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  transition: background 0.2s;
}

.pagination-btn:not(:disabled):hover {
  background: rgba(228, 110, 138, 0.25);
}
</style>
