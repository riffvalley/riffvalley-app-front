<template>
  <div class="disc-catalog max-w-7xl mx-auto mt-10">
    <h3 v-if="type !== 'week'" class="text-2xl font-bold mb-8 text-center">
      Discs for {{ ["month", "video"].includes(type) ? "Month" : "Week" }}: {{ formattedDate }}
    </h3>

    <!-- Filtros -->
    <DiscFilters
      :searchQuery="searchQuery"
      :selectedGenre="selectedGenre"
      :genres="genres"
      :showWeekPicker="false"
      @update:searchQuery="searchQuery = $event"
      @update:selectedGenre="selectedGenre = $event"
      @reset-and-fetch="resetAndFetch"
    />

    <div v-if="filteredDiscs.length === 0 && !loading" class="text-center text-gray-500">
      No discs found for the selected {{ type }}.
    </div>
    <div v-else>
      <!-- Lista continua de discos, agrupada por fecha -->
      <component
        v-for="group in displayGroups"
        :key="group.key"
        :is="type === 'week' ? 'details' : 'div'"
        :open="type === 'week' && group.isOpenByDefault"
        class="mb-8"
      >
        <!-- Encabezado del grupo -->
        <component
          :is="type === 'week' ? 'summary' : 'div'"
          :class="type === 'week' ? 'cursor-pointer list-none' : ''"
          class="flex justify-between items-center bg-gray-200 dark:bg-rv-navy px-4 py-2 rounded"
        >
          <h3 class="text-xl font-bold">
            {{ group.heading }}
          </h3>
          <i
            v-if="type === 'week'"
            class="day-chevron fa-solid fa-chevron-down text-xs text-gray-500 dark:text-gray-300 transition-transform"
            aria-hidden="true"
          ></i>
        </component>

        <div class="mt-4">
          <ul>
            <li
              v-for="disc in group.discs"
              :key="disc.id"
              class="flex gap-2 p-4 transition-colors"
              :class="[
                'flex-col sm:flex-row sm:items-center sm:justify-between border-b',
                disc.pinned ? 'bg-green-50 dark:bg-green-900/10' : '',
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
                  <div
                    v-if="
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
                  ></div>
                  <div class="shrink-0">
                    <SpotifyArtistButton :artistName="disc.artist.name" />
                  </div>
                </div>
              </div>

              <!-- Acciones -->
              <div class="flex items-center gap-2 flex-wrap">
                <select
                  :id="`radar-user-${disc.id}`"
                  v-model="selectedUser[disc.id]"
                  :aria-label="`Asignar ${disc.name} a un usuario`"
                  class="border rounded px-2 py-1 text-sm flex-1 sm:flex-none sm:w-36 bg-white text-gray-900"
                >
                  <option value="" disabled>Elegir usuario</option>
                  <option v-for="user in users" :key="user.id" :value="user.id">
                    {{ user.username }}
                  </option>
                </select>
                <button
                  v-if="disc.hasExistingAsignation"
                  @click="updateAsignation(disc.id)"
                  class="bg-yellow-500 text-white px-3 py-1.5 rounded text-sm font-semibold"
                >
                  Actualizar
                </button>
                <button
                  v-else
                  @click="assignUser(disc.id)"
                  class="bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-semibold"
                >
                  Asignar
                </button>
                <button
                  @click="togglePinned(disc)"
                  :class="[
                    'px-3 py-1.5 rounded text-xs font-semibold text-white transition-colors',
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
      </component>
    </div>
    <div ref="scrollObserver" class="h-1 text-center py-6">
      <span v-if="loading" role="status" aria-live="polite" class="text-gray-600">
        Cargando discos...
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  reactive,
  onMounted,
  watch,
  computed,
  nextTick,
  type PropType,
} from "vue";
import { getDiscsDated, updateDisc, type Disc, type GroupedDiscs } from "@services/discs/discs";
import { getRvUsers } from "@/modules/identity/users";
import type { RvUser } from "@/modules/identity/users";
import { getGenres, type Genre } from "@services/genres/genres";
import SwalService from "@services/swal/SwalService";
import { postAsignationService } from "@services/asignation/asignation";
import type { EditorialAsignation } from "@services/asignation/asignation";
import { useAsignationStore } from "@stores/asignation/asignation";
import SpotifyArtistButton from "@components/SpotifyArtistButton.vue";
import DiscFilters from "@components/DiscFilters.vue";
import {
  getEditorialWeekRange,
  groupDiscsByEditorialDay,
  toEditorialWeekApiDate,
} from "../utils/editorialWeek";

