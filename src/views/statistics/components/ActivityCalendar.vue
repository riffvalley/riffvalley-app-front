<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import type { StatisticsDailyActivity } from "@/modules/statistics/types/statistics";
import { buildActivityCalendar, formatCivilDate, totalActivity } from "../utils/activityVisualizations";

const props = defineProps<{
  year: number;
  activity: readonly StatisticsDailyActivity[];
  annualActivityCount: number;
}>();

const weeks = computed(() => buildActivityCalendar(props.year, props.activity));
const calendarDays = computed(() => weeks.value.flat().filter((day): day is StatisticsDailyActivity => day !== null));
const activeDays = computed(() => calendarDays.value.filter(({ activityCount }) => activityCount > 0));
const maxCount = computed(() => Math.max(1, ...calendarDays.value.map(({ activityCount }) => activityCount)));
const dailyDiscTotal = computed(() => totalActivity(calendarDays.value.map(({ activityCount }) => activityCount)));
const monthLabels = computed(() => weeks.value.map((week, weekIndex) => {
  const firstDay = week.find((day) => day !== null);
  if (!firstDay) return "";
  const [, month] = firstDay.date.split("-").map(Number);
  const priorWeek = weeks.value[weekIndex - 1];
  const priorDay = priorWeek?.find((day) => day !== null);
  return !priorDay || priorDay.date.slice(5, 7) !== firstDay.date.slice(5, 7)
    ? new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" })
      .format(new Date(Date.UTC(props.year, month! - 1, 1)))
    : "";
}));

const focusedDate = ref("");
const pinnedDay = ref<StatisticsDailyActivity | null>(null);
const hoveredDay = ref<StatisticsDailyActivity | null>(null);
const detailDay = computed(() => pinnedDay.value ?? hoveredDay.value);
const detailPosition = ref({ left: 16, top: 16 });
const dayButtons = new Map<string, HTMLButtonElement>();
const closeButton = useTemplateRef<HTMLButtonElement>("closeButton");
const dayGrid = useTemplateRef<HTMLDivElement>("dayGrid");
const availableGridWidth = shallowRef(0);
const cellSize = computed(() => Math.min(16, availableGridWidth.value > 0 ? availableGridWidth.value / weeks.value.length : 6));
const rowHeight = computed(() => Math.max(12, cellSize.value));
let hoverCloseTimeout: ReturnType<typeof setTimeout> | undefined;
let gridResizeObserver: ResizeObserver | undefined;

const firstActiveDate = computed(() => calendarDays.value.find(({ activityCount }) => activityCount > 0)?.date ?? "");
const firstFocusableDate = computed(() => firstActiveDate.value || calendarDays.value[0]?.date || "");
const tabStopDate = computed(() => calendarDays.value.some(({ date }) => date === focusedDate.value) ? focusedDate.value : firstFocusableDate.value);
const totalMismatch = computed(() => dailyDiscTotal.value !== props.annualActivityCount);

function cellStyle(count: number): Record<string, string> {
  if (count === 0) return { backgroundColor: "var(--activity-empty)" };
  const ratio = count / maxCount.value;
  const level = ratio <= 0.25 ? "#f8c9d6" : ratio <= 0.5 ? "#ef94ab" : ratio <= 0.75 ? "#e46e8a" : "#b23b5c";
  return { backgroundColor: level };
}

function setDayButton(date: string, element: Element | null): void {
  if (element instanceof HTMLButtonElement) dayButtons.set(date, element);
  else dayButtons.delete(date);
}

function positionPanel(event: MouseEvent | PointerEvent): void {
  const width = Math.min(352, window.innerWidth - 32);
  const left = Math.max(16, Math.min(event.clientX + 14, window.innerWidth - width - 16));
  const top = Math.max(16, Math.min(event.clientY + 14, window.innerHeight - 280));
  detailPosition.value = { left, top };
}

function onDayEnter(day: StatisticsDailyActivity, event: MouseEvent): void {
  if (pinnedDay.value) return;
  if (hoverCloseTimeout) clearTimeout(hoverCloseTimeout);
  hoveredDay.value = day;
  positionPanel(event);
}

function onDayLeave(): void {
  if (pinnedDay.value) return;
  hoverCloseTimeout = setTimeout(() => { hoveredDay.value = null; }, 180);
}

function toggleDay(day: StatisticsDailyActivity, event: MouseEvent): void {
  if (pinnedDay.value?.date === day.date) {
    closeDetails(false);
    return;
  }
  if (hoverCloseTimeout) clearTimeout(hoverCloseTimeout);
  pinnedDay.value = day;
  hoveredDay.value = null;
  positionPanel(event);
  nextTick(() => closeButton.value?.focus());
}

