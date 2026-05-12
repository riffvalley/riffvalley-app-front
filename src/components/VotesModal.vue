<template>
  <div
    v-if="showVotes"
    class="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-50 z-50"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white dark:bg-rv-darkCard p-4 sm:p-6 rounded-lg shadow-xl w-[93%] sm:w-full sm:max-w-3xl relative max-h-[80vh] overflow-y-auto border border-gray-100 dark:border-white/10"
    >
      <!-- Botón cerrar -->
      <button
        @click="$emit('close')"
        class="absolute top-3 right-3 text-white bg-rv-navy hover:bg-[#e46e8a]
          rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all
          border-0 outline-none focus:outline-none focus-visible:outline-none
          ring-0 focus:ring-0 focus-visible:ring-0"
        aria-label="Cerrar"
        title="Cerrar"
      >
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>

      <!-- Título -->
      <div class="text-center mb-6">
        <h2 class="mb-3">
          <span class="bg-rv-navy text-white px-4 py-1 rounded-full text-md font-bold">
            VOTOS
          </span>
        </h2>

        <p class="text-lg text-rv-navy dark:text-white mt-2">
          {{ artistName }} – <span class="italic">{{ albumName }}</span>
        </p>

        <!-- Toggle No Spoilers (solo visible si está habilitado en Perfil) -->
        <div v-if="noSpoilers" class="flex items-center justify-center gap-2 mt-3">
          <span class="text-xs text-gray-500 dark:text-gray-400 select-none">No spoilers</span>
          <button type="button" @click="toggleNoSpoilers"
            class="relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0"
            :class="!revealed ? 'bg-rv-pink' : 'bg-gray-300 dark:bg-white/20'">
            <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
              :class="!revealed ? 'translate-x-4' : 'translate-x-0'"></span>
          </button>
          <span v-if="!revealed && !hasVoted"
            class="text-[10px] text-rv-pink font-semibold uppercase tracking-wide">activo</span>
        </div>
      </div>

      <div class="flex flex-col md:flex-row gap-4">
        <!-- Tabla -->
        <div class="w-full md:w-1/2">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead class="bg-gray-100 dark:bg-rv-darkSurface text-rv-navy dark:text-white text-xs uppercase tracking-wider">
              <tr>
                <th class="px-3 py-2 text-center font-semibold border-b border-gray-300 dark:border-white/10">Usuario</th>
                <th class="px-3 py-2 text-center font-semibold border-b border-gray-300 dark:border-white/10">Disco</th>
                <th class="px-3 py-2 text-center font-semibold border-b border-gray-300 dark:border-white/10">Portada</th>
              </tr>
            </thead>

<tbody class="bg-white dark:bg-rv-darkCard divide-y divide-gray-200 dark:divide-white/10">
              <tr v-for="vote in votes" :key="vote.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-rv-navy dark:text-white">
                  <div class="flex items-center gap-2">
                    <div class="relative overflow-hidden rounded-full bg-gray-200 dark:bg-rv-darkSurface w-10 h-10 shrink-0">
                      <img
                        v-if="vote.user.avatarUrl || vote.user.image"
                        :src="vote.user.avatarUrl || vote.user.image"
                        alt="Avatar"
                        class="w-full h-full object-cover"
                      />

                      <svg
                        v-else
                        class="w-full h-full text-gray-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>

                    <button
class="bg-gray-200 dark:bg-rv-darkSurface text-rv-navy dark:text-white px-1 rounded transition-colors duration-150
hover:bg-gray-300 dark:hover:bg-rv-purple hover:underline border border-transparent dark:border-white/10
                        outline-none focus:outline-none focus-visible:outline-none
                        ring-0 focus:ring-0 focus-visible:ring-0"
                      @click="openUserModal(
                        vote.user.username,
                        vote.user.id,
                        vote.user.avatarUrl || vote.user.image || ''
                      )"
                    >
                      {{ vote.user.username }}
                    </button>
                  </div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-sm text-center font-mono"
                  :class="spoilerMode ? 'text-rv-pink font-bold tracking-widest' : 'text-gray-500 dark:text-gray-300'">
                  {{ spoilerMode ? '???' : vote.rate }}
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-sm text-center font-mono"
                  :class="spoilerMode ? 'text-rv-pink font-bold tracking-widest' : 'text-gray-500 dark:text-gray-300'">
                  {{ spoilerMode ? '???' : vote.cover }}
                </td>
              </tr>

              <tr v-if="votes.length === 0">
                <td colspan="3" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  No hay votos disponibles.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Gráfica -->
        <div class="w-full md:w-1/2 flex flex-col items-center">
