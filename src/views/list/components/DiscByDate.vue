<template>
  <div class="max-w-7xl mx-auto mt-6 md:mt-10">
    <h3 class="text-xl md:text-2xl font-bold mb-6 md:mb-8 text-center text-gray-900 dark:text-white">
      {{ ["month", "video"].includes(type) ? "Discos para el mes" : "Discos para la semana" }}: {{ formattedDate }}
    </h3>

    <!-- Filtros -->
    <DiscFilters :searchQuery="searchQuery" :selectedGenre="selectedGenre" :genres="genres" :showWeekPicker="false"
      @update:searchQuery="searchQuery = $event" @update:selectedGenre="selectedGenre = $event"
      @reset-and-fetch="resetAndFetch" />

    <div v-if="filteredDiscs.length === 0 && !loading" class="text-center text-gray-500 dark:text-gray-400 py-8">
      No discs found for the selected {{ type }}.
    </div>
    <div v-else>
      <!-- Lista de discos agrupados -->
      <div v-for="(group, index) in filteredDiscs" :key="group.start || group.releaseDate" class="mb-6 md:mb-8">
        <!-- Encabezado del grupo -->
        <div class="flex justify-between items-center bg-gray-200 dark:bg-rv-darkSurface px-4 py-2 rounded cursor-pointer"
          @click="toggleGroup(index)">
          <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
            {{ type === "week" ? `${group.start}` : group.releaseDate }}
          </h3>
          <i :class="groupState[index] ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" class="text-gray-600 dark:text-gray-300 text-lg"></i>
        </div>

        <!-- Contenido del grupo -->
        <transition name="fade-slide" mode="out-in">
          <div v-if="groupState[index]" class="mt-4">
            <ul>
              <li v-for="disc in group.discs" :key="disc.id"
                class="flex flex-wrap justify-between items-center gap-3 p-3 md:p-4 border-b border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-rv-darkSurface transition-colors">

                <div class="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                  <p class="px-2 py-1 rounded-full text-xs font-medium text-white text-center shadow-sm shrink-0"
                    :style="{ backgroundColor: disc.genre?.color || 'grey' }">
                    {{ disc.genre?.name || "Sin género" }}
                  </p>

                  <h4 class="text-sm md:text-base font-semibold text-gray-900 dark:text-white truncate">
                    {{ disc.artist.name }} - {{ disc.name }}
                  </h4>
                  <SpotifyArtistButton :artistName="disc.artist.name" />
                  <span v-if="disc.ep"
                    class="px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500 shadow-sm shrink-0">
                    EP
                  </span>

                  <!-- Bandera -->
                  <div v-if="(disc.artist?.country?.isoCode?.length >= 2) || (disc.artistCountry?.isoCode?.length >= 2)"
                    class="relative group shrink-0">
                    <div v-if="disc.artist?.country?.isoCode || disc.artistCountry?.isoCode" class="relative group">
                      <template v-if="(disc.artist?.country?.isoCode || disc.artistCountry?.isoCode) === 'int'">
                        <img src="/int.svg" alt="Internacional" class="h-5 w-5 rounded-full cursor-help object-cover" aria-hidden="true" />
                      </template>
                      <template v-else-if="(disc.artist?.country?.isoCode || disc.artistCountry?.isoCode)?.length >= 2">
                        <CircleFlags
                          :country="(disc.artist?.country?.isoCode || disc.artistCountry?.isoCode).slice(0, 2).toLowerCase()"
                          :show-flag-name="false" class="h-7 w-7 cursor-help" aria-hidden="true" />
                      </template>
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[9px] font-semibold
                        text-white bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300
                        max-w-[160px] whitespace-normal text-center z-20"
                        style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                        {{
                          countryAbbr[disc.artist?.country?.name]
                          || disc.artist?.country?.name
                          || countryAbbr[disc.artistCountry?.name]
                          || disc.artistCountry?.name
                          || (disc.artist?.country?.isoCode || disc.artistCountry?.isoCode)?.slice(0, 2).toUpperCase()
                        }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Selector y botones -->
                <div class="flex items-center gap-2 shrink-0">
                  <select v-model="selectedUser[disc.id]"
                    class="border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded px-2 py-1 text-sm">
                    <option value="" disabled>Seleccionar</option>
                    <option v-for="user in users" :key="user.id" :value="user.id">
                      {{ user.username }}
                    </option>
                  </select>
                  <button v-if="disc.hasExistingAsignation" @click="updateAsignation(disc.id)"
                    class="bg-yellow-500 text-white px-3 py-1.5 rounded hover:bg-yellow-600 transition-colors text-sm">
                    Actualizar
                  </button>
                  <button v-else @click="assignUser(disc.id)"
                    class="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 transition-colors text-sm">
                    Asignar
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </transition>
      </div>
    </div>

    <div ref="scrollObserver" class="h-1 text-center py-6">
      <span v-if="loading" class="text-gray-600 dark:text-gray-400">Loading more discs...</span>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, ref, reactive, onMounted, watch, computed, nextTick, type PropType,
} from "vue";
import { getDiscsDated } from "@services/discs/discs";
import { getRvUsers } from "@services/users/users";
import { getGenres } from "@services/genres/genres";
import SwalService from "@services/swal/SwalService";
import { postAsignationService } from "@services/asignation/asignation";
import { useAsignationStore } from "@stores/asignation/asignation";
import { updateAsignationService } from "@services/asignation/asignation";
import SpotifyArtistButton from "@components/SpotifyArtistButton.vue";
import DiscFilters from "@components/DiscFilters.vue";
import CircleFlags from "vue-circle-flags";

