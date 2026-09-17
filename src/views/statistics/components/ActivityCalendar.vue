<template>
  <div class="w-full overflow-x-auto">
    <div class="inline-flex flex-col gap-1 min-w-[720px]">

      <!-- Etiquetas de mes -->
      <div class="relative" :style="{ height: `${LABEL_ROW_HEIGHT + 7 * (CELL + GAP) - GAP}px` }">
        <div class="flex gap-1" :style="{ paddingLeft: `${DAY_LABEL_WIDTH}px`, height: `${LABEL_ROW_HEIGHT}px` }">
          <span v-for="(label, i) in monthLabels" :key="i"
            class="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap"
            :style="{ width: `${CELL}px`, flexShrink: 0 }">
            {{ label }}
          </span>
        </div>

        <div class="flex gap-1">
          <!-- Etiquetas de día -->
          <div class="flex flex-col gap-1 justify-between flex-shrink-0" :style="{ width: `${DAY_LABEL_WIDTH}px`, height: `${7 * (CELL + GAP) - GAP}px` }">
            <span v-for="d in ['L', '', 'X', '', 'V', '', 'D']" :key="d"
              class="text-[10px] text-gray-400 dark:text-gray-500 leading-none" :style="{ height: `${CELL}px` }">{{ d }}</span>
          </div>

          <!-- Semanas -->
          <div class="flex gap-1">
            <div v-for="(week, wi) in weeks" :key="wi" class="flex flex-col gap-1">
              <div v-for="(day, di) in week" :key="di"
                class="rounded-sm"
                :class="!day || day.count === 0 ? 'bg-gray-100 dark:bg-white/10' : ''"
                :style="{ width: `${CELL}px`, height: `${CELL}px`, ...(day ? cellStyle(day.count) : {}) }"
                :title="day ? `${day.date}: ${day.count} voto${day.count !== 1 ? 's' : ''}` : ''"
              ></div>
            </div>
          </div>
        </div>

        <!-- Separadores entre meses: línea vertical antes de la primera semana de cada mes -->
        <div v-for="wi in monthBoundaryWeeks" :key="`sep-${wi}`"
          class="absolute w-px bg-gray-200 dark:bg-white/15 pointer-events-none"
          :style="{
            left: `${DAY_LABEL_WIDTH + wi * (CELL + GAP) - GAP / 2}px`,
            top: `${LABEL_ROW_HEIGHT}px`,
            height: `${7 * (CELL + GAP) - GAP}px`,
          }"
        ></div>
      </div>

      <!-- Leyenda -->
      <div class="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 dark:text-gray-500" :style="{ paddingLeft: `${DAY_LABEL_WIDTH}px` }">
        Menos
        <span class="rounded-sm bg-gray-100 dark:bg-white/10" :style="{ width: `${CELL}px`, height: `${CELL}px` }"></span>
        <span v-for="color in LEVEL_COLORS" :key="color" class="rounded-sm" :style="{ width: `${CELL}px`, height: `${CELL}px`, backgroundColor: color }"></span>
        Más
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from "vue";

const CELL = 12;
const GAP = 4;
const DAY_LABEL_WIDTH = 20;
const LABEL_ROW_HEIGHT = 16;
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
// Rampa secuencial de un solo tono (marca rv-pink), colores sólidos: se ve igual de
// bien sobre tarjeta clara u oscura, a diferencia de usar opacidad (que en modo
// oscuro se funde con el fondo y hace parecer "vacíos" días con poca actividad).
const LEVEL_COLORS = ['#f8c9d6', '#ef94ab', '#e46e8a', '#b23b5c'];

type DayCell = { date: string; count: number } | null;

export default defineComponent({
  name: "ActivityCalendar",
  props: {
    votesByDay: {
      type: Array as PropType<{ date: string; count: number }[]>,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const countByDate = computed(() => new Map(props.votesByDay.map(d => [d.date, d.count])));

    const maxCount = computed(() => Math.max(1, ...props.votesByDay.map(d => d.count)));

    // Rejilla semanal (lunes a domingo) desde el primer lunes de la semana del 1 de
    // enero hasta el último domingo de la semana del 31 de diciembre.
    const weeks = computed<DayCell[][]>(() => {
      const start = new Date(props.year, 0, 1);
      const end = new Date(props.year, 11, 31);

      const startWeekday = (start.getDay() + 6) % 7; // lunes = 0
      const gridStart = new Date(start);
      gridStart.setDate(start.getDate() - startWeekday);

      const endWeekday = (end.getDay() + 6) % 7;
      const gridEnd = new Date(end);
      gridEnd.setDate(end.getDate() + (6 - endWeekday));

      const result: DayCell[][] = [];
      let week: DayCell[] = [];
      const cursor = new Date(gridStart);

      while (cursor <= gridEnd) {
        const inYear = cursor.getFullYear() === props.year;
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, '0');
        const d = String(cursor.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${d}`;
        week.push(inYear ? { date: iso, count: countByDate.value.get(iso) ?? 0 } : null);

        if (week.length === 7) {
          result.push(week);
          week = [];
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      return result;
    });

    // Una etiqueta de mes sobre la primera semana en la que aparece ese mes.
    const monthLabels = computed(() => {
      const labels: string[] = new Array(weeks.value.length).fill('');
      let lastMonth = -1;
      weeks.value.forEach((week, wi) => {
        const firstDay = week.find(d => d);
        if (!firstDay) return;
        const month = Number(firstDay.date.slice(5, 7)) - 1;
        if (month !== lastMonth) {
          labels[wi] = MONTHS_ES[month];
          lastMonth = month;
        }
      });
      return labels;
    });

    // Índices de semana donde empieza un mes nuevo (para dibujar el separador),
    // el primero (índice 0) no cuenta porque no hay nada antes que separar.
    const monthBoundaryWeeks = computed(() =>
      monthLabels.value
        .map((label, i) => (label && i > 0 ? i : null))
        .filter((i): i is number => i !== null)
    );

    const cellStyle = (count: number) => {
      if (count === 0) return {};
      const ratio = count / maxCount.value;
      let idx = 0;
      if (ratio > 0.75) idx = 3;
      else if (ratio > 0.5) idx = 2;
      else if (ratio > 0.25) idx = 1;
      return { backgroundColor: LEVEL_COLORS[idx] };
    };

    return { weeks, monthLabels, monthBoundaryWeeks, cellStyle, CELL, GAP, DAY_LABEL_WIDTH, LABEL_ROW_HEIGHT, LEVEL_COLORS };
  },
});
</script>
