<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import {
  useBestAssignmentsQuery,
  useBestAssignableUsersQuery,
  useBestDiscCatalogQuery,
  useBestGenresQuery,
  flattenBestCatalogPages,
} from "../../application/bestDetailQueries";
import { useBestDetailMutations } from "../../application/useBestDetailMutations";
import type { Disc } from "@services/discs/discs";
import SwalService from "@services/swal/SwalService";
import SpotifyArtistButton from "@components/SpotifyArtistButton.vue";
import DiscListGenreSelect from "@/modules/catalog/discs/presentation/components/DiscListGenreSelect.vue";

const props = withDefaults(defineProps<{ listId: string; date: string; active?: boolean }>(), {
  active: true,
});
type CatalogDisc = Disc & { hasExistingAsignation?: boolean };
const searchQuery = ref("");
const selectedGenres = ref<string[]>([]);
const sentinel = ref<HTMLDivElement | null>(null);
const openGroups = reactive<Record<string, boolean>>({});
const selectedUsers = reactive<Record<string, string>>({});
let observer: IntersectionObserver | null = null;
let intersectionArmed = true;
let lastScrollTop = 0;
let scrollFillRequested = false;

const assignmentsQuery = useBestAssignmentsQuery(() => props.listId);
const usersQuery = useBestAssignableUsersQuery();
const genresQuery = useBestGenresQuery();
const catalogQuery = useBestDiscCatalogQuery(
  () => props.listId,
  () => props.date,
  () => props.active
);
const mutations = useBestDetailMutations(() => props.listId);
const users = computed(() =>
  [...(usersQuery.data.value ?? [])].sort((a, b) => a.username.localeCompare(b.username))
);
const genres = computed(() => genresQuery.data.value ?? []);
const assignments = computed(() => assignmentsQuery.data.value ?? []);
const catalog = computed(() =>
  flattenBestCatalogPages(catalogQuery.data.value?.pages).map((group) => ({
    ...group,
    stateKey: `${props.listId}:${props.date}:${group.key}`,
    discs: group.discs.map(
      (disc) =>
        ({
          ...disc,
          hasExistingAsignation: assignments.value.some((item) => item.disc?.id === disc.id),
        }) as CatalogDisc
    ),
  }))
);
const visibleGroups = computed(() =>
  catalog.value
    .map((group) => ({
      ...group,
      discs: group.discs.filter((disc) => {
        const search = searchQuery.value.trim().toLocaleLowerCase();
        const matchesSearch =
          !search ||
          disc.name.toLocaleLowerCase().includes(search) ||
          disc.artist.name.toLocaleLowerCase().includes(search);
        const selectedGenreIds = selectedGenres.value.map((id) => id.toLowerCase());
        const matchesGenre =
          selectedGenreIds.length === 0 ||
          selectedGenreIds.includes(disc.genre?.id?.toLowerCase() ?? "");
        return matchesSearch && matchesGenre;
      }),
    }))
    .filter((group) => group.discs.length > 0)
);
const isLoading = computed(() => catalogQuery.isPending.value);
const isFetchingNext = computed(() => catalogQuery.isFetchingNextPage.value);

watch(
  () => [props.listId, props.date] as const,
  () => {
    searchQuery.value = "";
    selectedGenres.value = [];
    intersectionArmed = true;
  }
);

function formatGroupDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
}

function selectedUserFor(disc: CatalogDisc) {
  if (selectedUsers[disc.id] !== undefined) return selectedUsers[disc.id];
  return assignments.value.find((item) => item.disc?.id === disc.id)?.user?.id ?? "";
}

