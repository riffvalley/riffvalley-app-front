<template>
  <div class="max-w-[100rem] mx-auto mt-10 px-4 pb-16">

    <!-- Welcome banner -->
    <div class="relative overflow-hidden rounded-2xl border border-rv-pink/20 dark:border-white/10 p-6 md:p-8 mb-8 bg-gradient-to-br from-rv-pink/10 via-rv-purple/5 to-transparent dark:from-rv-pink/10 dark:via-rv-purple/5 dark:to-transparent">
      <div class="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-rv-pink/10 blur-2xl"></div>
      <div class="pointer-events-none absolute -bottom-8 right-20 w-64 h-64 rounded-full bg-rv-purple/10 blur-2xl"></div>
      <div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <p class="text-sm text-gray-400 dark:text-gray-500 mb-1 capitalize">{{ todayFormatted }}</p>
          <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
            Hola, <span class="text-rv-pink">{{ username }}</span>
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1.5">Bienvenid@ a Riff Valley App</p>
        </div>
        <div class="flex gap-3 shrink-0 flex-wrap justify-center sm:justify-end">
          <div class="text-center bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/60 dark:border-white/10 shadow-sm min-w-[80px]">
            <p class="text-2xl font-bold text-rv-pink tabular-nums">{{ loading ? '…' : userDiscVotes }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">discos votados</p>
          </div>
          <div class="text-center bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/60 dark:border-white/10 shadow-sm min-w-[80px]">
            <p class="text-2xl font-bold text-rv-purple tabular-nums">{{ loading ? '…' : userCoverVotes }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">portadas votadas</p>
          </div>
          <div class="text-center bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/60 dark:border-white/10 shadow-sm min-w-[80px]">
            <p class="text-2xl font-bold text-blue-500 dark:text-blue-400 tabular-nums">{{ loading ? '…' : stats.totalDiscs }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">discos en la app</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Novedades + Comunidad + Top usuarios -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start mb-6">
      <!-- Novedades Riff Valley -->
      <div class="bg-white dark:bg-rv-darkCard shadow-sm rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-white/10 flex flex-col">
        <h3 class="text-xl font-bold text-rv-navy dark:text-white mb-4 text-center shrink-0">Novedades Riff Valley</h3>
        <div class="overflow-y-auto max-h-[400px] pr-1">
          <NewsFeed />
        </div>
      </div>

      <!-- Columna derecha -->
      <div class="flex flex-col gap-6">
        <!-- Comunidad -->
        <div class="bg-white dark:bg-rv-darkCard shadow-sm rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-white/10">
          <h3 class="text-lg font-bold text-rv-navy dark:text-white mb-4 flex items-center justify-center gap-2">
            <img src="/LOGO-RIFF-VALLEY.svg" alt="Riff Valley" class="w-5 h-5 brightness-0 dark:brightness-100" />
            Comunidad
          </h3>
          <div class="flex flex-col gap-2.5">
            <div class="community-row">
              <span class="community-label">App</span>
              <a href="https://t.me/RiffValleyAppUpdates" target="_blank" rel="noopener noreferrer" class="community-pill bg-[#229ED9] hover:bg-[#1a8bc2]"><i class="fa-brands fa-telegram"></i> Canal</a>
              <a href="https://t.me/RiffValleyApp" target="_blank" rel="noopener noreferrer" class="community-pill bg-rv-pink hover:bg-rv-pink/80"><i class="fa-solid fa-comments"></i> Grupo</a>
            </div>
            <div class="community-row">
              <span class="community-label">Web</span>
              <a href="https://riffvalley.es" target="_blank" rel="noopener noreferrer" class="community-pill bg-rv-navy hover:bg-rv-navy/70"><i class="fa-solid fa-globe"></i> Web</a>
              <a href="https://www.riffvalley.es/agenda-conciertos" target="_blank" rel="noopener noreferrer" class="community-pill bg-rv-purple hover:bg-rv-purple/80"><i class="fa-solid fa-calendar-days"></i> Conciertos</a>
            </div>
            <div class="community-row">
              <span class="community-label">Conciertos</span>
              <a href="https://t.me/conciertosrockmetal" target="_blank" rel="noopener noreferrer" class="community-pill bg-[#229ED9] hover:bg-[#1a8bc2]"><i class="fa-brands fa-telegram"></i> Canal</a>
              <a href="https://t.me/riffvalley" target="_blank" rel="noopener noreferrer" class="community-pill bg-rv-pink hover:bg-rv-pink/80"><i class="fa-solid fa-comments"></i> Grupo</a>
            </div>
          </div>
        </div>

        <!-- Top Usuarios -->
        <div class="bg-white dark:bg-rv-darkCard shadow-sm rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-white/10">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-bold text-rv-navy dark:text-white flex items-center gap-2">
              <i class="fa-solid fa-user-group"></i>Top usuarios
            </h3>
            <div class="relative inline-flex">
              <select v-model="selectedStatsYear" @change="fetchStats"
                class="pl-3 pr-7 py-1 rounded-full text-xs font-semibold bg-rv-navy text-white appearance-none cursor-pointer focus:outline-none border-none ring-0">
                <option v-for="option in availableStatsYears" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <svg class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <!-- Tabs Discos / Portadas -->
          <div class="flex gap-1 mb-3 p-1 bg-gray-100 dark:bg-rv-darkSurface rounded-lg">
            <button @click="topUsersTab = 'rates'"
              :class="topUsersTab === 'rates' ? 'bg-white dark:bg-rv-darkCard shadow text-rv-navy dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-rv-navy dark:hover:text-white'"
              class="flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all duration-150 outline-none focus:outline-none">
              <i class="fa-solid fa-compact-disc mr-1 text-[10px]"></i>Discos
            </button>
            <button @click="topUsersTab = 'cover'"
              :class="topUsersTab === 'cover' ? 'bg-white dark:bg-rv-darkCard shadow text-rv-navy dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-rv-navy dark:hover:text-white'"
              class="flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all duration-150 outline-none focus:outline-none">
              <i class="fa-solid fa-image mr-1 text-[10px]"></i>Portadas
            </button>
          </div>

          <!-- Lista ranking -->
          <ul class="space-y-0.5">
            <template v-if="topUsersTab === 'rates'">
              <li v-if="topUsersByRates.length === 0" class="text-gray-400 italic text-xs text-center py-3">No hay datos</li>
              <li v-for="(user, index) in topUsersByRates" :key="user.user.id"
                class="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <span class="text-xs w-5 text-center shrink-0" v-html="getTrophyIcon(index)"></span>
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate min-w-0 flex-1">{{ user.user.username }}</span>
                <span class="text-xs font-bold tabular-nums shrink-0 bg-gray-100 dark:bg-rv-darkSurface text-rv-navy dark:text-white px-2 py-0.5 rounded-full">{{ user.rateCount }}</span>
              </li>
            </template>
            <template v-else>
              <li v-if="topUsersByCover.length === 0" class="text-gray-400 italic text-xs text-center py-3">No hay datos</li>
              <li v-for="(user, index) in topUsersByCover" :key="user.user.id"
                class="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <span class="text-xs w-5 text-center shrink-0" v-html="getTrophyIcon(index)"></span>
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate min-w-0 flex-1">{{ user.user.username }}</span>
                <span class="text-xs font-bold tabular-nums shrink-0 bg-gray-100 dark:bg-rv-darkSurface text-rv-navy dark:text-white px-2 py-0.5 rounded-full">{{ user.totalCover }}</span>
              </li>
            </template>
          </ul>

          <div class="mt-3 pt-3 border-t border-gray-100 dark:border-white/10 text-center">
            <button @click="showDetailedStats = true"
              class="group inline-flex items-center px-3 py-1.5 rounded-full shadow text-xs font-semibold text-rv-navy dark:text-white bg-gray-100 dark:bg-rv-navy transition-all duration-200 hover:bg-rv-navy hover:text-white hover:-translate-y-0.5 hover:shadow-lg dark:hover:bg-rv-pink active:scale-[0.97] border border-gray-200 dark:border-white/10 outline-none focus:outline-none ring-0">
              <i class="fa-solid fa-chart-bar mr-1.5"></i>Estadísticas detalladas
            </button>
            <StatsModal v-if="showDetailedStats" :stats="stats" :rating-distribution="ratingDistribution" @close="showDetailedStats = false" />
          </div>
        </div>
      </div>
    </div>

    <!-- Top 3 Semana -->
    <div class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden mb-6">
      <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rv-pink/8 to-rv-purple/8 dark:from-rv-pink/10 dark:to-rv-purple/10 border-b border-gray-100 dark:border-white/10">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-fire text-rv-pink"></i>
          <h3 class="font-bold text-gray-900 dark:text-white">Top 3 · Semana actual</h3>
        </div>
        <span class="text-xs text-gray-400 dark:text-gray-500">{{ weekLabel }}</span>
      </div>
      <div class="p-4 sm:p-6">
        <!-- Loading skeletons -->
        <div v-if="loadingTopDiscs" class="grid grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="flex flex-col gap-2">
            <div class="h-5 w-10 rounded-full bg-gray-100 dark:bg-white/5 mx-auto animate-pulse"></div>
            <div class="aspect-square rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse"></div>
          </div>
        </div>
        <!-- Cards -->
        <div v-else-if="topWeekDiscs.length > 0" class="grid grid-cols-3 gap-4">
          <div v-for="(disc, i) in topWeekDiscs" :key="disc.id" class="flex flex-col items-center gap-2">
            <div class="medal-chip" :class="medalClass(i)">
              <i class="fa-solid fa-trophy text-[10px]"></i> {{ i + 1 }}º
            </div>
            <DiscCard :id="disc.id" :ep="disc.ep" :image="disc.image" :name="disc.name"
              :releaseDate="disc.releaseDate" :artistName="disc.artist?.name" :genreName="disc.genre?.name"
              :genreColor="disc.genre?.color" :link="disc.link" :averageRate="disc.averageRate"
              :averageCover="disc.averageCover" :rate="disc.userRate?.rate" :cover="disc.userRate?.cover"
              :isNew="!disc.userRate" :userDiscRate="disc.userRate?.id" :favoriteId="disc.userFavoriteId"
              :pendingId="disc.pendingId" :comment-count="disc.commentCount" :rateCount="disc.voteCount"
              :artistCountry="disc.artist?.country" :debut="disc.debut" />
          </div>
        </div>
        <p v-else class="text-center text-gray-400 dark:text-gray-500 text-sm py-6">No hay discos valorados esta semana</p>
      </div>
    </div>

    <!-- Top 3 Mes -->
    <div class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden mb-6">
      <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rv-purple/8 to-rv-pink/8 dark:from-rv-purple/10 dark:to-rv-pink/10 border-b border-gray-100 dark:border-white/10">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-calendar-star text-rv-purple"></i>
          <h3 class="font-bold text-gray-900 dark:text-white">Top 3 · Mes actual</h3>
        </div>
        <span class="text-xs text-gray-400 dark:text-gray-500 capitalize">{{ monthLabel }}</span>
      </div>
      <div class="p-4 sm:p-6">
        <div v-if="loadingTopDiscs" class="grid grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="flex flex-col gap-2">
            <div class="h-5 w-10 rounded-full bg-gray-100 dark:bg-white/5 mx-auto animate-pulse"></div>
            <div class="aspect-square rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse"></div>
          </div>
        </div>
        <div v-else-if="topMonthDiscs.length > 0" class="grid grid-cols-3 gap-4">
          <div v-for="(disc, i) in topMonthDiscs" :key="disc.id" class="flex flex-col items-center gap-2">
            <div class="medal-chip" :class="medalClass(i)">
              <i class="fa-solid fa-trophy text-[10px]"></i> {{ i + 1 }}º
            </div>
            <DiscCard :id="disc.id" :ep="disc.ep" :image="disc.image" :name="disc.name"
              :releaseDate="disc.releaseDate" :artistName="disc.artist?.name" :genreName="disc.genre?.name"
              :genreColor="disc.genre?.color" :link="disc.link" :averageRate="disc.averageRate"
              :averageCover="disc.averageCover" :rate="disc.userRate?.rate" :cover="disc.userRate?.cover"
              :isNew="!disc.userRate" :userDiscRate="disc.userRate?.id" :favoriteId="disc.userFavoriteId"
              :pendingId="disc.pendingId" :comment-count="disc.commentCount" :rateCount="disc.voteCount"
              :artistCountry="disc.artist?.country" :debut="disc.debut" />
          </div>
        </div>
        <p v-else class="text-center text-gray-400 dark:text-gray-500 text-sm py-6">No hay discos valorados este mes</p>
      </div>
    </div>

    <!-- Fila inferior: Disco aleatorio + hueco para futura sección -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Disco Aleatorio -->
      <div class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div class="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-400/10 to-rv-pink/8 dark:from-amber-400/10 dark:to-rv-pink/10 border-b border-gray-100 dark:border-white/10">
          <i class="fa-solid fa-shuffle text-amber-500"></i>
          <h3 class="font-bold text-gray-900 dark:text-white">Disco aleatorio</h3>
        </div>

        <!-- Estado inicial / lanzando -->
        <div v-if="!diceRolled" class="flex flex-col items-center gap-5 py-12 px-6">
          <i class="fa-solid text-7xl transition-all duration-100"
            :class="[diceRolling ? currentDiceFace + ' text-rv-pink scale-110' : 'fa-dice-five text-gray-300 dark:text-gray-600']"></i>
          <p class="text-gray-500 dark:text-gray-400 text-sm text-center">Descubre un disco al azar de toda la colección</p>
          <button @click="rollDice" :disabled="diceRolling"
            class="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold shadow-md
                   bg-rv-navy dark:bg-rv-purple text-white
                   hover:opacity-85 hover:-translate-y-0.5 hover:shadow-lg
                   active:scale-[0.97] active:translate-y-0
                   disabled:opacity-50 disabled:pointer-events-none
                   transition-all duration-200 border-0 outline-none focus:outline-none ring-0">
            <i class="fa-solid transition-all duration-100" :class="diceRolling ? currentDiceFace : 'fa-dice'"></i>
            {{ diceRolling ? 'Lanzando…' : 'Tirar el dado' }}
          </button>
        </div>

        <!-- Resultado -->
        <div v-else class="p-4 sm:p-6">
          <div class="flex justify-between items-center mb-5">
            <span class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <i class="fa-solid fa-dice text-amber-400"></i>
              ¡El dado ha hablado!
            </span>
            <button @click="rollDice" :disabled="diceRolling"
              class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold shadow
                     bg-gray-100 dark:bg-rv-navy text-rv-navy dark:text-white
                     hover:bg-rv-navy hover:text-white dark:hover:bg-rv-pink hover:-translate-y-0.5 hover:shadow-md
                     active:scale-[0.97] active:translate-y-0
                     disabled:opacity-50 disabled:pointer-events-none
                     transition-all duration-200 border border-gray-200 dark:border-white/10 outline-none focus:outline-none ring-0">
              <i class="fa-solid transition-all duration-100" :class="diceRolling ? currentDiceFace : 'fa-dice'"></i>
              {{ diceRolling ? 'Lanzando…' : 'Volver a tirar' }}
            </button>
          </div>
          <div class="flex justify-center max-w-xs mx-auto">
            <DiscCard v-if="randomDisc" :id="randomDisc.id" :ep="randomDisc.ep" :image="randomDisc.image"
              :name="randomDisc.name" :releaseDate="randomDisc.releaseDate" :artistName="randomDisc.artist?.name"
              :genreName="randomDisc.genre?.name" :genreColor="randomDisc.genre?.color" :link="randomDisc.link"
              :averageRate="randomDisc.averageRate" :averageCover="randomDisc.averageCover"
              :rate="randomDisc.userRate?.rate" :cover="randomDisc.userRate?.cover"
              :isNew="!randomDisc.userRate" :userDiscRate="randomDisc.userRate?.id"
              :favoriteId="randomDisc.userFavoriteId" :pendingId="randomDisc.pendingId"
              :comment-count="randomDisc.commentCount" :rateCount="randomDisc.voteCount"
              :artistCountry="randomDisc.artist?.country" :debut="randomDisc.debut" />
          </div>
        </div>
      </div>

      <!-- Hueco reservado para futura sección -->
      <div></div>

    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { useAuthStore } from "@stores/auth/auth";
import { getTopRatedOrFeaturedAndStats, getDiscs } from "@services/discs/discs";
import { getRatesStats } from "@services/rates/rates";
import StatsModal from "@components/StatsModal.vue";
import DiscCard from "@components/DiscCardComponent.vue";
import NewsFeed from "@views/homePage/components/NewsFeed.vue";
import { getAvailableYears } from "@helpers/dateConstants";

const DICE_FACES = ['fa-dice-one','fa-dice-two','fa-dice-three','fa-dice-four','fa-dice-five','fa-dice-six'];

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getWeekRange = (): [string, string] => {
  const today = new Date();
  const offset = (today.getDay() - 5 + 7) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [formatDate(start), formatDate(end)];
};

const getMonthRange = (): [string, string] => {
  const today = new Date();
  return [
    formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  ];
};

const transformDisc = (disc: any) => ({
  ...disc,
  artist: { ...disc.artist, country: disc.artist?.country ?? null },
  userRate: disc.userRate
    ? {
        ...disc.userRate,
        rate:  disc.userRate.rate  != null ? parseFloat(disc.userRate.rate)  : null,
        cover: disc.userRate.cover != null ? parseFloat(disc.userRate.cover) : null,
      }
    : null,
});

export default defineComponent({
  name: "DashboardPage",
  components: { StatsModal, DiscCard, NewsFeed },
  setup() {
    const authStore = useAuthStore();

    // ── Stats / top usuarios ──────────────────────────────
    const loading = ref(true);
    const stats = ref({ totalDiscs: 0, totalVotes: 0 });
    const userDiscVotes  = ref(0);
    const userCoverVotes = ref(0);
    const topUsersByRates = ref<any[]>([]);
    const topUsersByCover = ref<any[]>([]);
    const ratingDistribution = ref<Array<{ rate: number; count: number }>>([]);
    const showDetailedStats = ref(false);
    const selectedStatsYear = ref<number | string>(new Date().getFullYear());

    // ── Top usuarios tabs ─────────────────────────────────
    const topUsersTab = ref<'rates' | 'cover'>('rates');

    // ── Top 3 discos ──────────────────────────────────────
    const loadingTopDiscs = ref(true);
    const topWeekDiscs  = ref<any[]>([]);
    const topMonthDiscs = ref<any[]>([]);

    // ── Disco aleatorio ───────────────────────────────────
    const diceRolled    = ref(false);
    const diceRolling   = ref(false);
    const randomDisc    = ref<any>(null);
    const currentDiceFace = ref('fa-dice-five');
    let diceInterval: ReturnType<typeof setInterval> | null = null;

    // ── Computed ──────────────────────────────────────────
    const username = computed(() => authStore.username ?? "");

    const todayFormatted = computed(() =>
      new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    );

    const availableYears = computed(() => [...getAvailableYears()].reverse());

    const availableStatsYears = computed(() => {
      const opts: { value: number | string; label: string }[] = availableYears.value.map(y => ({ value: y, label: `${y}` }));
      opts.unshift({ value: "all", label: "Todos" });
      return opts;
    });

    const [wr0, wr1] = getWeekRange();
    const fmtShort = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const weekLabel  = `${fmtShort(wr0)} – ${fmtShort(wr1)}`;
    const monthLabel = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    // ── Medal helpers ─────────────────────────────────────
    const medalClass = (i: number) => {
      if (i === 0) return 'medal-gold';
      if (i === 1) return 'medal-silver';
      return 'medal-bronze';
    };

    const getTrophyIcon = (index: number) => {
      if (index === 0) return `<i class="fas fa-trophy text-yellow-500"></i>`;
      if (index === 1) return `<i class="fas fa-trophy text-gray-400"></i>`;
      if (index === 2) return `<i class="fas fa-trophy text-yellow-700"></i>`;
      return `<span class="text-gray-400 text-xs">${index + 1}</span>`;
    };

    // ── API calls ─────────────────────────────────────────
    const fetchStats = async () => {
      try {
        let statsRange: [string, string] | undefined;
        if (selectedStatsYear.value !== "all") {
          statsRange = [`${selectedStatsYear.value}-01-01`, `${selectedStatsYear.value}-12-31`];
        }
        const yearNum = selectedStatsYear.value !== "all" ? Number(selectedStatsYear.value) : undefined;
        const [response, ratesStats] = await Promise.all([
          getTopRatedOrFeaturedAndStats(undefined, undefined, undefined, statsRange, statsRange),
          getRatesStats(yearNum),
        ]);
        stats.value.totalDiscs   = response.totalDiscs;
        stats.value.totalVotes   = response.totalVotes;
        topUsersByRates.value    = response.topUsersByRates;
        topUsersByCover.value    = response.topUsersByCover;
        ratingDistribution.value = response.ratingDistribution;

        userDiscVotes.value  = ratesStats.totalVotes;
        const myUsername = authStore.username;
        const myCover = response.topUsersByCover.find((u: any) => u.user.username === myUsername);
        userCoverVotes.value = myCover?.totalCover ?? 0;
      } catch { /* silently */ } finally {
        loading.value = false;
      }
    };

    const fetchTopDiscs = async () => {
      loadingTopDiscs.value = true;
      try {
        const [weekRes, monthRes] = await Promise.all([
          getTopRatedOrFeaturedAndStats(getWeekRange(),  undefined, undefined, undefined, undefined),
          getTopRatedOrFeaturedAndStats(getMonthRange(), undefined, undefined, undefined, undefined),
        ]);
        topWeekDiscs.value  = weekRes.discs.filter((d: any) => d.averageRate != null).map(transformDisc).slice(0, 3);
        topMonthDiscs.value = monthRes.discs.filter((d: any) => d.averageRate != null).map(transformDisc).slice(0, 3);
      } catch { /* silently */ } finally {
        loadingTopDiscs.value = false;
      }
    };

    const rollDice = async () => {
      if (diceRolling.value) return;
      diceRolling.value = true;

      // Animate dice faces
      diceInterval = setInterval(() => {
        currentDiceFace.value = DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
      }, 80);

      try {
        const total = stats.value.totalDiscs || 100;
        const offset = Math.floor(Math.random() * total);
        const response = await getDiscs(1, offset);
        const data = response.data as any[];
        let disc: any = null;
        if (Array.isArray(data) && data.length > 0) {
          disc = 'discs' in data[0] ? data[0].discs?.[0] : data[0];
        }
        if (disc) {
          randomDisc.value = transformDisc(disc);
          diceRolled.value = true;
        }
      } catch { /* silently */ } finally {
        if (diceInterval) clearInterval(diceInterval);
        currentDiceFace.value = DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
        diceRolling.value = false;
      }
    };

    onMounted(() => {
      fetchStats();
      fetchTopDiscs();
    });

    return {
      username, todayFormatted, stats, loading, userDiscVotes, userCoverVotes,
      topUsersByRates, topUsersByCover, ratingDistribution,
      showDetailedStats, selectedStatsYear, availableStatsYears,
      weekLabel, monthLabel,
      loadingTopDiscs, topWeekDiscs, topMonthDiscs,
      diceRolled, diceRolling, randomDisc, currentDiceFace,
      getTrophyIcon, medalClass, fetchStats, rollDice, topUsersTab,
    };
  },
});
</script>

<style scoped>
/* Community */
.community-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}
.community-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #9ca3af;
  width: 4.5rem;
  flex-shrink: 0;
  text-align: right;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.community-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
}
.community-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
}

/* Medals */
.medal-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,.15);
}
.medal-gold   { background: linear-gradient(135deg, #FFD700, #FF8C00); }
.medal-silver { background: linear-gradient(135deg, #C0C0C0, #888); }
.medal-bronze { background: linear-gradient(135deg, #CD7F32, #8B4513); }
</style>