export default defineComponent({
  name: "DiscsByDate",
  components: { SpotifyArtistButton, DiscFilters },
  props: {
    date: { type: String, required: true },
    type: {
      type: String,
      required: true,
      validator: (value: string) => ["week", "month", "video"].includes(value),
    },
    artistCountry: {
      type: Object as PropType<{ id: string; name: string; isoCode: string }>,
      required: false,
      default: null,
    },
    listId: { type: String, required: true },
  },
  setup(props) {
    interface DiscDateGroup {
      start: string | null;
      end: string | null;
      releaseDate: string | null;
      discs: Disc[];
    }
    type CatalogDisc = Disc & { hasExistingAsignation?: boolean };
    const legacyDiscs = ref<DiscDateGroup[]>([]);
    const legacyUsers = ref<RvUser[]>([]);
    const loading = ref(false);
    const hasMore = ref(true);
    const page = ref(1);
    const limit = ref(50);
    const formattedDate = ref("");
    const scrollObserver = ref<HTMLDivElement | null>(null);
    const asignationStore = useAsignationStore();
    const users = computed(() => legacyUsers.value);
    const legacyGenres = ref<Genre[]>([]);
    const genres = computed(() => legacyGenres.value);
    const searchQuery = ref("");
    const selectedGenre = ref("");
    const discs = computed(() => legacyDiscs.value);
    const selectedUser = reactive<Record<string, string>>({});

    const filteredDiscs = computed(() =>
      discs.value
        .map((group) => ({
          ...group,
          discs: group.discs.filter((disc) => {
            const matchesSearch =
              disc.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
              disc.artist.name.toLowerCase().includes(searchQuery.value.toLowerCase());
            const matchesGenre = !selectedGenre.value || disc.genre?.id === selectedGenre.value;
            return matchesSearch && matchesGenre;
          }),
        }))
        .filter((group) => group.discs.length > 0)
    );

    const displayGroups = computed(() => {
      if (props.type === "week") {
        const week = getEditorialWeekRange(props.date);
        if (!week) return [];
        const weekDiscs = filteredDiscs.value.flatMap((group) => group.discs);
        return groupDiscsByEditorialDay(weekDiscs, week.days)
          .filter(({ discs: dayDiscs }) => dayDiscs.length > 0)
          .map(({ day, discs: dayDiscs }) => ({
            key: day.dateKey,
            heading: day.label,
            isOpenByDefault: day.weekday === 5,
            discs: dayDiscs,
          }));
      }
      return filteredDiscs.value.map((group) => ({
        key: group.releaseDate,
        heading: group.releaseDate,
        isOpenByDefault: false,
        discs: group.discs,
      }));
    });

    const fetchDiscs = async () => {
      if (loading.value || !hasMore.value) return;
      loading.value = true;
      try {
        const startDate = new Date(props.date);
        const endDate = new Date(props.date);
        if (props.type === "week") {
          const week = getEditorialWeekRange(props.date);
          if (!week) throw new Error("Invalid editorial week date");
          startDate.setTime(Date.parse(toEditorialWeekApiDate(week.start)));
          endDate.setTime(Date.parse(toEditorialWeekApiDate(week.end, true)));
        } else {
          startDate.setUTCDate(1);
          endDate.setUTCMonth(startDate.getUTCMonth() + 1);
          endDate.setUTCDate(0);
        }
        formattedDate.value =
          props.type === "week"
            ? `Semana del ${String(startDate.getUTCDate()).padStart(2, "0")}-${String(startDate.getUTCMonth() + 1).padStart(2, "0")} al ${String(endDate.getUTCDate()).padStart(2, "0")}-${String(endDate.getUTCMonth() + 1).padStart(2, "0")}`
            : startDate.toLocaleDateString("default", { month: "long", year: "numeric" });
        const offset = (page.value - 1) * limit.value;
        const response = await getDiscsDated(limit.value, offset, [
          startDate.toISOString(),
          endDate.toISOString(),
        ]);
        if (response.data.length === 0) {
          hasMore.value = false;
          return;
        }
        const updatedDiscs: DiscDateGroup[] = response.data
          .filter((item): item is GroupedDiscs => "discs" in item)
          .map((group) => ({
            start: props.type === "week" ? new Date(group.releaseDate).toLocaleDateString() : null,
            end:
              props.type === "week"
                ? new Date(
                    new Date(group.releaseDate).setDate(new Date(group.releaseDate).getDate() + 6)
                  ).toLocaleDateString()
                : null,
            releaseDate: ["month", "video"].includes(props.type) ? group.releaseDate : null,
            discs: group.discs,
          }));
        updatedDiscs.forEach((newGroup) => {
          const existingIndex = legacyDiscs.value.findIndex((group) =>
            props.type === "week"
              ? group.start === newGroup.start && group.end === newGroup.end
              : group.releaseDate === newGroup.releaseDate
          );
          if (existingIndex !== -1) {
            legacyDiscs.value[existingIndex].discs = [
              ...legacyDiscs.value[existingIndex].discs,
              ...newGroup.discs,
            ];
          } else {
            legacyDiscs.value.push(newGroup);
          }
          newGroup.discs.forEach((disc) => {
            const assignment = disc.asignations?.find((item) => item.list?.id === props.listId);
            if (assignment) {
              selectedUser[disc.id] = assignment.user?.id || "";
              disc.hasExistingAsignation = true;
            } else {
              selectedUser[disc.id] = "";
              disc.hasExistingAsignation = false;
            }
          });
        });
        page.value++;
      } catch (error) {
        console.error("Error fetching discs:", error);
      } finally {
        loading.value = false;
        await nextTick();
        checkIfNeedsMore();
      }
    };
    const checkIfNeedsMore = () => {
      if (!hasMore.value || loading.value || !scrollObserver.value) return;
      if (scrollObserver.value.getBoundingClientRect().top < window.innerHeight) void fetchDiscs();
    };
    const fetchUsers = async () => {
      try {
        legacyUsers.value = (await getRvUsers()).sort((a, b) =>
          a.username.localeCompare(b.username)
        );
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    const fetchGenres = async () => {
      try {
        legacyGenres.value = (await getGenres(150, 0)).data;
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    const assignUser = async (discId: string) => {
      const userId = selectedUser[discId];
      if (!userId) {
        SwalService.error("Please select a user before assigning.");
        return;
      }
      const disc = discs.value.flatMap((group) => group.discs).find((item) => item.id === discId);
      try {
        const response = await postAsignationService({
          userId,
          discId,
          listId: props.listId,
          genre: disc?.genre?.name,
        });
        asignationStore.addAsignation(response);
        if (disc) disc.hasExistingAsignation = true;
        SwalService.success("Assignment created successfully.");
      } catch (error) {
        console.error("Error creating assignment:", error);
        SwalService.error("Failed to assign user. Please try again.");
      }
    };
    const removeAsignationFromDisc = (removedAsignation: EditorialAsignation) => {
      const discId = removedAsignation.disc?.id;
      if (!discId) return;
      delete selectedUser[discId];
      const disc = discs.value.flatMap((group) => group.discs).find((item) => item.id === discId);
      if (disc) disc.hasExistingAsignation = false;
    };
    const observeScroll = (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting) void fetchDiscs();
    };
    const resetAndFetch = () => {
      page.value = 1;
      legacyDiscs.value = [];
      hasMore.value = true;
      void fetchDiscs();
    };
    onMounted(() => {
      void fetchUsers();
      void fetchGenres();
      void fetchDiscs();
      const observer = new IntersectionObserver(observeScroll, { threshold: 1.0 });
      if (scrollObserver.value) observer.observe(scrollObserver.value);
    });
    watch(
      () => asignationStore.asignations,
      (newAsignations, oldAsignations) => {
        const removed = oldAsignations.find(
          (oldItem) => !newAsignations.find((newItem) => newItem.id === oldItem.id)
        );
        if (removed) removeAsignationFromDisc(removed);
      },
      { deep: true }
    );
    const updateAsignation = async (discId: string) => {
      const userId = selectedUser[discId];
      const disc = discs.value.flatMap((group) => group.discs).find((item) => item.id === discId);
      const assignmentId = disc?.asignations?.find(
        (assignment) => assignment.list?.id === props.listId
      )?.id;
      if (!userId || !assignmentId) {
        SwalService.error("Please select a user and ensure the assignment exists before updating.");
        return;
      }
      try {
        await asignationStore.updateAsignationStore({ id: assignmentId, userId });
        SwalService.success("Assignment updated successfully.");
      } catch (error) {
        console.error("Error updating assignment:", error);
        SwalService.error("Failed to update assignment. Please try again.");
      }
    };
    const togglePinned = async (disc: CatalogDisc) => {
      try {
        await updateDisc(disc.id, { pinned: !disc.pinned });
        disc.pinned = !disc.pinned;
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
      loading,
      hasMore,
      page,
      formattedDate,
      scrollObserver,
      users,
      selectedUser,
      assignUser,
      updateAsignation,
      searchQuery,
      selectedGenre,
      genres,
      filteredDiscs,
      displayGroups,
      resetAndFetch,
      countryName,
      countryCode,
      formatDiscDate,
      togglePinned,
    };
  },
});
</script>

<style scoped>
details[open] > summary .day-chevron {
  transform: rotate(180deg);
}
</style>
