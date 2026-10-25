<script setup lang="ts">
import { computed } from "vue";
import type {
  ActivityInactivityGroup,
  ActivityInactivityResponse,
} from "@/modules/identity/types/activityInactivity";

const props = defineProps<{ groups: ActivityInactivityResponse["groups"] }>();

const groupRows: { id: ActivityInactivityGroup; label: string; kind: "known" | "context" }[] = [
  { id: "0_2_days", label: "0–2 días · reciente", kind: "known" },
  { id: "3_6_days", label: "3–6 días · inicial", kind: "known" },
  { id: "7_13_days", label: "7–13 días · una semana", kind: "known" },
  { id: "14_29_days", label: "14–29 días · dos semanas", kind: "known" },
  { id: "30_59_days", label: "30–59 días · un mes", kind: "known" },
  { id: "60_plus_days", label: "60 días o más · prolongada", kind: "known" },
  { id: "never_voted", label: "Nunca ha votado", kind: "context" },
  { id: "insufficient_history", label: "Historial insuficiente", kind: "context" },
];

const maxCount = computed(() => Math.max(0, ...groupRows.map(({ id }) => props.groups[id])));
const rows = computed(() => groupRows.map((group) => ({
  ...group,
  count: props.groups[group.id],
  width: maxCount.value === 0 ? 0 : (props.groups[group.id] / maxCount.value) * 100,
})));
</script>

<template>
  <section class="distribution" aria-labelledby="inactivity-distribution-heading">
    <div class="distribution-heading">
      <div>
        <h2 id="inactivity-distribution-heading">Distribución de usuarios</h2>
        <p>Los grupos sin fecha conocida aparecen separados de los tramos numéricos.</p>
      </div>
      <span class="distribution-total">{{ groups["0_2_days"] + groups["3_6_days"] + groups["7_13_days"] + groups["14_29_days"] + groups["30_59_days"] + groups["60_plus_days"] }} con voto conocido</span>
    </div>

    <div class="distribution-list">
      <div v-for="row in rows" :key="row.id" class="distribution-row" :class="{ 'distribution-row--context': row.kind === 'context' }">
        <div class="distribution-label">
          <span>{{ row.label }}</span>
          <strong>{{ row.count.toLocaleString("es-ES") }}</strong>
        </div>
        <div class="distribution-track" aria-hidden="true">
          <span class="distribution-fill" :style="{ width: `${row.width}%` }" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.distribution {
  border: 1px solid rgb(148 163 184 / 24%);
  border-radius: 0.9rem;
  background: white;
  padding: 1.15rem 1.25rem 1.25rem;
}

.distribution-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 0.6rem 1rem;
  margin-bottom: 1rem;
}

.distribution-heading h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.distribution-heading p,
.distribution-total {
  margin: 0.25rem 0 0;
  color: #596579;
  font-size: 0.75rem;
}

.distribution-total {
  margin: 0;
  font-weight: 600;
}

.distribution-list {
  display: grid;
  gap: 0.72rem;
}

.distribution-row--context {
  padding-top: 0.55rem;
  border-top: 1px solid rgb(148 163 184 / 18%);
}

.distribution-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.32rem;
  color: #263247;
  font-size: 0.82rem;
}

.distribution-label strong {
  font-variant-numeric: tabular-nums;
}

.distribution-track {
  height: 0.42rem;
  overflow: hidden;
  border-radius: 999px;
  background: #edf0f5;
}

.distribution-fill {
  display: block;
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  background: #b0669f;
  transition: width 180ms ease-out;
}

.distribution-row--context .distribution-fill {
  background: #68758a;
}

:global(.dark) .distribution {
  border-color: rgb(255 255 255 / 10%);
  background: #171923;
}

:global(.dark) .distribution-heading p,
:global(.dark) .distribution-total {
  color: #c2c7d2;
}

:global(.dark) .distribution-label {
  color: #f4f5f8;
}

:global(.dark) .distribution-track {
  background: #30333e;
}

@media (prefers-reduced-motion: reduce) {
  .distribution-fill {
    transition: none;
  }
}
</style>
