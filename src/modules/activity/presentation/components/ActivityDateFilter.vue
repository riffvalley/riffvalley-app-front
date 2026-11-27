<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import {
  isValidActivityDate,
  type ActivityDateFilter,
} from "../../application/activityDateFilter";

const props = defineProps<{
  modelValue: ActivityDateFilter;
  timeZone: string | null;
}>();
const emit = defineEmits<{ "update:modelValue": [filter: ActivityDateFilter] }>();

type SelectionMode = ActivityDateFilter["mode"];
const selectionMode = shallowRef<SelectionMode>(props.modelValue.mode);
const dayDraft = shallowRef(props.modelValue.mode === "day" ? props.modelValue.date : "");
const fromDraft = shallowRef(props.modelValue.mode === "range" ? props.modelValue.from : "");
const toDraft = shallowRef(props.modelValue.mode === "range" ? props.modelValue.to : "");
const rangeReversed = computed(() =>
  isValidActivityDate(fromDraft.value)
  && isValidActivityDate(toDraft.value)
  && fromDraft.value > toDraft.value,
);
const rangeIncomplete = computed(() => !fromDraft.value || !toDraft.value);
const canApplyRange = computed(() =>
  !rangeIncomplete.value
  && isValidActivityDate(fromDraft.value)
  && isValidActivityDate(toDraft.value)
  && !rangeReversed.value,
);
watch(() => props.modelValue, (filter) => {
  selectionMode.value = filter.mode;
  dayDraft.value = filter.mode === "day" ? filter.date : "";
  fromDraft.value = filter.mode === "range" ? filter.from : "";
  toDraft.value = filter.mode === "range" ? filter.to : "";
});

function chooseMode(mode: SelectionMode): void {
  selectionMode.value = mode;
  if (mode === "all") emit("update:modelValue", { mode: "all" });
  if (mode === "day" && props.modelValue.mode === "day") dayDraft.value = props.modelValue.date;
  if (mode === "range" && props.modelValue.mode === "range") {
    fromDraft.value = props.modelValue.from;
    toDraft.value = props.modelValue.to;
  }
}

function applyDay(): void {
  if (!isValidActivityDate(dayDraft.value)) return;
  emit("update:modelValue", { mode: "day", date: dayDraft.value });
}

function applyRange(): void {
  if (!canApplyRange.value) return;
  emit("update:modelValue", { mode: "range", from: fromDraft.value, to: toDraft.value });
}

function clearFilter(): void {
  selectionMode.value = "all";
  dayDraft.value = "";
  fromDraft.value = "";
  toDraft.value = "";
  emit("update:modelValue", { mode: "all" });
}
</script>

<template>
  <section class="date-filter" aria-label="Filtrar actividad por fecha">
    <p v-if="timeZone === null" class="timezone-error" role="alert">
      No se pudo determinar la zona horaria del navegador. El historial no se consultará hasta que haya una zona IANA válida.
    </p>

    <div class="filter-actions">
      <div class="mode-list" role="group" aria-label="Filtros de fecha">
        <button
          class="mode-button"
          :class="{ 'mode-button--active': selectionMode === 'all' }"
          type="button"
          :aria-pressed="selectionMode === 'all'"
          @click="chooseMode('all')"
        >
          Todas las fechas
        </button>
      <button
        class="mode-button"
        :class="{ 'mode-button--active': selectionMode === 'day' }"
        type="button"
        :aria-pressed="selectionMode === 'day'"
        @click="chooseMode('day')"
      >
        Día concreto
      </button>
      <button
        class="mode-button"
        :class="{ 'mode-button--active': selectionMode === 'range' }"
        type="button"
        :aria-pressed="selectionMode === 'range'"
        @click="chooseMode('range')"
      >
        Intervalo
      </button>
      </div>
      <button
        v-if="modelValue.mode !== 'all'"
        class="clear-button"
        type="button"
        @click="clearFilter"
      >
        Limpiar fecha
      </button>
    </div>

    <div v-if="selectionMode === 'day'" class="date-fields">
      <label class="date-field" for="activity-date-day">
        Día
        <input
          id="activity-date-day"
          v-model="dayDraft"
          class="date-input"
          type="date"
          :aria-invalid="dayDraft.length > 0 && !isValidActivityDate(dayDraft)"
          :disabled="timeZone === null"
          @change="applyDay"
        />
      </label>
      <p v-if="dayDraft && !isValidActivityDate(dayDraft)" class="date-error" role="alert">
        Introduce una fecha válida.
      </p>
    </div>

    <form v-else-if="selectionMode === 'range'" class="date-fields range-fields" @submit.prevent="applyRange">
      <label class="date-field" for="activity-date-from">
        Desde
        <input
          id="activity-date-from"
          v-model="fromDraft"
          class="date-input"
          type="date"
          :aria-invalid="fromDraft.length > 0 && !isValidActivityDate(fromDraft)"
          :disabled="timeZone === null"
        />
      </label>
      <label class="date-field" for="activity-date-to">
        Hasta
        <input
          id="activity-date-to"
          v-model="toDraft"
          class="date-input"
          type="date"
          :aria-invalid="toDraft.length > 0 && !isValidActivityDate(toDraft)"
          :disabled="timeZone === null"
        />
      </label>
      <button class="apply-button" type="submit" :disabled="!canApplyRange || timeZone === null">
        Aplicar intervalo
      </button>
      <p v-if="rangeIncomplete" class="date-hint">
        Selecciona las dos fechas para aplicar el intervalo.
      </p>
      <p v-else-if="!isValidActivityDate(fromDraft) || !isValidActivityDate(toDraft)" class="date-error" role="alert">
        Introduce fechas válidas.
      </p>
      <p v-else-if="rangeReversed" class="date-error" role="alert">
        La fecha inicial debe ser anterior o igual a la final.
      </p>
    </form>
  </section>
