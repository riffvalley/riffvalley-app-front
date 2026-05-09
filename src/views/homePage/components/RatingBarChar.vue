<template>
  <div class="w-full h-64 rounded-xl bg-white dark:bg-rv-darkSurface p-3">
    <Bar v-if="loaded" :data="chartData" :options="chartOptions" />
    <p v-else class="text-center text-gray-500 dark:text-gray-300">Cargando gráfico...</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import type { PropType } from "vue";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  type ChartOptions,
} from "chart.js";

// Registrar componentes de Chart.js
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

export default defineComponent({
  name: "RatingBarChart",
  components: { Bar },
  props: {
    ratingDistribution: {
      type: Array as PropType<{ rate: number; count: number }[]>,
      required: true,
    },
  },
  setup(props) {
    const loaded = ref(false);

    // Función para asignar colores según el rating
    const getColorForRate = (rate: number) => {
      const colors: { [key: number]: string } = {
        1: "#ff0000", // Rojo intenso
        1.25: "#ff1919",
        1.5: "#ff3333",
        1.75: "#ff4d4d",
        2: "#ff6666", // Rojo más claro
        2.25: "#ff7966",
        2.5: "#ff8c66",
        2.75: "#ff9f66",
        3: "#ff9900", // Naranja
        3.25: "#ffaa33",
        3.5: "#ffbb66",
        3.75: "#ffcc99",
        4: "#ffcc66", // Naranja más claro
        4.25: "#ffd480",
        4.5: "#ffdb99",
        4.75: "#ffe3b3",
        5: "#ffff00", // Amarillo
        5.25: "#e6ff19",
        5.5: "#ccff33",
        5.75: "#b3ff4d",
        6: "#ccff66", // Amarillo más claro
        6.25: "#99ff66",
        6.5: "#66ff66",
        6.75: "#4dff80",
        7: "#66ff66", // Verde claro
        7.25: "#4dff66",
        7.5: "#33ff66",
        7.75: "#19ff66",
        8: "#33cc33", // Verde más intenso
        8.25: "#2eb82e",
        8.5: "#29a329",
        8.75: "#248f24",
        9: "#009900", // Verde aún más intenso
        9.25: "#008800",
        9.5: "#007700",
        9.75: "#006600",
        10: "#006600", // Verde completamente intenso
      };
      return colors[rate] || "#cccccc"; // Color gris si el rate no está definido
    };

    // Datos del gráfico
    const chartData = ref({
      labels: [] as number[],
      datasets: [
        {
          backgroundColor: [] as string[], // Colores dinámicos
          data: [] as number[],
        },
      ],
    });

    // Opciones del gráfico (ocultar la leyenda)
const chartOptions = ref<ChartOptions<"bar">>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      titleColor: "#ffffff",
      bodyColor: "#ffffff",
      backgroundColor: "#1f2937",
    },
  },
  scales: {
    x: {
      ticks: {
        color: "#d1d5db",
      },
      grid: {
        color: "rgba(255,255,255,0.08)",
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        color: "#d1d5db",
      },
      grid: {
        color: "rgba(255,255,255,0.08)",
      },
    },
  },
});

    // Observa cambios en ratingDistribution y actualiza los datos
    watch(
      () => props.ratingDistribution,
      (newData) => {
        if (newData && newData.length > 0) {
          chartData.value = {
            labels: newData.map((item) => item.rate),
            datasets: [
              {
                backgroundColor: newData.map((item) => getColorForRate(item.rate)),
                data: newData.map((item) => item.count),
              },
            ],
          };
        } else {
          chartData.value = {
            labels: [],
            datasets: [
              {
                backgroundColor: [],
                data: [],
              },
            ],
          };
        }
        // Si llega newData (aunque sea vacío), asumimos que se cargó.
        loaded.value = true;
      },
      { immediate: true, deep: true }
    );

    return { chartData, chartOptions, loaded };
  },
});
</script>

<style scoped>
/* Estilos opcionales */
</style>