async function saveAssignment(disc: CatalogDisc) {
  const userId = selectedUserFor(disc);
  if (!userId) {
    SwalService.error("Selecciona un usuario antes de asignar.");
    return;
  }
  const existing = assignments.value.find((item) => item.disc?.id === disc.id);
  try {
    if (existing) {
      await mutations.updateAssignment({ id: existing.id, payload: { userId } });
      SwalService.success("Usuario actualizado");
    } else {
      await mutations.assign({
        userId,
        discId: disc.id,
        listId: props.listId,
        genre: disc.genre?.name,
      });
      SwalService.success("Disco asignado");
    }
  } catch {
    SwalService.error(
      existing ? "No se pudo actualizar la asignación" : "No se pudo asignar el disco"
    );
  }
}

async function toggleFeatured(disc: CatalogDisc) {
  try {
    await mutations.toggleFeatured({ discId: disc.id, pinned: !disc.pinned });
  } catch {
    SwalService.error("No se pudo actualizar el estado destacado");
  }
}

function observe(entries: IntersectionObserverEntry[]) {
  const entry = entries[0];
  if (!entry) return;
  if (!entry.isIntersecting) {
    intersectionArmed = true;
    return;
  }
  loadNextPage();
}

function getSentinelDocumentTop() {
  const top = sentinel.value?.getBoundingClientRect().top;
  return top === undefined ? undefined : top + getScrollTop();
}

async function loadNextPage() {
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
    if (!props.active || catalogQuery.isFetchNextPageError.value || !catalogQuery.hasNextPage.value)
      return;

    const nextDocumentTop = getSentinelDocumentTop();
    const sentinelTop = sentinel.value?.getBoundingClientRect().top;
    const layoutGrew =
      previousDocumentTop !== undefined &&
      nextDocumentTop !== undefined &&
      nextDocumentTop > previousDocumentTop + 1;
    const sentinelStillNear = sentinelTop !== undefined && sentinelTop <= window.innerHeight + 180;
    if (sentinelStillNear && (layoutGrew || scrollFillRequested)) {
      intersectionArmed = true;
      await loadNextPage();
    }
  } catch {
    // TanStack Query conserva el error y ofrece reintento desde el control visible.
  }
}

function getScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function onWindowScroll() {
  const scrollTop = getScrollTop();
  const isScrollingDown = scrollTop > lastScrollTop;
  lastScrollTop = scrollTop;
  if (!isScrollingDown) {
    scrollFillRequested = false;
    return;
  }

  const sentinelTop = sentinel.value?.getBoundingClientRect().top;
  if (sentinelTop === undefined || sentinelTop > window.innerHeight + 180) {
    intersectionArmed = true;
    scrollFillRequested = false;
    return;
  }
  scrollFillRequested = true;
  intersectionArmed = true;
  void loadNextPage();
}

function stopObserving() {
  observer?.disconnect();
  observer = null;
  window.removeEventListener("scroll", onWindowScroll);
  document.removeEventListener("scroll", onWindowScroll, true);
  intersectionArmed = true;
  scrollFillRequested = false;
}

function startObserving() {
  stopObserving();
  if (!props.active) return;
  lastScrollTop = getScrollTop();
  if (typeof IntersectionObserver !== "undefined" && sentinel.value) {
    observer = new IntersectionObserver(observe, {
      root: null,
      rootMargin: "180px 0px",
      threshold: 0,
    });
    observer.observe(sentinel.value);
  }
  window.addEventListener("scroll", onWindowScroll, { passive: true });
  document.addEventListener("scroll", onWindowScroll, { passive: true, capture: true });
}

watch(
  () => props.active,
  (active) => {
    if (active) void nextTick(startObserving);
    else stopObserving();
  },
  { flush: "post" }
);

onMounted(() => {
  if (props.active) startObserving();
});

onBeforeUnmount(() => {
  stopObserving();
});
</script>