<div class="mb-4 flex items-center justify-center space-x-2 bg-gray-200 dark:bg-rv-darkSurface rounded-full p-1 border border-gray-100 dark:border-white/10">
            <button
              @click="isRateSelected = true"
              :class="[
                'text-sm font-semibold px-4 py-1 rounded-full transition-all duration-200',
                'outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0',
                isRateSelected ? 'bg-rv-navy dark:bg-rv-purple text-white' : 'bg-gray-200 dark:bg-rv-darkSurface hover:bg-gray-300 dark:hover:bg-rv-purple text-rv-navy dark:text-white'
              ]"
            >
              Disco
            </button>

            <button
              @click="isRateSelected = false"
              :class="[
                'text-sm font-semibold px-4 py-1 rounded-full transition-all duration-200',
                'outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0',
                !isRateSelected ? 'bg-rv-navy dark:bg-rv-purple text-white' : 'bg-gray-200 dark:bg-rv-darkSurface hover:bg-gray-300 dark:hover:bg-rv-purple text-rv-navy dark:text-white'
              ]"
            >
              Portada
            </button>
          </div>

          <div class="relative w-full h-56 top-1 flex flex-col items-center justify-center">
            <canvas ref="doughnut" class="w-full h-full" :class="spoilerMode ? 'blur-md' : ''"></canvas>
            <!-- Overlay spoiler sobre el chart -->
            <div v-if="spoilerMode"
              class="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <i class="fa-solid fa-lock text-2xl text-rv-pink"></i>
              <button type="button" @click="revealed = true"
                class="text-xs font-semibold px-3 py-1.5 rounded-full bg-rv-pink text-white hover:bg-rv-pink/80 transition-colors focus:outline-none">
                Ver votos
              </button>
            </div>

<div class="flex flex-wrap justify-center gap-x-1 gap-y-1 mt-4 text-xs text-rv-navy dark:text-gray-200">
              <div
                v-for="(label, i) in customLegend"
                :key="i"
                class="flex items-center space-x-1"
              >
                <div
                  :style="{ backgroundColor: label.color }"
                  class="w-2.5 h-2.5 rounded-full"
                ></div>
                <span>{{ label.text }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <UserModal
      v-if="showUserModal"
      :username="selectedUserName"
      :user-id="selectedUserId"
      :avatar-src="selectedUserAvatar"
      @close="showUserModal = false"
    />
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
  },

  emits: ["close"],

  setup(props, { emit }) {
    const doughnut = ref<HTMLCanvasElement | null>(null);
    const chartInstance = ref<Chart | null>(null);
    let createChartTimeout: ReturnType<typeof setTimeout> | null = null;

    const isRateSelected = ref(true);
    const customLegend = ref<{ text: string; color: string }[]>([]);

    // --- No Spoilers ---
    const noSpoilers = ref(localStorage.getItem('rv_no_spoilers') === 'true');
    const revealed = ref(false);

    const spoilerMode = computed(() => noSpoilers.value && !props.hasVoted && !revealed.value);

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
        chartInstance.value.destroy();
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
      nextTick(() => {
        createChart();
      });
    });

    watch(
      () => props.votes,
      () => {
        nextTick(() => {
          createChart();
        });
      },
      { deep: true }
    );

    watch(
      () => props.showVotes,
      (newVal) => {
        if (newVal) {
          nextTick(() => {
            createChart();
          });
        } else if (chartInstance.value) {
          chartInstance.value.destroy();
          chartInstance.value = null;
        }
      }
    );

    watch(isRateSelected, () => {
      if (createChartTimeout) clearTimeout(createChartTimeout);

      createChartTimeout = setTimeout(() => {
        nextTick(() => {
          createChart();
        });
      }, 200);
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
      spoilerMode,
      toggleNoSpoilers,
    };
  },
});
</script>