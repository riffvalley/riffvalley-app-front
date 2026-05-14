<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
    <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-2xl
                w-full sm:max-w-2xl relative max-h-[85vh] overflow-y-auto
                border border-gray-100 dark:border-white/10">

      <!-- ── Cabecera sticky ──────────────────────────────────── -->
      <div class="sticky top-0 z-10 bg-white dark:bg-rv-darkCard
                  border-b border-gray-100 dark:border-white/10
                  px-5 pt-5 pb-4">

        <!-- Botón cerrar -->
        <button
          @click="$emit('close')"
          class="absolute top-4 right-4 text-white bg-rv-navy hover:bg-rv-pink
                 rounded-full w-9 h-9 flex items-center justify-center shadow-md transition-all
                 border-0 outline-none focus:outline-none ring-0 focus:ring-0"
          aria-label="Cerrar"
        >
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>

        <!-- Avatar + info -->
        <div class="flex items-center gap-3 pr-10">
          <div class="overflow-hidden rounded-full shrink-0 shadow bg-gray-200 dark:bg-rv-darkSurface"
               :style="{ width: '44px', height: '44px' }">
            <img v-if="avatarSrc" :src="avatarSrc" alt="Avatar" class="w-full h-full object-cover" />
            <svg v-else class="w-full h-full text-gray-400 dark:text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
          </div>

          <div>
            <div class="flex items-center gap-2 mb-0.5">
              <span class="bg-rv-navy dark:bg-rv-purple text-white px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase">
                Historial
              </span>
              <span class="text-xs text-gray-400 dark:text-gray-300">
                {{ history?.totalItems ?? 0 }} registro{{ (history?.totalItems ?? 0) !== 1 ? 's' : '' }}
              </span>
            </div>
            <p class="text-base font-bold text-rv-navy dark:text-white leading-snug">{{ username }}</p>
          </div>
        </div>
      </div>

      <!-- ── Cuerpo ─────────────────────────────────────────── -->
      <div class="p-5">

        <!-- Loading -->
        <div v-if="loading" class="py-10 text-center">
          <i class="fa-solid fa-spinner animate-spin text-2xl text-rv-pink mb-2 block"></i>
          <span class="text-sm text-gray-400 dark:text-gray-500">Cargando historial...</span>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="py-8 text-center">
          <i class="fa-solid fa-circle-exclamation text-2xl text-red-400 mb-2 block"></i>
          <p class="text-sm text-red-500 dark:text-red-400 mb-3">{{ error }}</p>
          <button
            @click="fetchHistory()"
            class="px-4 py-1.5 rounded-full bg-rv-navy dark:bg-rv-darkSurface text-white text-sm
                   hover:bg-rv-pink transition-all
                   border-0 outline-none focus:outline-none ring-0 focus:ring-0"
          >
            Reintentar
          </button>
        </div>

        <!-- Lista -->
        <div v-else>

          <!-- Cabecera columnas -->
          <div class="flex items-center px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-300">
            <span class="flex-1">Disco / Artista</span>
            <span class="w-10 text-center">
              <i class="fa-solid fa-compact-disc text-rv-pink/70 mr-0.5"></i>Disco
            </span>
            <span class="w-10 text-center">
              <i class="fa-solid fa-image text-rv-purple/70 mr-0.5"></i>Port.
            </span>
            <span class="w-24 text-right">Fecha</span>
          </div>

          <!-- Filas -->
          <ul class="divide-y divide-gray-50 dark:divide-white/5">
            <li
              v-for="ev in visibleEvents"
              :key="ev.rateId + '|' + ev.timestamp"
              class="flex items-center gap-2 py-2.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <!-- Badge acción -->
              <span
                class="shrink-0 px-1.5 py-0.5 rounded-full text-white text-[10px] font-semibold"
                :class="ev.action === 'created' ? 'bg-emerald-500' : 'bg-amber-400 text-rv-navy'"
              >
                {{ actionLabel(ev.action) }}
              </span>

              <!-- Disco + artista -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-rv-navy dark:text-white truncate leading-tight">
                  {{ ev.disc?.name }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-400 truncate">
                  {{ ev.disc?.artist?.name }}
                </p>
              </div>

              <!-- Scores -->
              <div class="flex items-center gap-1 shrink-0">
                <!-- Disco -->
                <span v-if="!ev.rate || ev.rate <= 0"
                      class="w-10 text-center text-sm font-medium text-gray-300 dark:text-white/25">—</span>
                <span v-else
                      class="w-10 text-center text-[13px] font-bold"
                      :style="{ color: getScoreColor(ev.rate) }">{{ ev.rate }}</span>

                <!-- Portada -->
                <span v-if="!ev.cover || ev.cover <= 0"
                      class="w-10 text-center text-sm font-medium text-gray-300 dark:text-white/25">—</span>
                <span v-else
                      class="w-10 text-center text-[13px] font-bold"
                      :style="{ color: getScoreColor(ev.cover) }">{{ ev.cover }}</span>
              </div>

              <!-- Fecha -->
              <div class="w-24 text-right text-[10px] text-gray-400 dark:text-gray-400 whitespace-nowrap shrink-0">
                {{ new Date(ev.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }}
              </div>
            </li>

            <li v-if="visibleEvents.length === 0" class="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              No hay registros disponibles.
            </li>
          </ul>

          <!-- Paginación -->
          <div class="mt-4 flex items-center justify-between">
            <button
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                     bg-gray-100 dark:bg-rv-darkSurface text-rv-navy dark:text-white
                     hover:bg-rv-navy hover:text-white dark:hover:bg-rv-pink
                     disabled:opacity-40 disabled:cursor-not-allowed
                     flex items-center gap-2
                     border-0 outline-none focus:outline-none ring-0 focus:ring-0"
              :disabled="offset === 0 || loading"
              @click="prevPage"
            >
              <i class="fa-solid fa-chevron-left text-xs"></i>
              Anterior
            </button>

            <span class="text-xs text-gray-400 dark:text-gray-300">
              Pág. {{ history?.currentPage }} / {{ history?.totalPages }}
            </span>

            <button
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                     bg-gray-100 dark:bg-rv-darkSurface text-rv-navy dark:text-white
                     hover:bg-rv-navy hover:text-white dark:hover:bg-rv-pink
                     disabled:opacity-40 disabled:cursor-not-allowed
                     flex items-center gap-2
                     border-0 outline-none focus:outline-none ring-0 focus:ring-0"
              :disabled="!canNext || loading"
              @click="nextPage"
            >
              Siguiente
              <i class="fa-solid fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, computed } from 'vue';
import { getUserHistoryService, type GetUserHistoryResponse } from '@/services/rates/rates.ts';

export default defineComponent({
  name: 'UserModal',
  props: {
    username: { type: String, required: true },
    userId:   { type: String, required: true },
    avatarSrc: { type: String, default: '' },
    avatarSize: { type: Number, default: 130 },
  },
  emits: ['close'],
  setup(props) {
    const history = ref<GetUserHistoryResponse | null>(null);
    const loading = ref(false);
    const error   = ref<string | null>(null);

    const actionLabel = (action: string) =>
      action === 'created' ? 'Votado'
        : action === 'updated' ? 'Edit.'
          : action;

    const limit  = ref(20);
    const offset = ref(0);

    const canNext = computed(() => {
      if (!history.value) return false;
      return offset.value + limit.value < history.value.totalItems;
    });

    const fetchHistory = async () => {
      loading.value = true;
      error.value   = null;
      try {
        history.value = await getUserHistoryService({
          userId: props.userId,
          limit:  limit.value,
          offset: offset.value,
          type:   'both',
          order:  'DESC',
        });
      } catch (e: any) {
        error.value = e?.response?.data?.message || e?.message || 'Error desconocido';
      } finally {
        loading.value = false;
      }
    };

    const visibleEvents = computed(() => {
      const list = history.value?.data ?? [];

      const createdKeys = new Set<string>();
      for (const ev of list) {
        if (ev.action !== 'created') continue;
        const discId = ev.disc?.id ?? '';
        const rate   = ev.rate  ?? null;
        const cover  = ev.cover ?? null;
        createdKeys.add(`${discId}|${rate}|${cover}`);
      }

      return list.filter((ev) => {
        if (ev.action !== 'updated') return true;
        const discId = ev.disc?.id ?? '';
        const rate   = ev.rate  ?? null;
        const cover  = ev.cover ?? null;
        return !createdKeys.has(`${discId}|${rate}|${cover}`);
      });
    });

    const getScoreColor = (value: number): string => {
      const v = Math.max(0, Math.min(10, value));
      const isDark = document.documentElement.classList.contains('dark');
      const stops = isDark
        ? [
            { rating: 0,  color: [255, 90,  90 ] },
            { rating: 5,  color: [255, 200, 60 ] },
            { rating: 10, color: [80,  210, 80 ] },
          ]
        : [
            { rating: 0,  color: [180, 0,   0  ] },
            { rating: 5,  color: [170, 110, 0  ] },
            { rating: 10, color: [0,   130, 0  ] },
          ];
      let lo = stops[0], hi = stops[stops.length - 1];
      for (let i = 0; i < stops.length - 1; i++) {
        if (v >= stops[i].rating && v <= stops[i + 1].rating) { lo = stops[i]; hi = stops[i + 1]; break; }
      }
      const r     = (hi.rating - lo.rating) === 0 ? 0 : (v - lo.rating) / (hi.rating - lo.rating);
      const red   = Math.round(lo.color[0] + r * (hi.color[0] - lo.color[0]));
      const green = Math.round(lo.color[1] + r * (hi.color[1] - lo.color[1]));
      const blue  = Math.round(lo.color[2] + r * (hi.color[2] - lo.color[2]));
      return `rgb(${red},${green},${blue})`;
    };

    const nextPage = () => {
      if (!canNext.value) return;
      offset.value += limit.value;
      fetchHistory();
    };
    const prevPage = () => {
      offset.value = Math.max(0, offset.value - limit.value);
      fetchHistory();
    };

    onMounted(fetchHistory);

    watch(() => props.userId, () => {
      offset.value = 0;
      fetchHistory();
    });

    return {
      history,
      loading,
      error,
      fetchHistory,
      nextPage,
      prevPage,
      limit,
      offset,
      canNext,
      visibleEvents,
      actionLabel,
      getScoreColor,
    };
  },
});
</script>