<template>
  <section aria-label="Catálogo de discos del mes" class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row">
      <span class="sr-only">Buscar disco o artista</span>
      <input
        id="best-catalog-search"
        aria-label="Buscar disco o artista"
        v-model="searchQuery"
        type="search"
        placeholder="Buscar disco o artista…"
        class="best-filter-input min-w-0 flex-1"
      />
      <DiscListGenreSelect
        :model-value="selectedGenres"
        :options="genres"
        :loading="genresQuery.isPending.value"
        class="w-full sm:w-64"
        @update:model-value="selectedGenres = $event"
      />
    </div>

    <div v-if="isLoading" role="status" class="best-catalog-state">Cargando catálogo…</div>
    <div
      v-else-if="catalogQuery.isError.value && !catalog.length"
      role="alert"
      class="best-catalog-error"
    >
      No se pudo cargar el catálogo.
      <button type="button" @click="catalogQuery.refetch()">Reintentar</button>
    </div>
    <div v-else-if="!visibleGroups.length" class="best-catalog-state">
      {{
        catalog.length
          ? "No hay discos que coincidan con estos filtros entre los resultados cargados."
          : "No hay discos para este periodo."
      }}
    </div>
    <div v-else class="space-y-3">
      <section v-for="group in visibleGroups" :key="group.stateKey" class="best-catalog-group">
        <h3 class="m-0">
          <button
            type="button"
            class="best-group-toggle"
            :aria-expanded="Boolean(openGroups[group.stateKey])"
            :aria-controls="`best-group-${group.stateKey}`"
            @click="openGroups[group.stateKey] = !openGroups[group.stateKey]"
          >
            <span class="flex min-w-0 items-center gap-2"
              ><i class="fa-regular fa-calendar" aria-hidden="true"></i
              ><span class="truncate">{{ formatGroupDate(group.releaseDate) }}</span
              ><span class="best-group-count">{{ group.discs.length }}</span></span
            >
            <i
              :class="
                openGroups[group.stateKey] ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'
              "
              aria-hidden="true"
            ></i>
          </button>
        </h3>
        <div
          v-show="openGroups[group.stateKey]"
          :id="`best-group-${group.stateKey}`"
          class="best-disc-list"
        >
          <article v-for="disc in group.discs" :key="disc.id" class="best-disc-row">
            <div class="min-w-0 flex-1">
              <p
                class="m-0 truncate font-semibold text-sm text-gray-900 dark:text-white"
                :title="disc.name"
              >
                {{ disc.name }}
              </p>
              <div
                class="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span class="truncate" :title="disc.artist.name">{{ disc.artist.name }}</span>
                <span
                  v-if="disc.genre"
                  class="best-disc-genre"
                  :style="{ backgroundColor: disc.genre.color || '#9ca3af' }"
                  >{{ disc.genre.name }}</span
                >
                <span v-if="disc.pinned" class="text-amber-600 dark:text-amber-400"
                  ><i class="fa-solid fa-star" aria-hidden="true"></i> Destacado</span
                >
              </div>
            </div>
            <SpotifyArtistButton
              :artist-name="disc.artist.name"
              :album-url="disc.link"
              class="best-row-spotify"
            />
            <div class="best-row-actions">
              <select
                :aria-label="`Usuario para ${disc.name}`"
                :value="selectedUserFor(disc)"
                @change="selectedUsers[disc.id] = ($event.target as HTMLSelectElement).value"
              >
                <option value="">Elegir usuario</option>
                <option v-for="user in users" :key="user.id" :value="user.id">
                  {{ user.username }}
                </option>
              </select>
              <button
                type="button"
                :disabled="mutations.isPending.value"
                @click="saveAssignment(disc)"
              >
                {{ disc.hasExistingAsignation ? "Actualizar" : "Asignar" }}
              </button>
              <button
                type="button"
                class="best-featured"
                :aria-pressed="Boolean(disc.pinned)"
                :aria-label="
                  disc.pinned ? `Quitar destacado a ${disc.name}` : `Destacar ${disc.name}`
                "
                @click="toggleFeatured(disc)"
              >
                <i
                  :class="disc.pinned ? 'fa-solid fa-star' : 'fa-regular fa-star'"
                  aria-hidden="true"
                ></i>
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div ref="sentinel" class="best-catalog-sentinel" aria-hidden="true"></div>
    <p
      v-if="isFetchingNext"
      role="status"
      class="text-center text-sm text-gray-500 dark:text-gray-400"
    >
      Cargando más discos…
    </p>
    <div v-if="catalogQuery.isFetchNextPageError.value" role="alert" class="best-catalog-error">
      No se pudo cargar la siguiente página.
      <button type="button" @click="catalogQuery.fetchNextPage({ cancelRefetch: false })">
        Reintentar
      </button>
    </div>
    <p
      v-else-if="catalogQuery.data.value && !catalogQuery.hasNextPage.value"
      class="text-center text-xs text-gray-400 dark:text-gray-500"
    >
      Has llegado al final del catálogo.
    </p>
  </section>
