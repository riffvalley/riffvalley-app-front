<template>
  <div v-if="showVotes"
    class="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/60 z-50 px-4"
    @click.self="$emit('close')">

    <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-2xl
                w-full sm:max-w-3xl relative max-h-[88vh] overflow-y-auto
                border border-gray-100 dark:border-white/10">

      <!-- ── Cabecera ───────────────────────────────────────── -->
      <div class="sticky top-0 z-10 bg-white dark:bg-rv-darkCard
                  border-b border-gray-100 dark:border-white/10
                  px-5 pt-5 pb-4">

        <!-- Botón cerrar -->
        <button @click="$emit('close')"
          class="absolute top-4 right-4 text-white bg-rv-navy hover:bg-rv-pink
                 rounded-full w-9 h-9 flex items-center justify-center shadow-md transition-all
                 border-0 outline-none focus:outline-none ring-0 focus:ring-0"
          aria-label="Cerrar">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>

        <div class="pr-10">
          <div class="flex items-center gap-2 mb-1">
            <span class="bg-rv-navy dark:bg-rv-purple text-white px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase">
              Votos
            </span>
            <span class="text-xs text-gray-400 dark:text-gray-300">{{ votes.length }} participante{{ votes.length !== 1 ? 's' : '' }}</span>
          </div>
          <p class="text-base font-bold text-rv-navy dark:text-white leading-snug">
            {{ artistName }}
            <span class="font-normal text-gray-400 dark:text-gray-500 mx-1">—</span>
            <span class="italic font-semibold">{{ albumName }}</span>
          </p>
        </div>

        <!-- Toggle No Spoilers -->
        <div v-if="noSpoilers" class="flex items-center gap-2 mt-3">
          <span class="text-xs text-gray-500 dark:text-gray-400 select-none">No spoilers</span>
          <button type="button" @click="toggleNoSpoilers"
            class="relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 border-0"
            :class="!revealed ? 'bg-rv-pink' : 'bg-gray-300 dark:bg-white/20'">
            <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                  :class="!revealed ? 'translate-x-4' : 'translate-x-0'"></span>
          </button>
          <span v-if="!revealed && (spoilerDisc || spoilerCover)" class="text-[10px] text-rv-pink font-semibold uppercase tracking-wide">activo</span>
        </div>
      </div>

      <!-- ── Cuerpo ─────────────────────────────────────────── -->
      <div class="flex flex-col md:flex-row gap-0 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-white/10">

        <!-- Lista de votos -->
        <div class="w-full md:w-1/2 p-4">

          <!-- Cabecera columnas -->
          <div class="flex items-center px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-300">
            <span class="flex-1">Usuario</span>
            <span class="w-10 text-center">
              <i class="fa-solid fa-compact-disc text-rv-pink/70 mr-0.5"></i>Disco
            </span>
            <span class="w-10 text-center">
              <i class="fa-solid fa-image text-rv-purple/70 mr-0.5"></i>Port.
            </span>
          </div>

          <!-- Filas -->
          <ul class="divide-y divide-gray-50 dark:divide-white/5">
            <li v-for="vote in votes" :key="vote.id"
                class="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">

              <!-- Avatar -->
              <div class="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-rv-darkSurface shrink-0">
                <img v-if="vote.user.avatarUrl || vote.user.image"
                     :src="vote.user.avatarUrl || vote.user.image"
                     alt="Avatar" class="w-full h-full object-cover" />
                <svg v-else class="w-full h-full text-gray-400 dark:text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                </svg>
              </div>

              <!-- Nombre -->
              <button
                class="flex-1 text-left text-sm font-medium text-rv-navy dark:text-white
                       hover:text-rv-pink dark:hover:text-rv-pink transition-colors truncate
                       border-0 outline-none focus:outline-none ring-0 focus:ring-0 bg-transparent p-0"
                @click="openUserModal(vote.user.username, vote.user.id, vote.user.avatarUrl || vote.user.image || '')"
              >
                {{ vote.user.username }}
              </button>

              <!-- Scores -->
              <div class="flex items-center gap-3 shrink-0">
                <!-- Disco -->
                <span v-if="spoilerDisc"
                      class="w-7 text-center text-[11px] font-bold text-rv-pink tracking-widest">???</span>
                <span v-else-if="!vote.rate || vote.rate <= 0"
                      class="w-7 text-center text-sm font-medium text-gray-300 dark:text-white/25">—</span>
                <span v-else
                      class="w-7 text-center text-[13px] font-bold"
                      :style="{ color: getScoreColor(vote.rate) }">{{ vote.rate }}</span>

                <!-- Portada -->
                <span v-if="spoilerCover"
                      class="w-7 text-center text-[11px] font-bold text-rv-pink tracking-widest">???</span>
                <span v-else-if="!vote.cover || vote.cover <= 0"
                      class="w-7 text-center text-sm font-medium text-gray-300 dark:text-white/25">—</span>
                <span v-else
                      class="w-7 text-center text-[13px] font-bold"
                      :style="{ color: getScoreColor(vote.cover) }">{{ vote.cover }}</span>
              </div>
            </li>

            <li v-if="votes.length === 0" class="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              No hay votos disponibles.
            </li>
          </ul>
        </div>

        <!-- Gráfica -->
        <div class="w-full md:w-1/2 p-4 flex flex-col items-center">

          <!-- Toggle Disco / Portada -->
          <div class="flex items-center bg-gray-100 dark:bg-rv-darkSurface rounded-full p-1
                      border border-gray-200 dark:border-white/10 mb-4 self-center">
            <button @click="isRateSelected = true"
              class="text-sm font-semibold px-5 py-1 rounded-full transition-all duration-200
                     outline-none focus:outline-none ring-0 focus:ring-0"
              :class="isRateSelected
                ? 'bg-rv-navy dark:bg-rv-purple text-white shadow-sm'
                : 'bg-gray-200 text-gray-800 dark:bg-transparent dark:text-gray-300 hover:bg-gray-300 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white'">
              <i class="fa-solid fa-compact-disc mr-1.5 text-xs"></i>Disco
            </button>
            <button @click="isRateSelected = false"
              class="text-sm font-semibold px-5 py-1 rounded-full transition-all duration-200
                     outline-none focus:outline-none ring-0 focus:ring-0"
              :class="!isRateSelected
                ? 'bg-rv-navy dark:bg-rv-purple text-white shadow-sm'
                : 'bg-gray-200 text-gray-800 dark:bg-transparent dark:text-gray-300 hover:bg-gray-300 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white'">
              <i class="fa-solid fa-image mr-1.5 text-xs"></i>Portada
            </button>
          </div>

          <!-- Chart -->
          <div class="relative w-full h-52 flex flex-col items-center justify-center">
            <canvas ref="doughnut" class="w-full h-full" :class="spoilerChart ? 'blur-md' : ''"></canvas>

            <!-- Overlay No Spoilers -->
            <div v-if="spoilerChart" class="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <i class="fa-solid fa-lock text-3xl text-rv-pink drop-shadow"></i>
              <button type="button" @click="revealed = true"
                class="text-xs font-semibold px-4 py-1.5 rounded-full bg-rv-pink text-white
                       hover:bg-rv-pink/80 transition-colors focus:outline-none shadow-md">
                Ver votos
              </button>
            </div>
          </div>

          <!-- Leyenda -->
          <div class="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-3 text-xs text-rv-navy dark:text-gray-300">
            <div v-for="(label, i) in customLegend" :key="i" class="flex items-center gap-1">
              <div :style="{ backgroundColor: label.color }" class="w-2.5 h-2.5 rounded-full flex-shrink-0"></div>
              <span>{{ label.text }}</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <UserModal v-if="showUserModal" :username="selectedUserName" :user-id="selectedUserId"
      :avatar-src="selectedUserAvatar" @close="showUserModal = false" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch, nextTick } from "vue";
