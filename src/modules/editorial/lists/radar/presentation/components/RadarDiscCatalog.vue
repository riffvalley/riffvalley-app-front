<template>
  <div class="disc-catalog max-w-7xl mx-auto mt-5 md:mt-10">
    <!-- Filtros -->
    <div
      class="mb-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.42fr)]"
    >
      <input
        id="radar-catalog-search"
        v-model="searchQuery"
        type="search"
        aria-label="Buscar disco o artista"
        placeholder="Buscar álbum o artista..."
        class="min-h-11 min-w-0 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkCard dark:text-white"
      />
      <DiscListGenreSelect
        :model-value="selectedGenres"
        :options="genres"
        :loading="genresLoading"
        @update:model-value="selectedGenres = $event"
      />
    </div>

    <div
      v-if="catalogQuery.isError.value && !catalogQuery.data.value"
      role="alert"
      class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-200"
    >
      No se pudieron cargar los discos.
      <button
        class="ml-2 underline focus-visible:outline focus-visible:outline-2"
        @click="catalogQuery.refetch()"
      >
        Reintentar
      </button>
    </div>
    <div class="radar-catalog-results min-h-[50vh]">
      <div
        v-if="filteredDiscs.length === 0 && !loading && !catalogQuery.isError.value"
        class="text-center text-gray-500"
      >
        No discs found for the selected week.
      </div>
      <div v-else>
        <!-- Lista continua de discos, agrupada por fecha -->
        <details v-for="group in displayGroups" :key="group.key" class="radar-day-group mb-3">
          <!-- Encabezado del grupo -->
          <summary class="radar-day-toggle cursor-pointer list-none">
            <span class="flex min-w-0 items-center gap-2">
              <i class="fa-regular fa-calendar text-rv-purple" aria-hidden="true"></i>
              <span class="truncate">{{ group.heading }}</span>
              <span class="radar-day-count">{{ group.discs.length }}</span>
            </span>
            <i class="day-chevron fa-solid fa-chevron-down" aria-hidden="true"></i>
          </summary>

          <div class="mt-4">
            <ul>
              <li
                v-for="disc in group.discs"
                :key="disc.id"
                class="flex gap-2 p-4 transition-colors"
                :class="[
                  'disc-catalog-item flex-col lg:flex-row lg:items-start lg:justify-between gap-3 border',
                  disc.hasExistingAsignation && disc.pinned
                    ? 'bg-gradient-to-r from-blue-100 via-cyan-100 to-yellow-100 dark:from-blue-900/35 dark:via-cyan-900/30 dark:to-yellow-900/30 border-cyan-400/80 dark:border-cyan-500/70'
                    : disc.hasExistingAsignation
                      ? 'bg-blue-100 dark:bg-blue-900/35 border-blue-400/80 dark:border-blue-500/70'
                      : disc.pinned
                        ? 'bg-yellow-100 dark:bg-yellow-900/35 border-yellow-400/80 dark:border-yellow-500/70'
                        : 'border-gray-200 dark:border-white/10 bg-white dark:bg-rv-darkCard',
                ]"
              >
                <!-- Info del disco -->
                <div class="disc-catalog-copy min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap mb-1.5">
                    <p
                      class="px-2 py-1 rounded-full text-xs font-medium text-white text-center shadow-sm shrink-0"
                      :style="{ backgroundColor: disc.genre?.color || 'grey' }"
                    >
                      {{ disc.genre?.name || "Sin género" }}
                    </p>
                    <span
                      v-if="disc.ep"
                      class="px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500 shadow-sm shrink-0"
                    >
                      EP
                    </span>
                    <span
                      v-if="countryName(disc)"
                      class="disc-country-label text-gray-600 dark:text-gray-300"
                    >
                      <CircleFlags
                        v-if="countryCode(disc)"
                        :country="countryCode(disc)"
                        :show-flag-name="false"
                        class="h-5 w-5"
                        aria-hidden="true"
                      />
                      {{ countryName(disc) }}
                    </span>
                    <div
                      v-else-if="
                        disc.artist?.country?.isoCode?.length >= 2 ||
                        disc.artistCountry?.isoCode?.length >= 2
                      "
                      class="relative group shrink-0"
                    >
                      <CircleFlags
                        :country="countryCode(disc)"
                        :show-flag-name="false"
                        class="h-5 w-5 cursor-help"
                        aria-hidden="true"
                      />
                      <span
                        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[9px] font-semibold text-white bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity max-w-[160px] whitespace-normal text-center z-20"
                        >{{ countryName(disc) }}</span
                      >
                    </div>
                  </div>
                  <h4
                    class="text-base font-bold leading-snug text-gray-900 dark:text-white break-words"
                  >
                    <span class="text-gray-600 dark:text-gray-300">{{ disc.artist.name }}</span>
                    <span aria-hidden="true"> · </span>{{ disc.name }}
                  </h4>
                  <div class="mt-2 flex min-w-0 items-center justify-between gap-2">
                    <div
                      class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400"
                    >
                      <time v-if="disc.releaseDate" :datetime="disc.releaseDate">{{
                        formatDiscDate(disc.releaseDate)
                      }}</time>
                      <span
                        v-if="disc.hasExistingAsignation"
                        class="disc-assignment-state text-gray-800 dark:text-gray-100"
                      >
                        <i
                          class="fa-solid fa-user-check"
                          :class="
                            disc.pinned
                              ? 'text-cyan-700 dark:text-cyan-300'
                              : 'text-blue-700 dark:text-blue-300'
                          "
                          aria-hidden="true"
                        ></i>
                        {{
                          assignedUsername(disc)
                            ? `Asignado a ${assignedUsername(disc)}`
                            : "Ya asignado a esta lista"
                        }}
                      </span>
                      <span
                        v-if="disc.pinned"
                        class="font-semibold text-gray-800 dark:text-gray-100"
                        ><span
                          :class="
                            disc.hasExistingAsignation
                              ? 'text-cyan-700 dark:text-cyan-300'
                              : 'text-yellow-700 dark:text-yellow-300'
                          "
                          aria-hidden="true"
                          >★</span
                        >
                        Destacado</span
                      >
                    </div>
                    <div class="shrink-0 md:hidden">
                      <SpotifyArtistButton :artistName="disc.artist.name" />
                    </div>
                  </div>
                </div>

                <!-- Acciones -->
                <div
                  class="disc-catalog-actions grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:grid-cols-[2.75rem_minmax(0,1fr)] lg:grid-cols-[2.75rem_minmax(8rem,1fr)_auto_auto] lg:items-center lg:w-auto lg:min-w-[26rem]"
                >
                  <div class="hidden md:block">
                    <SpotifyArtistButton :artistName="disc.artist.name" />
                  </div>
                  <select
                    :id="`radar-user-${disc.id}`"
                    v-model="selectedUser[disc.id]"
                    :aria-label="`Asignar ${disc.name} a un usuario`"
                    class="min-h-11 w-full min-w-0 md:w-36 border rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-rv-darkSurface dark:text-white"
                  >
                    <option value="" disabled>Elegir usuario</option>
                    <option v-for="user in users" :key="user.id" :value="user.id">
                      {{ user.username }}
                    </option>
                  </select>
                  <button
                    v-if="disc.hasExistingAsignation"
                    @click="updateAsignation(disc.id)"
                    class="min-h-11 bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-semibold md:col-span-2 lg:col-span-1"
                  >
                    Actualizar
                  </button>
                  <button
                    v-else
                    @click="assignUser(disc.id)"
                    class="min-h-11 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold md:col-span-2 lg:col-span-1"
                  >
                    Asignar
                  </button>
                  <button
                    @click="togglePinned(disc)"
                    :class="[
                      'min-h-11 px-3 py-2 rounded-lg col-span-2 lg:col-span-1',
                      'text-xs font-semibold text-white transition-colors',
                      disc.pinned
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-gray-300 dark:bg-white/20 hover:bg-green-500',
                    ]"
                  >
                    {{ disc.pinned ? "★ Destacado" : "☆ Destacar" }}
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </details>
      </div>
    </div>
    <div ref="scrollObserver" class="h-1 text-center py-6">
      <span
        v-if="loading"
        role="status"
        aria-live="polite"
        class="text-gray-600 dark:text-gray-300"
      >
        Cargando discos...
      </span>
    </div>
    <div
      v-if="catalogQuery.isFetchNextPageError.value"
      role="alert"
      class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-200"
    >
      No se pudieron cargar más discos.
      <button class="ml-2 underline" @click="retryFetchDiscs">Reintentar</button>
    </div>
    <p
      v-if="catalogQuery.data.value && !hasMore"
      class="text-center text-xs text-gray-400 dark:text-gray-500"
    >
      Has llegado al final del catálogo.
    </p>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  reactive,
  onMounted,
  onBeforeUnmount,
  watch,
  computed,
  nextTick,
} from "vue";
import { type Disc } from "@services/discs/discs";
import type { RvUser } from "@/modules/identity/users";
import type { Genre } from "@services/genres/genres";
import type { RadarCatalogDisc } from "../../types/radarAssignment";
import SwalService from "@services/swal/SwalService";
import {
  useRadarAssignableUsersQuery,
  useRadarDiscCatalogQuery,
  useRadarGenresQuery,
} from "../../application/radarDetailQueries";
import { useRadarDetailMutations } from "../../application/useRadarDetailMutations";
import SpotifyArtistButton from "@components/SpotifyArtistButton.vue";
import DiscListGenreSelect from "@/modules/catalog/discs/presentation/components/DiscListGenreSelect.vue";
import { getEditorialWeekRange, groupDiscsByEditorialDay } from "../../utils/editorialWeek";

