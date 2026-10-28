<template>
  <div class="max-w-[100rem] mx-auto mt-10 px-4 pb-16">

    <DashboardWelcomeBanner
      :username="username"
      :today-formatted="todayFormatted"
      :has-session="hasSession"
      :summary="summary"
      :loading="summaryLoading"
      :error="summaryError"
      @retry="dashboardSummaryQuery.refetch()"
    />

    <!-- Módulos dinámicos del dashboard -->
    <DashboardWidgetGrid :modules="dashboardModules">

      <template #novedades>
        <NewsFeed />
      </template>

      <!-- Comunidad + Top usuarios -->
      <template #comunidad>
        <DashboardCommunityWidget />
      </template>

      <!-- Top 3 Semana -->
      <template #top3semana>
        <DashboardTop3Widget period="week" />
      </template>

      <!-- Top 3 Mes -->
      <template #top3mes>
        <DashboardTop3Widget period="month" />
      </template>

      <!-- Disco Aleatorio -->
      <template #discoAleatorio>
        <RandomDiscWidget />
      </template>

      <!-- Portada del día -->
      <template #portadaDia>
        <DashboardCoverOfDayWidget />
      </template>

      <!-- Tus artistas favoritos -->
      <template #artistas>
        <DashboardFavoriteArtistsWidget />
      </template>

      <!-- Cementerio de discos -->
      <template #cementerio>
        <DashboardCemeteryWidget />
      </template>

      <!-- Tu mundo musical -->
      <template #mundoMusical>
        <DashboardMusicalWorldWidget />
      </template>

      <!-- Últimos 5 votos -->
      <template #ultimosVotos>
        <DashboardLatestVotesWidget />
      </template>

      <!-- Crea tu propia aventura -->
      <template #aventura>
      <div class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col flex-1">
        <div class="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-rv-purple/8 to-rv-pink/8 dark:from-rv-purple/10 dark:to-rv-pink/10 border-b border-gray-100 dark:border-white/10 shrink-0">
          <i class="fa-solid fa-book-open text-rv-purple"></i>
          <h3 class="font-bold text-gray-900 dark:text-white">Crea tu propia aventura</h3>
        </div>
        <AdventureModule />
      </div>
      </template>

    </DashboardWidgetGrid>

  </div>

  <!-- Scroll to top — solo móvil -->
  <Transition name="scroll-top-btn">
    <button
      v-show="showScrollTop"
      type="button"
      @click="scrollToTop"
      class="md:hidden fixed bottom-6 right-4 z-40
             w-10 h-10 rounded-full shadow-lg
             bg-rv-pink text-white
             flex items-center justify-center
             hover:bg-rv-purple active:scale-95
             transition-colors duration-200"
      aria-label="Volver arriba"
    >
      <i class="fa-solid fa-chevron-up text-sm"></i>
    </button>
  </Transition>

</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import { useDashboardConfig } from "@/composables/useDashboardConfig";
import { useIsMobileViewport } from "@/composables/useIsMobileViewport";
import NewsFeed from "@views/homePage/components/NewsFeed.vue";
import AdventureModule from "@/modules/dashboard/widgets/adventure/components/AdventureModule.vue";
import DashboardWelcomeBanner from "@/modules/dashboard/components/DashboardWelcomeBanner.vue";
import DashboardWidgetGrid from "@/modules/dashboard/components/DashboardWidgetGrid.vue";
import RandomDiscWidget from "@/modules/dashboard/widgets/random-disc/components/RandomDiscWidget.vue";
import DashboardCoverOfDayWidget from "@/modules/dashboard/widgets/cover-of-day/components/DashboardCoverOfDayWidget.vue";
import DashboardCommunityWidget from "@/modules/dashboard/widgets/community/components/DashboardCommunityWidget.vue";
import DashboardCemeteryWidget from "@/modules/dashboard/widgets/cemetery/components/DashboardCemeteryWidget.vue";
import DashboardTop3Widget from "@/modules/dashboard/widgets/top-rated/components/DashboardTop3Widget.vue";
import DashboardLatestVotesWidget from "@/modules/dashboard/widgets/latest-votes/components/DashboardLatestVotesWidget.vue";
import DashboardMusicalWorldWidget from "@/modules/dashboard/widgets/musical-world/components/DashboardMusicalWorldWidget.vue";
import DashboardFavoriteArtistsWidget from "@/modules/dashboard/widgets/artists/components/DashboardFavoriteArtistsWidget.vue";
import { useDashboardSummaryQuery } from "@/app/dashboardSummary";

export default defineComponent({
  name: "DashboardPage",
  components: { NewsFeed, AdventureModule, DashboardWelcomeBanner, DashboardWidgetGrid, RandomDiscWidget, DashboardCoverOfDayWidget, DashboardCommunityWidget, DashboardCemeteryWidget, DashboardTop3Widget, DashboardLatestVotesWidget, DashboardMusicalWorldWidget, DashboardFavoriteArtistsWidget },
  setup() {
    const desktopDashboardConfig = useDashboardConfig('desktop');
    const mobileDashboardConfig = useDashboardConfig('mobile');
    const isMobileViewport = useIsMobileViewport();

    // El dashboard en el móvil tiene su propia configuración (mobileDashboardConfig):
    // se usa solo cuando el viewport es realmente móvil, en escritorio siempre manda dashboardConfig.
    const dashboardModules = computed(() =>
      isMobileViewport.value ? mobileDashboardConfig.modules.value : desktopDashboardConfig.modules.value,
    );

    const authStore = useAuthStore();
    const dashboardSummaryQuery = useDashboardSummaryQuery();
    const summary = computed(() => dashboardSummaryQuery.data.value);
    const summaryLoading = computed(() => dashboardSummaryQuery.isLoading.value);
    const summaryError = computed(() => dashboardSummaryQuery.isError.value);
    const hasSession = computed(() => authStore.isAuthenticated);

    // ── Computed ──────────────────────────────────────────
    const username = computed(() => authStore.username ?? "");

    const todayFormatted = computed(() =>
      new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    );

    // ── Scroll to top (solo móvil) ────────────────────────────
    const showScrollTop = ref(false);
    const onScroll = () => { showScrollTop.value = window.scrollY > 300; };
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    onMounted(async () => {
      window.addEventListener('scroll', onScroll, { passive: true });
    });

    onUnmounted(() => {
      window.removeEventListener('scroll', onScroll);
    });

    return {
      dashboardModules,
      username, todayFormatted,
      summary, summaryLoading, summaryError, hasSession,
      showScrollTop, scrollToTop,
      dashboardSummaryQuery,
    };
  },
});
</script>

<style scoped>
/* Scroll to top */
.scroll-top-btn-enter-active,
.scroll-top-btn-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.scroll-top-btn-enter-from,
.scroll-top-btn-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
