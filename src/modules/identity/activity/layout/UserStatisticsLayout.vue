<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const tabs = [
  { id: "general", label: "General", routeName: "UserStats" },
  { id: "users", label: "Usuarios", routeName: "UserStatsUsers" },
  { id: "inactivity", label: "Inactividad", routeName: "UserStatsInactivity" },
] as const;

const activeTab = computed(() => {
  if (route.name === "UserStatsUsers") return "users";
  if (route.name === "UserStatsInactivity") return "inactivity";
  return "general";
});

function handleTabKeydown(event: KeyboardEvent, currentIndex: number) {
  const lastIndex = tabs.length - 1;
  let targetIndex: number | null = null;

  if (event.key === "ArrowRight") targetIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
  if (event.key === "ArrowLeft") targetIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
  if (event.key === "Home") targetIndex = 0;
  if (event.key === "End") targetIndex = lastIndex;
  if (targetIndex === null) return;

  event.preventDefault();
  const targetTab = tabs[targetIndex];
  document.getElementById(`usage-tab-${targetTab.id}`)?.focus();
  void router.push({ name: targetTab.routeName, query: route.query, hash: route.hash });
}
</script>

<template>
  <div class="min-h-full bg-gray-50 px-4 py-5 text-rv-navy dark:bg-rv-darkBg dark:text-white sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <header class="mb-5 border-b border-gray-200 pb-4 dark:border-white/10">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Estadísticas de uso</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">Actividad general, actividad de usuarios e inactividad de voto nuevo.</p>
      </header>

      <nav aria-label="Secciones de estadísticas de uso" class="mb-5 overflow-x-auto">
        <div role="tablist" aria-label="Estadísticas de uso" class="flex min-w-max gap-2 border-b border-gray-200 dark:border-white/10">
          <RouterLink
            v-for="(tab, index) in tabs"
            :id="`usage-tab-${tab.id}`"
            :key="tab.id"
            :to="{ name: tab.routeName, query: route.query, hash: route.hash }"
            role="tab"
            :aria-selected="activeTab === tab.id"
            aria-controls="usage-tabpanel"
            :tabindex="activeTab === tab.id ? 0 : -1"
            class="rounded-t-lg border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
            :class="activeTab === tab.id
              ? 'border-rv-pink bg-white text-rv-navy dark:bg-rv-darkCard dark:text-white'
              : 'border-transparent text-gray-600 hover:bg-white/70 hover:text-rv-navy dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white'"
            @keydown="handleTabKeydown($event, index)"
          >
            {{ tab.label }}
          </RouterLink>
        </div>
      </nav>

      <section
        id="usage-tabpanel"
        role="tabpanel"
        tabindex="0"
        :aria-labelledby="`usage-tab-${activeTab}`"
        class="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
      >
        <RouterView />
      </section>
    </div>
  </div>
</template>