import Chart from "chart.js/auto";
import UserModal from "@/components/UserModal.vue";

interface Vote {
  id: string;
  user: {
    id: string;
    username: string;
    image?: string;
    avatarUrl?: string;
  };
  rate: number;
  cover: number;
}

export default defineComponent({
  components: {
    UserModal,
  },

  props: {
    votes: {
      type: Array as () => Vote[],
      required: true,
    },
    showVotes: {
      type: Boolean,
      required: true,
    },
    albumName: {
      type: String,
      required: true,
    },
    artistName: {
      type: String,
      required: true,
    },
    hasVoted: {
      type: Boolean,
      required: false,
      default: false,
    },
    hasVotedDisc: {
      type: Boolean,
      required: false,
      default: false,
    },
    hasVotedCover: {
      type: Boolean,
      required: false,
      default: false,
    },
  },

  emits: ["close"],

  setup(props, { emit }) {
    const doughnut = ref<HTMLCanvasElement | null>(null);
    const chartInstance = ref<Chart | null>(null);
    let chartTimer: ReturnType<typeof setTimeout> | null = null;

    // Centraliza todos los disparos de createChart en un único debounce,
    // evitando la race condition entre los watchers de votes, showVotes y onMounted.
    const scheduleChart = (delay = 50) => {
      if (chartTimer) clearTimeout(chartTimer);
      chartTimer = setTimeout(() => {
        chartTimer = null;
        nextTick(() => createChart());
      }, delay);
    };

    const isRateSelected = ref(true);
    const customLegend = ref<{ text: string; color: string }[]>([]);

    // --- No Spoilers ---
    const noSpoilers = ref(localStorage.getItem('rv_no_spoilers') === 'true');
    const revealed = ref(false);

    const spoilerDisc  = computed(() => noSpoilers.value && !props.hasVotedDisc  && !revealed.value);
    const spoilerCover = computed(() => noSpoilers.value && !props.hasVotedCover && !revealed.value);
    // Para el gráfico: usa el spoiler del tab activo
    const spoilerChart = computed(() => isRateSelected.value ? spoilerDisc.value : spoilerCover.value);

    // El toggle del modal solo controla la sesión local (revealed), nunca toca el ajuste de Perfil
    const toggleNoSpoilers = () => {
      revealed.value = !revealed.value;
    };

    // Reset revealed cada vez que se abre el modal
    watch(() => props.showVotes, (val) => {
      if (val) revealed.value = false;
    });

    const closeModal = () => {
      emit("close");
    };

    const getColor = (value: number) => {
      const normalizedValue = Math.max(0, Math.min(10, value));

      const colorStops = [
        { rating: 0, color: [139, 0, 0] },
        { rating: 5, color: [255, 255, 0] },
        { rating: 10, color: [0, 128, 0] },
      ];

      let lowerStop = colorStops[0];
      let upperStop = colorStops[colorStops.length - 1];

      for (let i = 0; i < colorStops.length - 1; i++) {
        if (
          normalizedValue >= colorStops[i].rating &&
          normalizedValue <= colorStops[i + 1].rating
        ) {
          lowerStop = colorStops[i];
          upperStop = colorStops[i + 1];
          break;
        }
      }

      const ratio =
        (normalizedValue - lowerStop.rating) /
        (upperStop.rating - lowerStop.rating);

      const red = Math.round(
        lowerStop.color[0] + ratio * (upperStop.color[0] - lowerStop.color[0])
      );
      const green = Math.round(
        lowerStop.color[1] + ratio * (upperStop.color[1] - lowerStop.color[1])
      );
      const blue = Math.round(
        lowerStop.color[2] + ratio * (upperStop.color[2] - lowerStop.color[2])
      );

      return `rgb(${red}, ${green}, ${blue}, 0.7)`;
    };

    const createChart = () => {
      if (!doughnut.value) return;

      const rateCounts: { [key: number]: number } = {};
      const coverCounts: { [key: number]: number } = {};

      props.votes.forEach((vote) => {
        if (vote.rate !== null && vote.rate > 0.01) {
          const roundedRate = Math.round(vote.rate);
          rateCounts[roundedRate] = (rateCounts[roundedRate] || 0) + 1;
        }

        if (vote.cover !== null && vote.cover > 0.01) {
          const roundedCover = Math.round(vote.cover);
          coverCounts[roundedCover] = (coverCounts[roundedCover] || 0) + 1;
        }
      });

      const allLabels = Array.from({ length: 10 }, (_, i) => String(i + 1));

      const rateData = allLabels.map((label) => rateCounts[Number(label)] || 0);
      const coverData = allLabels.map((label) => coverCounts[Number(label)] || 0);

      const backgroundColors = allLabels.map((label) => getColor(Number(label)));
      const borderColors = backgroundColors.map((color) =>
        color.replace("0.7", "1")
      );

      if (chartInstance.value) {
        try { chartInstance.value.destroy(); } catch (_) {}
        chartInstance.value = null;
      }

      const selectedData = isRateSelected.value ? rateData : coverData;
      const dynamicTitle = isRateSelected.value
        ? "Votos en Disco"
        : "Votos en Portada";

      const field = isRateSelected.value ? "rate" : "cover";

      const validValues = props.votes
        .map((v) => Number(v[field]))
        .filter((n) => !isNaN(n) && n > 0);

      const average =
        validValues.length > 0
          ? (
            validValues.reduce((acc, val) => acc + val, 0) /
            validValues.length
          ).toFixed(2)
          : "0.00";

      const centerTextPlugin = {
        id: "centerText",
        beforeDraw: (chart: any) => {
          const { width, height, ctx } = chart;

          if (!ctx || typeof ctx.fillText !== "function") return;

          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const numVotes = validValues.length;
          const votesText = `${numVotes} voto${numVotes === 1 ? "" : "s"}`;

          const isDark = document.documentElement.classList.contains("dark");
          ctx.fillStyle = isDark ? "#e5e7eb" : "#1f2937";
          ctx.font = "bold 22px sans-serif";
          ctx.fillText(average, width / 2, height / 2 + 13);

          ctx.font = "normal 11px sans-serif";
          ctx.fillText(votesText, width / 2, height / 2 + 31);

          ctx.restore();
        },
      };

      chartInstance.value = new Chart(doughnut.value, {
        type: "doughnut",
        data: {
          labels: allLabels,
          datasets: [
            {
              label: "Votos",
              data: selectedData,
              backgroundColor: backgroundColors,
              borderColor: borderColors,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: dynamicTitle,
              color: document.documentElement.classList.contains("dark") ? "#e5e7eb" : "#1f2937",
            },
            legend: {
              display: false,
            },
          },
        },
        plugins: [centerTextPlugin],
      });

      customLegend.value = allLabels.map((label, i) => ({
        text: `${label}`,
        color: backgroundColors[i],
      }));
    };

    onMounted(() => {
      scheduleChart();
    });

    watch(
      () => props.votes,
      () => { scheduleChart(); },
      { deep: true }
    );

    watch(
      () => props.showVotes,
      (newVal) => {
        if (newVal) {
          scheduleChart();
        } else {
          if (chartTimer) clearTimeout(chartTimer);
          if (chartInstance.value) {
            try { chartInstance.value.destroy(); } catch (_) {}
            chartInstance.value = null;
          }
        }
      }
    );

    watch(isRateSelected, () => {
      scheduleChart(200);
    });

    const showUserModal = ref(false);
    const selectedUserName = ref("");
    const selectedUserId = ref("");
    const selectedUserAvatar = ref("");

    const openUserModal = (
      username: string,
      userId: string,
      avatar?: string
    ) => {
      selectedUserName.value = username;
      selectedUserId.value = userId;
      selectedUserAvatar.value = avatar ?? "";
      showUserModal.value = true;
    };

    return {
      closeModal,
      doughnut,
      isRateSelected,
      customLegend,
      showUserModal,
      selectedUserName,
      selectedUserId,
      selectedUserAvatar,
      openUserModal,
      noSpoilers,
      revealed,
      spoilerDisc,
      spoilerCover,
      spoilerChart,
      toggleNoSpoilers,
      getColor,
      getScoreColor: (value: number): string => {
        const v = Math.max(0, Math.min(10, value));
        const isDark = document.documentElement.classList.contains('dark');
        const stops = isDark
          ? [
              { rating: 0,  color: [255, 90,  90 ] },  // rojo claro
              { rating: 5,  color: [255, 200, 60 ] },  // ámbar claro
              { rating: 10, color: [80,  210, 80 ] },  // verde claro
            ]
          : [
              { rating: 0,  color: [180, 0,   0  ] },  // rojo oscuro
              { rating: 5,  color: [170, 110, 0  ] },  // ámbar oscuro
              { rating: 10, color: [0,   130, 0  ] },  // verde oscuro
            ];
        let lo = stops[0], hi = stops[stops.length - 1];
        for (let i = 0; i < stops.length - 1; i++) {
          if (v >= stops[i].rating && v <= stops[i + 1].rating) { lo = stops[i]; hi = stops[i + 1]; break; }
        }
        const r = (hi.rating - lo.rating) === 0 ? 0 : (v - lo.rating) / (hi.rating - lo.rating);
        const red   = Math.round(lo.color[0] + r * (hi.color[0] - lo.color[0]));
        const green = Math.round(lo.color[1] + r * (hi.color[1] - lo.color[1]));
        const blue  = Math.round(lo.color[2] + r * (hi.color[2] - lo.color[2]));
        return `rgb(${red},${green},${blue})`;
      },
    };
  },
});
</script>