<script setup lang="ts">
import type { ScrapedEventJsonDocument } from "../../application/scrapedEventJson";
import { computed } from "vue";

const props = defineProps<{
  fileName: string;
  sizeBytes: number;
  document: ScrapedEventJsonDocument | null;
  validationError: string;
  selectedCountry: string;
}>();

const typeCounts = computed(() => ({
  concerts: props.document?.events.filter(({ type }) => type === "concert").length ?? 0,
  festivals: props.document?.events.filter(({ type }) => type === "festival").length ?? 0,
  tours: props.document?.events.filter(({ type }) => type === "tour").length ?? 0,
  eventsWithIssues:
    props.document?.events.filter(({ issues }) =>
      issues.some((issue) => !issue.startsWith("Duplicado del evento"))
    ).length ?? 0,
  duplicates: props.document?.duplicateIndexes.length ?? 0,
}));

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toLocaleString("es-ES", { maximumFractionDigits: 1 })} KB`
    : `${(bytes / (1024 * 1024)).toLocaleString("es-ES", { maximumFractionDigits: 2 })} MB`;
}
</script>

<template>
  <section
    v-if="fileName"
    class="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-white/10 dark:bg-rv-darkSurface"
    aria-label="Resumen del archivo JSON"
  >
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <p
        class="min-w-0 flex-1 truncate font-semibold text-gray-900 dark:text-white"
        :title="fileName"
      >
        {{ fileName }}
      </p>
      <span class="shrink-0 text-xs text-gray-600 dark:text-gray-300">{{
        formatSize(sizeBytes)
      }}</span>
      <span
        class="rounded-full px-2 py-0.5 text-xs font-semibold"
        :class="
          document
            ? 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100'
            : 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100'
        "
        role="status"
      >
        {{ document ? "JSON válido" : "JSON no válido" }}
      </span>
    </div>
    <p
      v-if="document"
      class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700 dark:text-gray-200"
    >
      <span
        ><strong>{{ document.events.length }}</strong> eventos</span
      >
      <span
        ><strong>{{ typeCounts.concerts }}</strong> conciertos</span
      >
      <span
        ><strong>{{ typeCounts.festivals }}</strong> festivales</span
      >
      <span
        >País del archivo: <strong>{{ document.country }}</strong></span
      >
      <span v-if="selectedCountry"
        >País seleccionado: <strong>{{ selectedCountry }}</strong></span
      >
      <span v-if="typeCounts.tours"
        ><strong>{{ typeCounts.tours }}</strong> giras</span
      >
    </p>
    <p v-if="validationError" class="mt-2 text-xs text-red-700 dark:text-red-300" role="alert">
      {{ validationError }}
    </p>
    <details v-if="typeCounts.eventsWithIssues" class="mt-2">
      <summary
        class="cursor-pointer font-medium text-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:text-amber-200"
      >
        {{ typeCounts.eventsWithIssues }} eventos con incidencias de datos
      </summary>
      <p class="mt-1 text-xs text-gray-700 dark:text-gray-200">
        Son incidencias estructurales o de contenido del archivo. Las referencias de artistas,
        localidades, recintos y giras se muestran por separado durante el análisis.
      </p>
    </details>
    <p v-if="typeCounts.duplicates" class="mt-2 text-xs text-amber-900 dark:text-amber-200">
      {{ typeCounts.duplicates }} duplicados dentro del archivo; se contabilizan aparte de los
      problemas de datos.
    </p>
  </section>
</template>
