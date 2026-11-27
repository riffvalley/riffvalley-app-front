<script setup lang="ts">
import type { EventImportInterventionReasonCount } from "../../application/eventImportInterventionSummary";

defineProps<{
  total: number;
  prepared: number;
  needsIntervention: number;
  conflicts: number;
  duplicates: number;
  invalid: number;
  alreadyInDraft: number;
  resolutionErrors: number;
  currentBatchSize: number;
  readyForLaterBatches: number;
  interventionReasons: EventImportInterventionReasonCount[];
}>();
</script>

<template>
  <section
    class="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-100"
    aria-labelledby="event-import-analysis-summary-title"
  >
    <h3 id="event-import-analysis-summary-title" class="font-semibold text-rv-navy dark:text-white">
      Resumen del análisis · {{ total }} eventos
    </h3>
    <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-7">
      <div>
        <dt class="text-xs text-gray-600 dark:text-gray-300">Preparados</dt>
        <dd class="font-semibold">{{ prepared }}</dd>
      </div>
      <div>
        <dt class="text-xs text-gray-600 dark:text-gray-300">Necesitan intervención</dt>
        <dd class="font-semibold">{{ needsIntervention }}</dd>
      </div>
      <div>
        <dt class="text-xs text-gray-600 dark:text-gray-300">Conflictos</dt>
        <dd class="font-semibold">{{ conflicts }}</dd>
      </div>
      <div>
        <dt class="text-xs text-gray-600 dark:text-gray-300">Duplicados del archivo</dt>
        <dd class="font-semibold">{{ duplicates }}</dd>
      </div>
      <div>
        <dt class="text-xs text-gray-600 dark:text-gray-300">Inválidos</dt>
        <dd class="font-semibold">{{ invalid }}</dd>
      </div>
      <div>
        <dt class="text-xs text-gray-600 dark:text-gray-300">Ya en el borrador</dt>
        <dd class="font-semibold">{{ alreadyInDraft }}</dd>
      </div>
      <div>
        <dt class="text-xs text-gray-600 dark:text-gray-300">Referencias con error</dt>
        <dd class="font-semibold">{{ resolutionErrors }}</dd>
      </div>
    </dl>
    <p class="mt-3 text-xs text-gray-600 dark:text-gray-300">
      Análisis local previo al envío. «Preparados» significa que superan la validación del editor;
      no confirma creación ni estado unchanged en el servidor.
    </p>
    <p class="mt-2 text-xs text-gray-600 dark:text-gray-300">
      Lote actual: {{ currentBatchSize }}.
      <template v-if="readyForLaterBatches">
        {{ readyForLaterBatches }} filas preparadas esperan lotes posteriores; no requieren
        corrección.
      </template>
    </p>
    <div class="mt-3 border-t border-gray-200 pt-2 dark:border-white/10">
      <h4 class="text-xs font-semibold text-rv-navy dark:text-white">
        Motivos de intervención · {{ needsIntervention }} filas únicas
      </h4>
      <ul v-if="interventionReasons.length" class="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <li
          v-for="reason in interventionReasons"
          :key="reason.id"
          class="flex justify-between gap-3 text-xs"
        >
          <span>{{ reason.label }}</span>
          <span class="shrink-0 font-semibold tabular-nums">{{ reason.rowCount }} filas</span>
        </li>
      </ul>
      <p v-else class="mt-1 text-xs text-gray-600 dark:text-gray-300">
        No hay motivos de intervención pendientes.
      </p>
      <p
        v-if="interventionReasons.length > 1"
        class="mt-1 text-xs text-gray-600 dark:text-gray-300"
      >
        Una fila puede aparecer en varios motivos; el total de intervención cuenta cada fila una
        vez.
      </p>
    </div>
  </section>
</template>
