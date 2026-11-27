<script setup lang="ts">
import { shallowRef } from "vue";
import { RouterLink } from "vue-router";
import ConcertsListingPanel from "../components/ConcertsListingPanel.vue";
import FestivalsListingPanel from "../components/FestivalsListingPanel.vue";

type EventsTab = "concerts" | "festivals";
const activeTab = shallowRef<EventsTab>("concerts");

function handleTabKeydown(event: KeyboardEvent): void {
  const tabs = Array.from(
    (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]')
  );
  const index = tabs.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  let nextIndex: number | undefined;
  if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
  if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  if (nextIndex === undefined) return;
  event.preventDefault();
  const nextTab = tabs[nextIndex];
  if (!nextTab) return;
  activeTab.value = nextTab.dataset.tab as EventsTab;
  nextTab.focus();
}
</script>

<template>
  <main class="flex min-h-[calc(100dvh-3rem)] flex-col gap-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold leading-tight text-rv-navy dark:text-white md:text-3xl">
          Conciertos y festivales
        </h1>
        <p class="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Consulta los eventos registrados y filtra por fechas.
        </p>
      </div>
      <RouterLink
        to="/concerts-festivals/import"
        class="inline-flex min-h-10 items-center rounded-lg bg-rv-navy px-4 text-sm font-semibold text-white hover:bg-rv-blueDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-white"
      >
        Importar eventos
      </RouterLink>
    </header>

    <section class="flex flex-col gap-4" aria-label="Conciertos y festivales">
      <div
        class="flex gap-2 border-b border-gray-200 dark:border-white/10"
        role="tablist"
        tabindex="-1"
        aria-label="Tipo de evento"
        @keydown="handleTabKeydown"
      >
        <button
          id="events-tab-concerts"
          type="button"
          role="tab"
          data-tab="concerts"
          aria-controls="events-panel-concerts"
          :aria-selected="activeTab === 'concerts'"
          :tabindex="activeTab === 'concerts' ? 0 : -1"
          class="min-h-11 border-b-2 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          :class="
            activeTab === 'concerts'
              ? 'border-rv-purple text-rv-navy dark:text-white'
              : 'border-transparent text-gray-600 hover:text-rv-navy dark:text-gray-300 dark:hover:text-white'
          "
          @click="activeTab = 'concerts'"
        >
          Conciertos
        </button>
        <button
          id="events-tab-festivals"
          type="button"
          role="tab"
          data-tab="festivals"
          aria-controls="events-panel-festivals"
          :aria-selected="activeTab === 'festivals'"
          :tabindex="activeTab === 'festivals' ? 0 : -1"
          class="min-h-11 border-b-2 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          :class="
            activeTab === 'festivals'
              ? 'border-rv-purple text-rv-navy dark:text-white'
              : 'border-transparent text-gray-600 hover:text-rv-navy dark:text-gray-300 dark:hover:text-white'
          "
          @click="activeTab = 'festivals'"
        >
          Festivales
        </button>
      </div>

      <div
        id="events-panel-concerts"
        role="tabpanel"
        aria-labelledby="events-tab-concerts"
        tabindex="0"
        :hidden="activeTab !== 'concerts'"
        class="min-h-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
      >
        <ConcertsListingPanel :active="activeTab === 'concerts'" />
      </div>
      <div
        id="events-panel-festivals"
        role="tabpanel"
        aria-labelledby="events-tab-festivals"
        tabindex="0"
        :hidden="activeTab !== 'festivals'"
        class="min-h-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
      >
        <FestivalsListingPanel :active="activeTab === 'festivals'" />
      </div>
    </section>
  </main>
</template>