function closeDetails(returnFocus = true): void {
  const date = pinnedDay.value?.date;
  pinnedDay.value = null;
  hoveredDay.value = null;
  if (hoverCloseTimeout) clearTimeout(hoverCloseTimeout);
  if (returnFocus && date) nextTick(() => dayButtons.get(date)?.focus());
}

function moveFocus(day: StatisticsDailyActivity, offset: number): void {
  const index = calendarDays.value.findIndex(({ date }) => date === day.date);
  const next = calendarDays.value[index + offset];
  if (!next) return;
  focusedDate.value = next.date;
  nextTick(() => dayButtons.get(next.date)?.focus());
}

function onDayKeydown(day: StatisticsDailyActivity, event: KeyboardEvent): void {
  const offsets: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
  if (event.key in offsets) {
    event.preventDefault();
    moveFocus(day, offsets[event.key]!);
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    const index = calendarDays.value.findIndex(({ date }) => date === day.date);
    const weekdayOffset = (new Date(`${day.date}T00:00:00Z`).getUTCDay() + 6) % 7;
    const dayOffset = event.key === "Home" ? -weekdayOffset : 6 - weekdayOffset;
    const target = calendarDays.value[Math.max(0, Math.min(calendarDays.value.length - 1, index + dayOffset))];
    if (target) {
      focusedDate.value = target.date;
      nextTick(() => dayButtons.get(target.date)?.focus());
    }
  } else if (event.key === "Escape" && pinnedDay.value) {
    event.preventDefault();
    closeDetails();
  }
}

onBeforeUnmount(() => {
  if (hoverCloseTimeout) clearTimeout(hoverCloseTimeout);
  gridResizeObserver?.disconnect();
});

onMounted(() => {
  if (typeof ResizeObserver === "undefined" || !dayGrid.value) return;
  gridResizeObserver = new ResizeObserver(([entry]) => {
    if (entry) availableGridWidth.value = entry.contentRect.width;
  });
  gridResizeObserver.observe(dayGrid.value);
});

watch(() => props.year, () => {
  pinnedDay.value = null;
  hoveredDay.value = null;
  focusedDate.value = "";
  if (hoverCloseTimeout) clearTimeout(hoverCloseTimeout);
});
</script>

