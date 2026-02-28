<template>
  <div :class="{ 'menu-open': menuVisible }" class="max-w-7xl mx-auto mt-10 px-4 sm:px-6 lg:px-8">
    <h1 v-if="!embedded" class="text-4xl font-bold mb-8 text-center text-gray-900">
      Calendario
    </h1>

    <!-- FILTROS SUPERIORES -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start mb-6">
      <DiscFilters :externalRow1="true" :searchQuery="searchQuery" :selectedGenre="selectedGenre"
        :selectedCountry="selectedCountry" :genres="genreOptions" :countries="countries" :showWeekPicker="false"
        :showCountryFilter="false" @update:searchQuery="searchQuery = $event"
        @update:selectedGenre="selectedGenre = $event" @update:selectedCountry="selectedCountry = $event"
        selectClass="w-full min-w-0" @reset-and-fetch="resetAndFetch" />

      <SimpleSelect v-model="selectedYear" :options="yearOptions" placeholder="Año" class="w-full min-w-0" />
    </div>


    <div>
      <div class="flex flex-wrap justify-center gap-2 mb-6 mt-6 overflow-x-auto">
        <button v-for="(month, index) in months" :key="index" @click="selectMonth(index)" class="px-4 py-2 rounded-full transition-all duration-200 whitespace-nowrap shadow-sm mb-1 font-semibold
         border-rv-navy/15
         focus:outline-none focus:ring-0 focus:ring-offset-0" :class="selectedMonth === index
          ? 'bg-gradient-to-tr from-rv-blue to-rv-blueDark text-white shadow-md border-transparent'
          : 'bg-white text-rv-navy hover:border-rv-blue border-2 hover:shadow-md'">
          {{ month }}
        </button>
      </div>

      <!-- Lista de discos agrupados (resto del template) -->
      <div v-for="(group, index) in filteredGroupedDiscs" :key="group.releaseDate" class="mb-8">
        <div class="group flex justify-between items-center px-5 py-3 rounded-full cursor-pointer transition-all duration-200 shadow-sm
         border border-rv-navy/10" :class="(groupState[index] || closing[index])
          ? 'bg-gradient-to-r from-rv-navy to-rv-navy/80 shadow-md'
          : 'bg-white hover:bg-gradient-to-r from-rv-navy to-rv-navy/80 hover:text-white hover:shadow-md'"
          @click="toggleGroup(index)">
          <h3 class="text-xl sm:text-2xl font-semibold transition-colors duration-200" :class="(groupState[index] || closing[index])
            ? 'text-white'
            : 'text-rv-navy group-hover:text-white'">
            {{ formatDate(group.releaseDate) }}
          </h3>

          <button class="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200
           focus:outline-none focus:ring-0 focus:ring-offset-0" :class="(groupState[index] || closing[index])
            ? 'bg-rv-pink text-white text-xl'
            : 'bg-rv-pink text-white hover:bg-rv-pink text-xl hover:text-white'">
            <i class="fas fa-chevron-down transition-transform duration-200"
              :class="(groupState[index] || closing[index]) ? 'rotate-180' : ''"></i>
          </button>
        </div>

        <!-- Contenido del grupo desplegable -->
        <transition name="fade-slide" @before-leave="() => (closing[index] = true)"
          @after-leave="() => (closing[index] = false)">
          <!-- ÚNICO hijo raíz del transition -->
          <div v-show="groupState[index]" class="mt-4 overflow-x-auto">
            <!-- Contenedor de botones centrado -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-center gap-2 mt-4 w-full">
              <button v-if="new Date(group.releaseDate) < new Date()" @click="buscarEnlacesSpotify(group.discs)"
                class="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-all duration-200 hover:shadow-md transform hover:scale-105 w-full max-w-[300px] sm:max-w-none sm:w-auto text-center self-center">
                Buscar enlaces en Spotify
              </button>

              <span class="hidden sm:inline-block w-4"></span>

              <button @click="exportarHtml(group)"
                class="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-all duration-200 hover:shadow-md transform hover:scale-105 w-full max-w-[300px] sm:max-w-none sm:w-auto text-center self-center">
                Exportar HTML de esta semana
              </button>
            </div>

            <div v-if="optionsReady">
              <ul class="w-full mt-4">
                <li v-for="disc in group.discs" :key="disc.id"
                  class="flex flex-col md:flex-row md:justify-between p-4 border-b w-full">
                  <div :id="`disc-${disc.id}`" class="w-full">
                    <DiscComponent :disc="disc" :genres="genres" :countries="countries" :focusDiscId="focusDiscId"
                      @disc-deleted="removeDisc" @date-changed="handleDateChange" />
                  </div>
                </li>
              </ul>
            </div>
            <div v-else class="text-center text-gray-500 py-6">
              Cargando géneros y países…
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>

  <!-- Cargar más -->
  <div ref="loadMore" class="text-center py-6">
    <span v-if="loading" class="text-gray-600">Cargando discos...</span>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  onMounted,
  reactive,
  computed,
  nextTick,
  watch,
  toRef,
} from "vue";
import axios from "axios";
import { updateDisc, deleteDisc, getDiscsDated } from "@services/discs/discs";
import DiscComponent from "./components/DiscComponent.vue";
import { useCatalogStore } from "@stores/catalog/catalog";
import { MONTHS, getYearOptions } from "@helpers/dateConstants";
import { obtenerTokenSpotify } from "@helpers/SpotifyFunctions.ts";
import DiscFilters from "@components/DiscFilters.vue";
import SimpleSelect from "@components/SimpleSelect.vue";

