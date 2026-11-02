<script setup lang="ts">
import { shallowRef } from "vue";
import VenuesCatalogPanel from "../components/VenuesCatalogPanel.vue";
import VenuesImportPanel from "../components/VenuesImportPanel.vue";

type VenuesTab = "catalog" | "import";

const activeTab = shallowRef<VenuesTab>("catalog");

function handleTabKeydown(event: KeyboardEvent): void {
  const tabButtons = Array.from(
    (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]')
  );
  const currentIndex = tabButtons.indexOf(event.target as HTMLButtonElement);
  if (currentIndex < 0) return;

  let nextIndex: number | undefined;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabButtons.length;
  if (event.key === "ArrowLeft")
    nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabButtons.length - 1;
  if (nextIndex === undefined) return;

  event.preventDefault();
  const nextTab = tabButtons[nextIndex];
  if (!nextTab) return;
  activeTab.value = nextTab.dataset.tab as VenuesTab;
  nextTab.focus();
}
</script>

<template>
  <div class="flex min-h-[calc(100dvh-3rem)] flex-col gap-6">
    <header>
      <div class="flex items-start gap-3">
        <span
          class="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rv-purple/10 text-rv-purple dark:bg-rv-purple/20 dark:text-purple-200"
          aria-hidden="true"
        >
          <i class="fa-solid fa-location-dot"></i>
        </span>
        <div>
          <h1 class="text-2xl font-bold leading-tight text-rv-navy dark:text-white md:text-3xl">
            Salas y recintos
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Consulta el catálogo de salas o prepara la incorporación de nuevos recintos.
          </p>
        </div>
      </div>
    </header>

    <section class="flex flex-col gap-4" aria-label="Gestión de salas y recintos">
      <div
        class="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/10"
        role="tablist"
        tabindex="-1"
        aria-label="Apartados de Salas y recintos"
        @keydown="handleTabKeydown"
      >
        <button
          id="venues-tab-catalog"
          type="button"
          role="tab"
          data-tab="catalog"
          aria-controls="venues-panel-catalog"
          :aria-selected="activeTab === 'catalog'"
          :tabindex="activeTab === 'catalog' ? 0 : -1"
          class="min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          :class="
            activeTab === 'catalog'
              ? 'border-rv-purple text-rv-navy dark:text-white'
              : 'border-transparent text-gray-600 hover:text-rv-navy dark:text-gray-300 dark:hover:text-white'
          "
          @click="activeTab = 'catalog'"
        >
          Catálogo
        </button>
        <button
          id="venues-tab-import"
          type="button"
          role="tab"
          data-tab="import"
          aria-controls="venues-panel-import"
          :aria-selected="activeTab === 'import'"
          :tabindex="activeTab === 'import' ? 0 : -1"
          class="min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          :class="
            activeTab === 'import'
              ? 'border-rv-purple text-rv-navy dark:text-white'
              : 'border-transparent text-gray-600 hover:text-rv-navy dark:text-gray-300 dark:hover:text-white'
          "
          @click="activeTab = 'import'"
        >
          Importar salas
        </button>
      </div>

      <div
        v-if="activeTab === 'catalog'"
        id="venues-panel-catalog"
        role="tabpanel"
        aria-labelledby="venues-tab-catalog"
        tabindex="0"
        class="min-h-0 flex-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
      >
        <VenuesCatalogPanel />
      </div>
      <div
        v-else
        id="venues-panel-import"
        role="tabpanel"
        aria-labelledby="venues-tab-import"
        tabindex="0"
        class="min-h-0 flex-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
      >
        <VenuesImportPanel />
      </div>
    </section>
  </div>
</template>
