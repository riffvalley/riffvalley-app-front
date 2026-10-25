<script setup lang="ts">
export type PeriodSelection = 7 | 30 | 90 | "custom";

const period = defineModel<PeriodSelection>({ required: true });
const from = defineModel<string>("from", { required: true });
const to = defineModel<string>("to", { required: true });

defineProps<{ rangeReversed: boolean }>();

const presets = [
  { label: "7 días", value: 7 },
  { label: "30 días", value: 30 },
  { label: "90 días", value: 90 },
] as const;
</script>

<template>
  <div class="period-filters">
    <fieldset>
      <legend class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Período</legend>
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Seleccionar período">
        <button
          v-for="preset in presets"
          :key="preset.value"
          class="period-button"
          :class="{ 'period-button--active': period === preset.value }"
          type="button"
          :aria-pressed="period === preset.value"
          @click="period = preset.value"
        >
          {{ preset.label }}
        </button>
        <button
          class="period-button"
          :class="{ 'period-button--active': period === 'custom' }"
          type="button"
          :aria-pressed="period === 'custom'"
          @click="period = 'custom'"
        >
          Personalizado
        </button>
      </div>
    </fieldset>

    <div v-if="period === 'custom'" class="date-range">
      <label class="date-field">
        <span>Desde</span>
        <input v-model="from" type="date" aria-label="Fecha desde" />
      </label>
      <label class="date-field">
        <span>Hasta</span>
        <input v-model="to" type="date" aria-label="Fecha hasta" />
      </label>
      <p v-if="rangeReversed" class="date-error" role="alert">La fecha inicial debe ser anterior o igual a la final.</p>
    </div>
  </div>
</template>

<style scoped>
.period-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 1rem 1.5rem;
}

.period-button {
  min-height: 2.25rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid rgb(148 163 184 / 40%);
  border-radius: 0.5rem;
  background: white;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 600;
  transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
}

.period-button:hover {
  border-color: #b0669f;
  color: #7d3d70;
}

.period-button:focus-visible,
.date-field input:focus-visible {
  outline: 2px solid #b0669f;
  outline-offset: 2px;
}

.period-button--active {
  border-color: #b0669f;
  background: rgb(176 102 159 / 12%);
  color: #7d3d70;
}

.date-range {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.6rem;
}

.date-field {
  display: grid;
  gap: 0.3rem;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 600;
}

.date-field input {
  min-height: 2.25rem;
  width: 9.5rem;
  border: 1px solid rgb(148 163 184 / 45%);
  border-radius: 0.5rem;
  background: white;
  padding: 0.35rem 0.5rem;
  color: #1e293b;
  color-scheme: light;
  font-size: 0.8rem;
}

.date-error {
  flex-basis: 100%;
  margin: 0;
  color: #b91c1c;
  font-size: 0.75rem;
}

:global(.dark) .period-button,
:global(.dark) .date-field input {
  border-color: rgb(255 255 255 / 18%);
  background: #2a2b3d;
  color: #f1f5f9;
  color-scheme: dark;
}

:global(.dark) .period-button--active {
  border-color: #e46e8a;
  background: rgb(228 110 138 / 16%);
  color: #f9a6b8;
}

:global(.dark) .period-button:hover {
  border-color: #e46e8a;
  color: #f9a6b8;
}

:global(.dark) .date-field { color: #cbd5e1; }
:global(.dark) .date-error { color: #fca5a5; }

@media (prefers-reduced-motion: reduce) {
  .period-button { transition: none; }
}
</style>