</template>

<style scoped>
/* Mismo lenguaje visual que el resto de secciones: sin panel propio,
   píldoras como los meses de Calendario y campos como los formularios. */
.date-filter {
  margin-inline: auto;
  max-width: 44rem;
  text-align: center;
}

.mode-list,
.date-fields {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.clear-button {
  display: block;
  margin: 0.5rem auto 0;
}

.mode-button,
.apply-button {
  min-height: 2.5rem;
  border: 0;
  border-radius: 9999px;
  background: #e5e7eb; /* gray-200 */
  padding: 0.5rem 1rem;
  color: #00021f; /* rv-navy */
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%);
  transition: background-color 200ms ease, color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
}

.mode-button:hover,
.apply-button:hover:not(:disabled) {
  background: #00021f;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%);
}

.mode-button:active,
.apply-button:active:not(:disabled) {
  transform: scale(0.97);
}

.mode-button--active,
.apply-button {
  background: #00021f;
  color: #fff;
}

.mode-button--active:hover,
.apply-button:hover:not(:disabled) {
  opacity: 0.85;
}

.clear-button {
  min-height: 2.5rem;
  border: 0;
  background: transparent;
  padding: 0.45rem 0.75rem;
  color: #6b7280; /* gray-500 */
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.18em;
  transition: color 150ms ease;
}

.clear-button:hover { color: #e46e8a; }

.date-fields {
  margin-top: 1rem;
}

.date-field {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: #00021f;
  font-size: 0.8rem;
  font-weight: 600;
}

.date-input {
  min-height: 2.5rem;
  min-width: 10rem;
  border: 1px solid #e5e7eb; /* gray-200 */
  border-radius: 0.5rem;
  background: #fff;
  padding: 0.4rem 0.6rem;
  color: #1f2937;
  color-scheme: light;
  font-size: 0.85rem;
}

.mode-button:focus-visible,
.clear-button:focus-visible,
.apply-button:focus-visible,
.date-input:focus-visible {
  outline: 2px solid #b0669f;
  outline-offset: 2px;
}

.apply-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.date-hint,
.date-error,
.timezone-error {
  flex-basis: 100%;
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
}

.date-hint { color: #6b7280; }
.date-error,
.timezone-error { color: #b91c1c; }
.timezone-error { margin: 0 0 0.75rem; }

.dark .date-hint { color: #9ca3af; }
.dark .date-field { color: #fff; }
.dark .clear-button { color: #9ca3af; }
.dark .clear-button:hover { color: #e46e8a; }

.dark .mode-button {
  background: #2a2b3d; /* rv-darkSurface */
  color: #fff;
}

.dark .mode-button:hover,
.dark .mode-button--active,
.dark .apply-button,
.dark .apply-button:hover:not(:disabled) {
  background: #e5e7eb;
  color: #00021f;
}

.dark .date-input {
  border-color: rgb(255 255 255 / 10%);
  background: #2a2b3d;
  color: #fff;
  color-scheme: dark;
}

.dark .mode-button:focus-visible,
.dark .clear-button:focus-visible,
.dark .apply-button:focus-visible,
.dark .date-input:focus-visible { outline-color: #e46e8a; }

.dark .date-error,
.dark .timezone-error { color: #fca5a5; }

@media (prefers-reduced-motion: reduce) {
  .mode-button,
  .clear-button,
  .apply-button { transition: none; }
  .mode-button:hover,
  .mode-button:active,
  .apply-button:hover:not(:disabled),
  .apply-button:active:not(:disabled) { transform: none; }
}
</style>