export default defineComponent({
  name: "DiscsByDate",
  components: { SpotifyArtistButton, DiscFilters, CircleFlags },
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
    const discs = ref<any[]>([]);
    const users = ref<any[]>([]);
    const groupState = reactive({});
    const loading = ref(false);
    const hasMore = ref(true);
    const page = ref(1);
    const limit = ref(50);
    const formattedDate = ref("");
    const scrollObserver = ref<HTMLDivElement | null>(null);
    const asignationStore = useAsignationStore();
    const genres = ref<any[]>([]);
    const searchQuery = ref("");
    const selectedGenre = ref("");
    const selectedUser = reactive<{ [key: string]: string }>({});

    const filteredDiscs = computed(() => {
      return discs.value.map(group => ({
        ...group,
        discs: group.discs.filter(disc => {
          const matchesSearch =
            disc.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            disc.artist.name.toLowerCase().includes(searchQuery.value.toLowerCase());
          const matchesGenre = !selectedGenre.value || disc.genre?.id === selectedGenre.value;
          return matchesSearch && matchesGenre;
        })
      })).filter(group => group.discs.length > 0);
    });

    const fetchDiscs = async () => {
      if (loading.value || !hasMore.value) return;
      loading.value = true;
      try {
        const startDate = new Date(props.date);
        const endDate = new Date(props.date);
        if (props.type === "week") {
          const day = startDate.getUTCDay();
          const diff = startDate.getUTCDate() - day + (day === 0 ? -6 : 1);
          startDate.setUTCDate(diff);
          endDate.setUTCDate(startDate.getUTCDate() + 6);
        } else {
          startDate.setUTCDate(1);
          endDate.setUTCMonth(startDate.getUTCMonth() + 1);
          endDate.setUTCDate(0);
        }
        formattedDate.value = props.type === "week"
          ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
          : startDate.toLocaleDateString("default", { month: "long", year: "numeric" });

        const offset = (page.value - 1) * limit.value;
        const response = await getDiscsDated(limit.value, offset, [
          startDate.toISOString(), endDate.toISOString(),
        ]);

        if (response.data.length === 0) { hasMore.value = false; return; }

        const updatedDiscs = response.data.map((group: any) => ({
          start: props.type === "week" ? new Date(group.releaseDate).toLocaleDateString() : null,
          end: props.type === "week" ? new Date(new Date(group.releaseDate).setDate(new Date(group.releaseDate).getDate() + 6)).toLocaleDateString() : null,
          releaseDate: ["month", "video"].includes(props.type) ? group.releaseDate : null,
          discs: group.discs,
        }));

        updatedDiscs.forEach((newGroup) => {
          const existingIndex = discs.value.findIndex((group) =>
            props.type === "week"
              ? group.start === newGroup.start && group.end === newGroup.end
              : group.releaseDate === newGroup.releaseDate
          );
          if (existingIndex !== -1) {
            discs.value[existingIndex].discs = [...discs.value[existingIndex].discs, ...newGroup.discs];
          } else {
            discs.value.push(newGroup);
          }
          newGroup.discs.forEach((disc: any) => {
            const asignation = disc.asignations?.find((a: any) => a.list.id === props.listId);
            if (asignation) {
              selectedUser[disc.id] = asignation.user.id;
              disc.hasExistingAsignation = true;
            } else {
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
      const rect = scrollObserver.value.getBoundingClientRect();
      if (rect.top < window.innerHeight) fetchDiscs();
    };

    const fetchUsers = async () => {
      try {
        const usersResponse = await getRvUsers();
        users.value = usersResponse.sort((a, b) => a.username.localeCompare(b.username));
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const fetchGenres = async () => {
      try {
        const genresResponse = await getGenres(150, 0);
        genres.value = genresResponse.data;
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };

    const toggleGroup = (index: number) => { groupState[index] = !groupState[index]; };

    const assignUser = async (discId: string) => {
      const userId = selectedUser[discId];
      if (userId) {
        try {
          const response = await postAsignationService({ userId, discId, listId: props.listId });
          asignationStore.addAsignation(response);
          const groupIndex = discs.value.findIndex((group) => group.discs.some((disc: any) => disc.id === discId));
          if (groupIndex !== -1) {
            const discIndex = discs.value[groupIndex].discs.findIndex((disc: any) => disc.id === discId);
            if (discIndex !== -1) discs.value[groupIndex].discs[discIndex].hasExistingAsignation = true;
          }
          SwalService.success('Assignment created successfully.');
        } catch (error) {
          SwalService.error('Failed to assign user. Please try again.');
        }
      } else {
        SwalService.error('Please select a user before assigning.');
      }
    };

    const removeAsignationFromDisc = (removedAsignation: any) => {
      if (removedAsignation?.disc) {
        const discId = removedAsignation.disc.id;
        if (selectedUser[discId]) delete selectedUser[discId];
        const groupIndex = discs.value.findIndex((group) => group.discs.some((disc: any) => disc.id === discId));
        if (groupIndex !== -1) {
          const discIndex = discs.value[groupIndex].discs.findIndex((disc: any) => disc.id === discId);
          if (discIndex !== -1) discs.value[groupIndex].discs[discIndex].hasExistingAsignation = false;
        }
      }
    };

    const observeScroll = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) fetchDiscs();
    };

    const resetAndFetch = () => {
      page.value = 1;
      discs.value = [];
      fetchDiscs();
    };

    onMounted(() => {
      fetchUsers();
      fetchGenres();
      fetchDiscs();
      const observer = new IntersectionObserver(observeScroll, { threshold: 1.0 });
      if (scrollObserver.value) observer.observe(scrollObserver.value);
    });

    watch(
      () => asignationStore.asignations,
      (newAsignations, oldAsignations) => {
        const removedAsignation = oldAsignations.find((oldA) => !newAsignations.find((newA) => newA.id === oldA.id));
        if (removedAsignation) removeAsignationFromDisc(removedAsignation);
      },
      { deep: true }
    );

    const updateAsignation = async (discId: string) => {
      const userId = selectedUser[discId];
      const group = discs.value.find((group) => group.discs.some((disc: any) => disc.id === discId));
      const disc = group?.discs.find((disc: any) => disc.id === discId);
      const asignationId = disc?.asignations?.find((a: any) => a.list.id === props.listId)?.id;
      if (userId && asignationId) {
        try {
          await asignationStore.updateAsignationStore({ id: asignationId, userId });
          SwalService.success('Assignment updated successfully.');
        } catch (error) {
          SwalService.error('Failed to update assignment. Please try again.');
        }
      } else {
        SwalService.error("Please select a user and ensure the assignment exists before updating.");
      }
    };

    const countryAbbr: Record<string, string> = {
      "United States of America": "USA",
      "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
    };

    return {
      discs, groupState, loading, hasMore, page, formattedDate, toggleGroup,
      scrollObserver, users, selectedUser, assignUser, updateAsignation,
      searchQuery, selectedGenre, genres, filteredDiscs, resetAndFetch, countryAbbr,
    };
  },
});
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.6s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-15px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}
</style>