<template>
  <article
    aria-labelledby="activity-calendar-title"
    class="rounded-2xl border border-gray-100 bg-white p-5 shadow-md dark:border-white/10 dark:bg-rv-navy sm:p-6"
  >
    <header class="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div>
        <h2 id="activity-calendar-title" class="text-lg font-semibold text-gray-800 dark:text-white">Calendario de actividad</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Selecciona un día para consultar sus discos con actividad</p>
      </div>
      <p class="text-sm tabular-nums text-gray-500 dark:text-gray-400">{{ year }} · {{ annualActivityCount.toLocaleString("es-ES") }} votos</p>
    </header>

    <p v-if="dailyDiscTotal === 0" role="status" class="mb-4 text-sm text-gray-600 dark:text-gray-300">
      No hay discos con actividad en {{ year }}.
    </p>

    <div class="mx-auto w-full min-w-0 pb-2" :style="{ '--activity-empty': 'var(--color-gray-100, #f3f4f6)' }">
      <div class="mb-3 flex w-full items-end gap-1" aria-hidden="true">
        <span class="w-3 shrink-0 pr-1" />
        <div class="grid min-w-0 flex-1 overflow-hidden text-[10px] font-medium capitalize text-gray-500 dark:text-gray-400" :style="{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }">
          <span v-for="(label, index) in monthLabels" :key="index" class="whitespace-nowrap">{{ label }}</span>
        </div>
      </div>
      <div class="flex w-full min-w-0 gap-1">
          <div class="relative -left-2 grid w-3 shrink-0 grid-rows-7 gap-y-1 pr-1 text-[9px] leading-3 text-gray-500 dark:text-gray-400" aria-hidden="true">
            <span>L</span><span></span><span>X</span><span></span><span>V</span><span></span><span>D</span>
          </div>
          <div ref="dayGrid" class="grid min-w-0 flex-1 grid-flow-col grid-rows-7 gap-y-1" :style="{ gridTemplateRows: `repeat(7, ${rowHeight}px)`, gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }" role="grid" :aria-label="`Calendario de actividad de ${year}. Cada columna es una semana y cada fila un día, de lunes a domingo. Cada fecha indica cuántos discos tuvieron actividad. Usa las flechas para consultar los días.`">
            <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="contents" role="row">
              <template v-for="(day, dayIndex) in week" :key="day?.date ?? `empty-${weekIndex}-${dayIndex}`">
                <span v-if="!day" class="block justify-self-center self-center" :style="{ width: `${cellSize}px`, height: `${cellSize}px` }" aria-hidden="true" />
                <button
                  v-else
                  :ref="(element) => setDayButton(day.date, element as Element | null)"
                  type="button"
                  role="gridcell"
                  class="min-h-0 min-w-0 justify-self-center self-center rounded-[2px] p-0 outline-offset-2 transition-transform hover:z-10 hover:scale-125 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink"
                  :class="day.activityCount > 0 ? 'ring-1 ring-black/5 dark:ring-white/10' : ''"
                  :style="{ ...(day.activityCount > 0 ? cellStyle(day.activityCount) : { backgroundColor: 'transparent' }), width: `${cellSize}px`, height: `${cellSize}px` }"
                  :tabindex="day.date === tabStopDate ? 0 : -1"
                  :aria-label="`${formatCivilDate(day.date)}: ${day.activityCount} ${day.activityCount === 1 ? 'disco con actividad' : 'discos con actividad'}`"
                  aria-haspopup="dialog"
                  :aria-expanded="pinnedDay?.date === day.date"
                  @focus="focusedDate = day.date"
                  @focusout="onDayLeave"
                  @mouseenter="onDayEnter(day, $event)"
                  @mouseleave="onDayLeave"
                  @click="toggleDay(day, $event)"
                  @keydown="onDayKeydown(day, $event)"
                />
              </template>
            </div>
          </div>
      </div>
      <div class="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-gray-600 dark:text-gray-300" aria-label="Leyenda de actividad: sin actividad a más discos con actividad">
          <span>Sin actividad</span>
          <span v-for="color in ['#f8c9d6', '#ef94ab', '#e46e8a', '#b23b5c']" :key="color" class="h-3 w-3 rounded-[2px] ring-1 ring-black/5 dark:ring-white/10" :style="{ backgroundColor: color }" aria-hidden="true" />
          <span>Más</span>
      </div>
    </div>

    <ol class="sr-only" :aria-label="`Días activos y discos con actividad por fecha en ${year}`">
      <li v-for="day in activeDays" :key="day.date">
        {{ formatCivilDate(day.date) }}: {{ day.activityCount }} {{ day.activityCount === 1 ? "disco con actividad" : "discos con actividad" }}
      </li>
    </ol>

    <p v-if="totalMismatch" role="status" class="mt-4 text-sm text-amber-800 dark:text-amber-200">
      Las fechas suman {{ dailyDiscTotal.toLocaleString("es-ES") }} {{ dailyDiscTotal === 1 ? "registro de disco con actividad" : "registros de discos con actividad" }} (un disco puede aparecer en varios días) y el resumen anual indica
      {{ annualActivityCount.toLocaleString("es-ES") }} votos. Se muestran los datos recibidos sin ajustes.
    </p>

    <Teleport to="body">
      <section
        v-if="detailDay"
        :id="pinnedDay ? 'calendar-day-detail' : undefined"
        :role="pinnedDay ? 'dialog' : 'tooltip'"
        tabindex="-1"
        :aria-labelledby="pinnedDay ? 'calendar-detail-title' : undefined"
        class="fixed z-[100] max-h-[min(24rem,70vh)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 text-left text-sm shadow-xl dark:border-white/10 dark:bg-rv-darkSurface"
        :class="pinnedDay ? 'pointer-events-auto' : 'pointer-events-none'"
        :style="{ left: `${detailPosition.left}px`, top: `${detailPosition.top}px` }"
      >
        <header class="flex items-start justify-between gap-3">
          <div>
            <h3 :id="pinnedDay ? 'calendar-detail-title' : undefined" class="font-semibold capitalize text-gray-900 dark:text-white">{{ formatCivilDate(detailDay.date) }}</h3>
            <p class="mt-1 text-sm font-medium tabular-nums text-gray-600 dark:text-gray-300">
              {{ detailDay.activityCount }} {{ detailDay.activityCount === 1 ? "disco con actividad" : "discos con actividad" }} ese día
            </p>
          </div>
          <button v-if="pinnedDay" ref="closeButton" type="button" aria-label="Cerrar detalle del día" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink dark:text-gray-200 dark:hover:bg-white/10" @click="closeDetails()" @keydown.esc="closeDetails()">
            <i class="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </header>
      </section>
    </Teleport>
  </article>
</template>