</template>

<style scoped>
.best-filter-input {
  min-height: 2.75rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.7rem;
  background: #fff;
  color: #111827;
  font-size: 0.875rem;
}
.dark .best-filter-input {
  border-color: #ffffff26;
  background: #00021f;
  color: #fff;
}
.best-catalog-group {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 0.85rem;
  background: #fff;
}
.dark .best-catalog-group {
  border-color: #ffffff1a;
  background: #00021f;
}
.best-group-toggle {
  display: flex;
  width: 100%;
  min-height: 3rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.8rem;
  border: 0;
  background: #f9fafb;
  color: #1f2937;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 700;
}
.dark .best-group-toggle {
  background: #10122f;
  color: #f3f4f6;
}
.best-group-count {
  flex: none;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: #e5e7eb;
  color: #4b5563;
  font-size: 0.7rem;
}
.dark .best-group-count {
  background: #ffffff1a;
  color: #e5e7eb;
}
.best-disc-list {
  padding: 0 0.75rem;
}
.best-disc-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-top: 1px solid #e5e7eb;
}
.dark .best-disc-row {
  border-color: #ffffff1a;
}
.best-disc-genre {
  max-width: 10rem;
  overflow: hidden;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  color: white;
  font-size: 0.62rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.best-row-spotify {
  display: flex;
  width: 2.5rem;
  min-width: 2.5rem;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.6rem;
  background: #22c55e;
  color: white;
}
.best-row-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.4rem;
}
.best-row-actions select,
.best-row-actions button {
  min-height: 2.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.6rem;
  background: #fff;
  color: #374151;
  padding: 0 0.55rem;
  font-size: 0.75rem;
}
.dark .best-row-actions select,
.dark .best-row-actions button {
  border-color: #ffffff26;
  background: #10122f;
  color: #e5e7eb;
}
.best-row-actions button {
  font-weight: 700;
}
.best-row-actions .best-featured {
  width: 2.75rem;
  padding: 0;
  color: #6b7280;
}
.best-row-actions .best-featured[aria-pressed="true"] {
  color: #d97706;
}
.best-catalog-sentinel {
  height: 1px;
  pointer-events: none;
}
.best-catalog-state,
.best-catalog-error {
  padding: 1rem;
  border-radius: 0.75rem;
  background: #f9fafb;
  color: #6b7280;
  font-size: 0.875rem;
}
.dark .best-catalog-state,
.dark .best-catalog-error {
  background: #10122f;
  color: #d1d5db;
}
.best-catalog-error button {
  margin-left: 0.5rem;
  text-decoration: underline;
}
@media (max-width: 600px) {
  .best-disc-row {
    flex-wrap: wrap;
    gap: 0.55rem;
  }
  .best-disc-row > div:first-child {
    flex-basis: calc(100% - 3.1rem);
  }
  .best-row-spotify {
    order: 2;
  }
  .best-row-actions {
    order: 3;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 2.75rem;
    width: 100%;
    gap: 0.45rem;
  }
  .best-row-actions select {
    min-width: 0;
    width: 100%;
  }
  .best-row-actions button {
    white-space: nowrap;
  }
}
</style>
