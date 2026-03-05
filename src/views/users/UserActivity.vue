<template>
  <div class="min-h-screen p-4 md:p-6 text-white" style="background:#00021f">

    <!-- Header compacto -->
    <div class="flex items-center justify-between gap-4 mb-4">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-bold text-white">Actividad</h2>
        <span v-if="globalData && !selectedUserId" class="text-xs text-gray-600">
          {{ globalData.totalItems }} votos
        </span>
        <span v-if="selectedUserId" class="text-xs px-2 py-0.5 rounded-full"
          style="background:rgba(228,110,138,0.15); color:#e46e8a">
          {{ selectedUserName }}
        </span>
      </div>
      <div class="flex items-center gap-1.5">
        <select v-model="selectedUserId" @change="onUserChange"
          class="text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rv-pink cursor-pointer"
          style="background:rgba(255,255,255,0.05); border:1px solid rgba(176,102,159,0.3); color:#fff; min-width:150px">
          <option value="" style="background:#111">Todos los usuarios</option>
          <option v-for="u in users" :key="u.id" :value="u.id" style="background:#111">{{ u.username }}</option>
        </select>
        <button v-if="selectedUserId" @click="clearUser"
          class="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-white transition-colors"
          style="background:rgba(255,255,255,0.05)">
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>
    </div>

    <!-- GLOBAL ACTIVITY -->
    <template v-if="!selectedUserId">
      <div v-if="loadingGlobal" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-rv-pink"></div>
      </div>

      <template v-else>
        <div class="rounded-xl overflow-hidden" style="border:1px solid rgba(176,102,159,0.15)">
          <div v-for="(vote, i) in globalVotes" :key="vote.id"
            class="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.03] transition-colors cursor-default"
            :style="i < globalVotes.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.04)' : ''">

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
              <span class="text-sm font-semibold truncate transition-colors" style="color:#e46e8a">
                {{ vote.user.username }}
              </span>
            </button>

            <!-- Disco -->
            <span class="w-28 text-xs truncate flex-shrink-0" style="color:#4ade80">{{ vote.disc.name }}</span>

            <!-- Scores + fecha -->
            <div class="flex items-center gap-2 flex-1 justify-end">
              <span v-if="vote.rate !== null" class="score-pill score-pink">{{ vote.rate }}</span>
              <span v-if="vote.cover !== null" class="score-pill score-blue">{{ vote.cover }}</span>
              <span class="text-[11px] text-gray-600 whitespace-nowrap">{{ fmtDate(vote.createdAt) }}</span>
              <i v-if="vote.editedAt" class="fa-solid fa-pen text-[9px] text-gray-700" title="Editado"></i>
            </div>
          </div>
        </div>

        <!-- Paginación -->
        <div v-if="globalData" class="flex items-center justify-between mt-3">
          <span class="text-[11px] text-gray-600">
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
      <div v-if="loadingUser" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-rv-pink"></div>
      </div>

      <template v-else-if="userData">
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">

          <!-- Votos -->
          <div class="xl:col-span-2">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Votos</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style="background:rgba(228,110,138,0.15); color:#e46e8a">{{ userData.votes.length }}</span>
            </div>
            <div class="rounded-xl overflow-hidden max-h-[75vh] overflow-y-auto custom-scrollbar"
              style="border:1px solid rgba(176,102,159,0.15)">
              <div v-for="(vote, i) in userData.votes" :key="vote.id"
                class="flex items-center gap-3 px-3 py-2"
                :style="i < userData.votes.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.04)' : ''">
                <span class="text-xs text-gray-500 truncate flex-shrink-0 w-36">{{ vote.disc?.name || '—' }}</span>
                <span class="text-[11px] text-gray-600 flex-1 whitespace-nowrap">{{ fmtDate(vote.createdAt) }}</span>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <span v-if="vote.rate !== null" class="score-pill score-pink">{{ vote.rate }}</span>
                  <span v-if="vote.cover !== null" class="score-pill score-blue">{{ vote.cover }}</span>
                  <i v-if="vote.editedAt" class="fa-solid fa-pen text-[9px] text-gray-700"></i>
                </div>
              </div>
              <div v-if="userData.votes.length === 0" class="text-center py-8 text-xs text-gray-600">
                Sin votos registrados
              </div>
            </div>
          </div>

          <!-- Logins -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conexiones</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style="background:rgba(34,197,94,0.15); color:#4ade80">{{ userData.logins.length }}</span>
            </div>
            <div class="rounded-xl overflow-hidden max-h-[75vh] overflow-y-auto custom-scrollbar"
              style="border:1px solid rgba(34,197,94,0.12)">
              <div v-for="(login, i) in userData.logins" :key="login.date"
                class="flex items-center gap-2 px-3 py-1.5"
                :style="i < userData.logins.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.04)' : ''">
                <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:#4ade80; opacity:0.6"></div>
                <span class="text-xs text-gray-400">{{ fmtDay(login.date) }}</span>
              </div>
              <div v-if="userData.logins.length === 0" class="text-center py-8 text-xs text-gray-600">
                Sin conexiones
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getGlobalActivity, getUserActivity, getUsers, type GlobalActivityResponse, type UserActivityResponse } from '@services/users/users';
import SwalService from '@services/swal/SwalService';

const users = ref<any[]>([]);
const selectedUserId = ref('');
const selectedUserName = computed(() => users.value.find(u => u.id === selectedUserId.value)?.username ?? '');

const loadingGlobal = ref(false);
const globalData = ref<GlobalActivityResponse | null>(null);
const globalVotes = ref<any[]>([]);
const currentPage = ref(1);
const pageLimit = 20;

const loadingUser = ref(false);
const userData = ref<UserActivityResponse | null>(null);

onMounted(async () => {
  try { users.value = await getUsers(); } catch (e) { console.error(e); }
  await loadGlobal();
});

async function loadGlobal() {
  loadingGlobal.value = true;
  try {
    const offset = (currentPage.value - 1) * pageLimit;
    globalData.value = await getGlobalActivity(pageLimit, offset);
    globalVotes.value = globalData.value.data;
  } catch (e) {
    console.error(e);
    SwalService.error('Error cargando actividad');
  } finally {
    loadingGlobal.value = false;
  }
}

async function loadUserActivity(userId: string) {
  loadingUser.value = true;
  userData.value = null;
  try {
    userData.value = await getUserActivity(userId);
  } catch (e) {
    console.error(e);
    SwalService.error('Error cargando actividad del usuario');
  } finally {
    loadingUser.value = false;
  }
}

function onUserChange() {
  if (selectedUserId.value) {
    loadUserActivity(selectedUserId.value);
  } else {
    currentPage.value = 1;
    loadGlobal();
  }
}

function selectUser(userId: string) {
  selectedUserId.value = userId;
  loadUserActivity(userId);
}

function clearUser() {
  selectedUserId.value = '';
  currentPage.value = 1;
  loadGlobal();
}

async function prevPage() {
  if (currentPage.value <= 1) return;
  currentPage.value--;
  await loadGlobal();
}

async function nextPage() {
  if (!globalData.value || currentPage.value >= globalData.value.totalPages) return;
  currentPage.value++;
  await loadGlobal();
}

function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(dateStr: string) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
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
  background: rgba(228, 110, 138, 0.15);
  color: #e46e8a;
  border: 1px solid rgba(228, 110, 138, 0.2);
}
.score-blue {
  background: rgba(0, 100, 214, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(0, 100, 214, 0.2);
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
</style>