export default defineComponent({
  name: "RadarDiscCatalog",
  components: { SpotifyArtistButton, DiscListGenreSelect },
  props: {
    date: { type: String, required: true },
    listId: { type: String, required: true },
  },
  setup(props) {
    const usersQuery = useRadarAssignableUsersQuery();
    const genresQuery = useRadarGenresQuery();
    const users = computed<RvUser[]>(() => usersQuery.data.value ?? []);
    const genres = computed<Genre[]>(() => genresQuery.data.value ?? []);
    const genresLoading = computed(() => genresQuery.isPending.value);
    const searchQuery = ref("");
    const selectedGenres = ref<string[]>([]);
    const catalogQuery = useRadarDiscCatalogQuery(
      () => props.listId,
      () => props.date,
      () => searchQuery.value,
      () => [...selectedGenres.value].sort().join(",")
    );
    const mutations = useRadarDetailMutations(() => props.listId);
    const loading = computed(() => catalogQuery.isFetching.value);
    const hasMore = computed(() => catalogQuery.hasNextPage.value);
    const scrollObserver = ref<HTMLDivElement | null>(null);
    const selectedUser = reactive<Record<string, string>>({});
    let observer: IntersectionObserver | null = null;
    let intersectionArmed = true;
    let scrollFillRequested = false;
    let lastScrollTop = 0;

    const getDiscs = (): RadarCatalogDisc[] =>
      (catalogQuery.data.value?.pages ?? [])
        .flatMap((page) => page.data)
        .flatMap((item) => ("discs" in item ? item.discs : [item]))
        .map((disc) => ({
          ...disc,
          hasExistingAsignation: Boolean(
            disc.asignations?.some((asignation) => asignation.list?.id === props.listId)
          ),
        }));
    const discs = computed(() => [{ releaseDate: props.date, discs: getDiscs() }]);

    watch(
      catalogQuery.data,
      () => {
        for (const disc of getDiscs()) {
          const assignment = disc.asignations?.find((item) => item.list?.id === props.listId);
          selectedUser[disc.id] = assignment?.user?.id ?? "";
        }
      },
      { immediate: true }
    );

    const filteredDiscs = computed(() =>
      discs.value
        .map((group) => ({
          ...group,
          discs: group.discs.filter((disc) => {
            const query = searchQuery.value.toLowerCase();
            const matchesSearch =
              disc.name.toLowerCase().includes(query) ||
              disc.artist.name.toLowerCase().includes(query);
            const selectedGenreIds = selectedGenres.value.map((id) => id.toLowerCase());
            const matchesGenre =
              selectedGenreIds.length === 0 ||
              selectedGenreIds.includes(disc.genre?.id?.toLowerCase() ?? "");
            return matchesSearch && matchesGenre;
          }),
        }))
        .filter((group) => group.discs.length > 0)
    );

    const displayGroups = computed(() => {
      const week = getEditorialWeekRange(props.date);
      if (!week) return [];
      const weekDiscs = filteredDiscs.value.flatMap((group) => group.discs);
      return groupDiscsByEditorialDay(weekDiscs, week.days)
        .filter(({ discs: dayDiscs }) => dayDiscs.length > 0)
        .map(({ day, discs: dayDiscs }) => ({
          key: day.dateKey,
          heading: day.label,
          discs: dayDiscs,
        }));
    });

    watch([searchQuery, () => selectedGenres.value.join(",")], () => {
      intersectionArmed = true;
      scrollFillRequested = false;
    });

    const getScrollTop = () => window.scrollY || document.documentElement.scrollTop || 0;
    const getSentinelDocumentTop = () => {
      const top = scrollObserver.value?.getBoundingClientRect().top;
      return top === undefined ? undefined : top + getScrollTop();
    };

    const fetchDiscs = async () => {
      if (
        !intersectionArmed ||
        !catalogQuery.hasNextPage.value ||
        catalogQuery.isFetchingNextPage.value
      )
        return;
      intersectionArmed = false;
      const previousDocumentTop = getSentinelDocumentTop();
      try {
        await catalogQuery.fetchNextPage({ cancelRefetch: false });
        await nextTick();
        if (catalogQuery.isFetchNextPageError.value || !catalogQuery.hasNextPage.value) return;

        const nextDocumentTop = getSentinelDocumentTop();
        const sentinelTop = scrollObserver.value?.getBoundingClientRect().top;
        const layoutGrew =
          previousDocumentTop !== undefined &&
          nextDocumentTop !== undefined &&
          nextDocumentTop > previousDocumentTop + 1;
        const sentinelStillNear =
          sentinelTop !== undefined && sentinelTop <= window.innerHeight + 180;
        if (sentinelStillNear && (layoutGrew || scrollFillRequested)) {
          intersectionArmed = true;
          await fetchDiscs();
        }
      } catch {
        // TanStack Query conserva el error de la siguiente página para mostrar su reintento.
      }
    };
    const retryFetchDiscs = () => {
      intersectionArmed = true;
      scrollFillRequested = false;
      void fetchDiscs();
    };

    const observeScroll = (entries: IntersectionObserverEntry[]) => {
      if (!entries[0]?.isIntersecting) {
        intersectionArmed = true;
        return;
      }
      void fetchDiscs();
    };
    const onWindowScroll = () => {
      const scrollTop = getScrollTop();
      const isScrollingDown = scrollTop > lastScrollTop;
      lastScrollTop = scrollTop;
      if (!isScrollingDown) {
        scrollFillRequested = false;
        return;
      }

      const sentinelTop = scrollObserver.value?.getBoundingClientRect().top;
      if (sentinelTop === undefined || sentinelTop > window.innerHeight + 180) {
        intersectionArmed = true;
        scrollFillRequested = false;
        return;
      }
      scrollFillRequested = true;
      intersectionArmed = true;
      void fetchDiscs();
    };

    onMounted(async () => {
      await nextTick();
      if (typeof IntersectionObserver === "undefined") return;
      lastScrollTop = getScrollTop();
      observer = new IntersectionObserver(observeScroll, {
        rootMargin: "180px 0px",
        threshold: 0,
      });
      if (scrollObserver.value) observer.observe(scrollObserver.value);
      window.addEventListener("scroll", onWindowScroll, { passive: true });
      document.addEventListener("scroll", onWindowScroll, { passive: true, capture: true });
    });
    onBeforeUnmount(() => {
      observer?.disconnect();
      observer = null;
      window.removeEventListener("scroll", onWindowScroll);
      document.removeEventListener("scroll", onWindowScroll, true);
    });

    const assignUser = async (discId: string) => {
      const userId = selectedUser[discId];
      if (!userId) {
        SwalService.error("Please select a user before assigning.");
        return;
      }
      const disc = discs.value.flatMap((group) => group.discs).find((item) => item.id === discId);
      try {
        await mutations.assign({ userId, discId, listId: props.listId, genre: disc?.genre?.name });
        SwalService.success("Assignment created successfully.");
      } catch (error) {
        console.error("Error creating assignment:", error);
        SwalService.error("Failed to assign user. Please try again.");
      }
    };
    const updateAsignation = async (discId: string) => {
      const userId = selectedUser[discId];
      const disc = discs.value.flatMap((group) => group.discs).find((item) => item.id === discId);
      const assignment = disc?.asignations?.find((item) => item.list?.id === props.listId);
      if (!userId || !assignment?.id) {
        SwalService.error("Please select a user and ensure the assignment exists before updating.");
        return;
      }
      try {
        await mutations.updateAssignment({ id: assignment.id, payload: { userId } });
        SwalService.success("Assignment updated successfully.");
      } catch (error) {
        console.error("Error updating assignment:", error);
        SwalService.error("Failed to update assignment. Please try again.");
      }
    };
    const togglePinned = async (disc: RadarCatalogDisc) => {
      try {
        await mutations.toggleFeatured({ discId: disc.id, pinned: !disc.pinned });
      } catch {
        SwalService.error("No se pudo actualizar el estado destacado");
      }
    };
    const countryName = (disc: Disc) => {
      const country = disc.artist?.country || disc.artistCountry;
      return (
        country?.name ||
        (country?.isoCode?.length >= 2 ? country.isoCode.slice(0, 2).toUpperCase() : "")
      );
    };
    const countryCode = (disc: Disc) => {
      const code = (
        disc.artist?.country?.isoCode ||
        disc.artistCountry?.isoCode ||
        ""
      ).toLowerCase();
      return code.length >= 2 ? code.slice(0, 2) : "";
    };
    const assignedUsername = (disc: RadarCatalogDisc) =>
      disc.asignations?.find((assignment) => assignment.list?.id === props.listId)?.user
        ?.username || "";
    const formatDiscDate = (date: string) => {
      const parsed = new Date(date);
      return Number.isNaN(parsed.getTime())
        ? date
        : parsed.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          });
    };

    return {
      catalogQuery,
      loading,
      hasMore,
      fetchDiscs,
      scrollObserver,
      users,
      selectedUser,
      assignUser,
      updateAsignation,
      searchQuery,
      selectedGenres,
      genres,
      genresLoading,
      filteredDiscs,
      displayGroups,
      retryFetchDiscs,
      countryName,
      countryCode,
      assignedUsername,
      formatDiscDate,
      togglePinned,
    };
  },
});
</script>

<style scoped>
.radar-day-group {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 0.85rem;
  background: #fff;
}

.dark .radar-day-group {
  border-color: #ffffff1a;
  background: #404157;
}

.radar-day-toggle {
  display: flex;
  min-height: 3rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.8rem;
  background: #f9fafb;
  color: #1f2937;
  font-size: 0.875rem;
  font-weight: 700;
}

.radar-day-toggle::-webkit-details-marker {
  display: none;
}

.dark .radar-day-toggle {
  background: #10122f;
  color: #f3f4f6;
}

.radar-day-count {
  flex: none;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: #e5e7eb;
  color: #4b5563;
  font-size: 0.7rem;
}

.dark .radar-day-count {
  background: #ffffff1a;
  color: #e5e7eb;
}

.disc-catalog-item {
  border-radius: 0.9rem;
}

.disc-country-label,
.disc-assignment-state {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.disc-country-label {
  font-size: 0.7rem;
}

.disc-assignment-state {
  font-weight: 600;
}

.disc-catalog-actions select:focus-visible,
.disc-catalog-actions button:focus-visible {
  outline: 2px solid rgb(99 102 241);
  outline-offset: 2px;
}

details[open] > summary .day-chevron {
  transform: rotate(180deg);
}
</style>