export default defineComponent({
  components: { DiscComponent, DiscFilters, SimpleSelect },
  name: "DiscsList",

  props: {
    embedded: { type: Boolean, default: false },
    initialDate: { type: String, default: "" },
    focusDiscId: { type: String, default: "" },
  },
  emits: ["close"],

  setup(props) {
    const groupedDiscs = ref<any[]>([]);
    const groupState = reactive({});

    const months = MONTHS;
    const yearOptions = getYearOptions();

    const selectedMonth = ref(new Date().getMonth());
    const selectedYear = ref(new Date().getFullYear());

    const focusDiscId = toRef(props, "focusDiscId");

    // --- Filtros ---
    const searchQuery = ref("");
    const selectedGenre = ref("");
    const selectedCountry = ref("");
    const selectedWeek = ref<Date | null>(null);

    const norm = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    const filteredGroupedDiscs = computed(() => {
      const q = norm(searchQuery.value || "");
      return groupedDiscs.value
        .map((group) => ({
          ...group,
          discs: group.discs.filter((disc) => {
            const matchesSearch =
              !q ||
              norm(disc.name).includes(q) ||
              norm(disc.artist.name).includes(q);
            const matchesGenre =
              !selectedGenre.value ||
              String(disc.genre?.id ?? "") === String(selectedGenre.value);
            return matchesSearch && matchesGenre;
          }),
        }))
        .filter((g) => g.discs.length > 0);
    });

    const closing = reactive<Record<number, boolean>>({});

    const fetchAllPagesForMonth = async () => {
      try {
        if (loadMore.value) observer.unobserve(loadMore.value);
      } catch { }

      while (hasMore.value) {
        await fetchDiscs();
        await nextTick();
      }

      try {
        if (loadMore.value) observer.observe(loadMore.value);
      } catch { }
    };

    const initial = computed(() =>
      props.initialDate ? new Date(props.initialDate) : null
    );

    // Si abrimos desde modal con una fecha concreta, forzamos mes y año
    if (props.embedded && initial.value) {
      selectedMonth.value = initial.value.getMonth();
      selectedYear.value = initial.value.getFullYear();
    }

    const selectMonth = async (monthIndex: number) => {
      selectedMonth.value = monthIndex;
      const year = selectedYear.value;
      const startDate = new Date(Date.UTC(year, monthIndex, 1)).toISOString();
      const endDate = new Date(
        year,
        monthIndex + 1,
        0,
        23,
        59,
        59,
        999
      ).toISOString();

      offset.value = 0;
      groupedDiscs.value = [];

      await fetchDiscsByDateRange(startDate, endDate);
      await fetchAllPagesForMonth();
      await focusAndScrollToDisc();

    };

    const fetchDiscsByDateRange = async (
      startDate: string,
      endDate: string
    ) => {
      loading.value = true;
      try {
        const response = await getDiscsDated(limit.value, offset.value, [
          startDate,
          endDate,
        ]);

        response.data.forEach((group, index) => {
          groupState[index] = false;
          group.discs.forEach((disc: any) => {
            disc.genreId = disc.genre?.id ?? "";
          });
        });

        groupedDiscs.value = response.data;
        totalItems.value = response.totalItems;
        offset.value = limit.value;
        hasMore.value = offset.value < totalItems.value;
        await nextTick();

        if (props.embedded && initial.value) {
          const target = new Date(initial.value);

          const sameDay = (dateString: string) => {
            const d = new Date(dateString);
            return (
              d.getFullYear() === target.getFullYear() &&
              d.getMonth() === target.getMonth() &&
              d.getDate() === target.getDate()
            );
          };

          const idx = groupedDiscs.value.findIndex((g: any) => sameDay(g.releaseDate));
          if (idx >= 0) groupState[idx] = true;

          await nextTick();

          if (props.focusDiscId) {
            const el = document.getElementById(`disc-${props.focusDiscId}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }

      } catch (error) {
        console.error("Error fetching discs by date range:", error);
      } finally {
        loading.value = false;
      }
    };

    const focusAndScrollToDisc = async () => {
      if (!props.embedded || !initial.value || !props.focusDiscId) return;

      // 1) Abrir el grupo correcto (por fecha)
      const target = new Date(initial.value);

      const sameDay = (dateString: string) => {
        const d = new Date(dateString);
        return (
          d.getFullYear() === target.getFullYear() &&
          d.getMonth() === target.getMonth() &&
          d.getDate() === target.getDate()
        );
      };

      const idx = groupedDiscs.value.findIndex((g: any) => sameDay(g.releaseDate));
      if (idx >= 0) groupState[idx] = true;

      await nextTick();

      // 2) Esperar a que el transition termine (su fade-slide dura 0.35s)
      await new Promise((r) => setTimeout(r, 380));

      // 3) Scroll al disco ya renderizado
      const el = document.getElementById(`disc-${props.focusDiscId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    };


    const toggleGroup = (index) => {
      groupState[index] = !groupState[index];
    };

    const limit = ref(200);

    const offset = ref(0);
    const totalItems = ref(0);
    const hasMore = ref(true);

    const loading = ref(false);

    const loadMore = ref<HTMLDivElement | null>(null);

    const catalogStore = useCatalogStore();

    const genreOptions = computed(() =>
      (catalogStore.genres ?? [])
        .filter((g) => g && g.id)
        .map((g) => ({
          id: g.id,
          name: g.name && g.name.trim() ? g.name : "(Sin nombre)",
          color: g.color ?? null,
        }))
    );

    genres2.value = ["list", "of", "options"];

    const fetchDiscs = async () => {
      if (loading.value || !hasMore.value) return;

      loading.value = true;

      try {
        const year = selectedYear.value;
        const startDate = new Date(
          Date.UTC(year, selectedMonth.value, 1)
        ).toISOString();
        const endDate = new Date(
          year,
          selectedMonth.value + 1,
          0,
          23,
          59,
          59,
          999
        ).toISOString();

        const response = await getDiscsDated(limit.value, offset.value, [
          startDate,
          endDate,
        ]);

        response.data.forEach((newGroup: any) => {
          newGroup.discs.forEach((disc: any) => {
            disc.genreId = disc.genre?.id || "";
          });

          const existingGroup = groupedDiscs.value.find(
            (group: any) => group.releaseDate === newGroup.releaseDate
          );
          if (existingGroup) {
            existingGroup.discs.push(...newGroup.discs);
          } else {
            groupedDiscs.value.push(newGroup);
          }
        });

        totalItems.value = response.totalItems;
        offset.value += limit.value;
        hasMore.value = offset.value < totalItems.value;
      } catch (error) {
        console.error("Error fetching discs:", error);
      } finally {
        loading.value = false;
        await nextTick();
        checkIfNeedsMore();
      }
    };

    const checkIfNeedsMore = () => {
      if (!hasMore.value || loading.value || !loadMore.value) return;
      const rect = loadMore.value.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        fetchDiscs();
      }
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const optionsDate: Intl.DateTimeFormatOptions = {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      };
      const optionsWeekday: Intl.DateTimeFormatOptions = {
        weekday: "long",
      };

      const formattedDate = date.toLocaleDateString("es-ES", optionsDate);

      const formattedWeekday = date.toLocaleDateString("es-ES", optionsWeekday);

      return `${formattedDate}, ${formattedWeekday}`;
    };

    const optionsReady = computed(() => catalogStore.loaded);

    const buscarEnlacesSpotify = async (discs: any[]) => {
      const token = await obtenerTokenSpotify();
      if (!token) {
        console.error("No se pudo obtener el token de Spotify");
        return;
      }

      for (const disc of discs) {
        try {
          const query = encodeURIComponent(
            `album:${disc.name} artist:${disc.artist.name}`
          );
          const response = await axios.get(
            `https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.data.albums.items.length > 0) {
            const album = response.data.albums.items[0];
            disc.link = album.external_urls.spotify;
            disc.image = album.images?.[0]?.url || null;
            console.log("disc.image", disc.image);

            console.log("Datos enviados al backend:", {
              link: disc.link,
              image: disc.image,
            });

            await updateDisc(disc.id, {
              link: disc.link,
              image: disc.image,
              verified: true,
              genreId: disc.genreId ?? disc.genre?.id ?? null,
            });
          } else {
            disc.link = "No se encontró el álbum";
          }
        } catch (error) {
          console.error(`Error al buscar el álbum ${disc.name}:`, error);
          disc.link = "Error al realizar la búsqueda";
        }
      }
    };

    const exportarHtml = (group: any) => {
      const genreById = new Map(
        genres.value.map((g: any) => [String(g.id), g.name || "(Sin nombre)"])
      );

      let html = `
  <figure class="wp-block-table is-style-stripes">
    <table>
      <tbody>`;

      group.discs.forEach((disc: any) => {
        const genreName =
          genreById.get(String(disc.genreId ?? disc.genre?.id ?? "")) ||
          disc.genre?.name ||
          "Sin género";

        if (disc.link) {
          html += `
        <tr>
          <td class="has-text-align-left" data-align="left">${genreName}</td>
          <td><strong><a href="${disc.link}" target="_blank" rel="noreferrer noopener">${disc.artist.name} - ${disc.name}</a></strong></td>
        </tr>`;
        } else {
          html += `
        <tr>
          <td class="has-text-align-left" data-align="left">${genreName}</td>
          <td><strong>${disc.artist.name} - ${disc.name}</strong></td>
        </tr>`;
        }
      });

      html += `
      </tbody>
    </table>
  </figure>`;

      const blob = new Blob([html], { type: "text/html" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `discs_${group.releaseDate}.html`;
      link.click();
      URL.revokeObjectURL(link.href);
    };

    const resetAndFetch = () => {
      offset.value = 0;

      fetchDiscs();
    };

    watch(selectedYear, () => {
      selectMonth(0); // Cargar enero al cambiar el año
    });

    onMounted(() => {
      if (loadMore.value) observer.observe(loadMore.value);

      const d = initial.value;
      selectMonth(d ? d.getMonth() : new Date().getMonth());

    });

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchDiscs();
      }
    });

    return {
      groupedDiscs,
      groupState,
      genres: computed(() => catalogStore.genres),
      loadMore,
      loading,
      hasMore,
      buscarEnlacesSpotify,
      exportarHtml,
      toggleGroup,
      months,
      selectedMonth,
      selectMonth,
      formatDate,
      searchQuery,
      selectedGenre,
      selectedCountry,
      selectedWeek,
      resetAndFetch,
      filteredGroupedDiscs,
      countries: computed(() => catalogStore.countries),
      genreOptions,
      selectedYear,
      yearOptions,
      closing,
      focusDiscId,
      optionsReady,
    };
  },
});
</script>

<style scoped>
li {
  border-bottom: 1px solid #e2e8f0;
}

img {
  border-radius: 4px;
  object-fit: cover;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
