<template>
  <div class="max-w-7xl mx-auto mt-10 px-4 sm:px-6 lg:px-8">
<template v-if="!embedded">
  <h1 class="text-2xl md:text-3xl font-bold mb-2 text-center text-rv-navy dark:text-white">
    <i class="fa-solid fa-calendar-days mr-3"></i>Calendario
  </h1>
  <p class="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">Todos los lanzamientos ordenados por fecha.</p>
</template>

    <!-- FILTROS SUPERIORES -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start mb-6">
      <DiscFilters :externalRow1="true" :searchQuery="searchQuery" :selectedGenre="selectedGenre"
        :selectedCountry="selectedCountry" :genres="genreOptions" :countries="countries" :showWeekPicker="false"
        :showCountryFilter="true" @update:searchQuery="searchQuery = $event"
        @update:selectedGenre="selectedGenre = $event" @update:selectedCountry="selectedCountry = $event"
        selectClass="w-full min-w-0" @reset-and-fetch="resetAndFetch" />

      <SimpleSelect v-model="selectedYear" :options="yearOptions" placeholder="Año" class="w-full min-w-0" />
    </div>


    <div>
      <div class="flex flex-wrap justify-center gap-2 mb-6 mt-6 py-1">
        <button v-for="(month, index) in months" :key="index" @click="selectMonth(index)"
          class="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shadow-md
                 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0
                 focus:outline-none focus:ring-0 focus:ring-offset-0"
          :class="selectedMonth === index
            ? 'bg-rv-navy dark:bg-rv-purple text-white hover:opacity-80 hover:shadow-lg'
            : 'bg-gray-200 dark:bg-rv-darkSurface text-rv-navy dark:text-white hover:bg-rv-navy hover:text-white dark:hover:bg-rv-purple hover:shadow-lg'">
          {{ month }}
        </button>
      </div>

      <!-- Lista de discos agrupados (resto del template) -->
      <div v-for="(group, index) in filteredGroupedDiscs" :key="group.releaseDate" class="mb-8">
        <div class="group flex justify-between items-center px-5 py-3 rounded-2xl cursor-pointer
                    transition-all duration-200 shadow-sm border border-gray-100 dark:border-white/10
                    hover:-translate-y-0.5 hover:shadow-md"
             :class="(groupState[index] || closing[index])
               ? 'bg-rv-navy dark:bg-rv-purple shadow-md -translate-y-0.5'
               : 'bg-white dark:bg-rv-darkSurface hover:bg-rv-navy dark:hover:bg-rv-purple'"
             @click="toggleGroup(index)">

          <!-- Fecha + conteo -->
          <div class="flex items-center gap-3 min-w-0">
            <h3 class="text-base sm:text-lg font-bold transition-colors duration-200 truncate"
                :class="(groupState[index] || closing[index]) ? 'text-white' : 'text-rv-navy dark:text-white group-hover:text-white'">
              {{ formatDate(group.releaseDate) }}
            </h3>
            <span class="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors"
                  :class="(groupState[index] || closing[index])
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 group-hover:bg-white/20 group-hover:text-white'">
              {{ group.discs.length }} disco{{ group.discs.length !== 1 ? 's' : '' }}
            </span>
          </div>

          <button class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                         bg-rv-pink text-white transition-all focus:outline-none focus:ring-0">
            <i class="fas fa-chevron-down text-xs transition-transform duration-200"
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
              <button v-if="isSuperUser" @click="buscarImagenesLastFm(group.releaseDate)"
                class="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold
                       hover:bg-red-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] active:translate-y-0
                       w-full max-w-[300px] sm:max-w-none sm:w-auto justify-center self-center shadow-md">
                <i class="fa-brands fa-lastfm"></i> Last.fm búsqueda
              </button>

              <button v-if="new Date(group.releaseDate) < new Date()" @click="buscarEnlacesSpotify(group.discs)"
                class="inline-flex items-center gap-2 bg-[#1DB954] text-white px-4 py-2 rounded-full text-sm font-semibold
                       hover:bg-[#1aa34a] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] active:translate-y-0
                       w-full max-w-[300px] sm:max-w-none sm:w-auto justify-center self-center shadow-md">
                <i class="fa-brands fa-spotify"></i> Buscar en Spotify
              </button>

              <button @click="exportarHtml(group)"
                class="inline-flex items-center gap-2 bg-rv-navy dark:bg-rv-purple text-white px-4 py-2 rounded-full text-sm font-semibold
                       hover:opacity-80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] active:translate-y-0
                       w-full max-w-[300px] sm:max-w-none sm:w-auto justify-center self-center shadow-md">
                <i class="fa-solid fa-code"></i> Exportar HTML
              </button>
            </div>

            <div v-if="optionsReady">
              <ul class="w-full mt-3 flex flex-col gap-3">
                <li v-for="disc in group.discs" :key="disc.id">
                  <div :id="`disc-${disc.id}`">
                    <DiscComponent :disc="disc" :genres="genres" :countries="countries" :focusDiscId="focusDiscId"
                      @disc-deleted="removeDisc" @date-changed="handleDateChange" />
                  </div>
                </li>
              </ul>
            </div>
            <div v-else class="text-center text-gray-500 dark:text-gray-300 py-6">
              Cargando géneros y países…
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>

  <!-- Cargar más -->
  <div ref="loadMore" class="flex flex-col items-center justify-center gap-3 py-6">
    <i v-if="loading" class="fa-solid fa-compact-disc animate-spin text-rv-pink text-3xl"></i>
    <span v-if="loading" class="text-sm font-medium text-rv-navy dark:text-white">Cargando discos...</span>
  </div>

  <!-- Botón scroll-to-top -->
  <Transition name="scroll-top-fade">
    <button
      v-if="showScrollTop"
      @click="scrollToTop"
      class="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-rv-pink hover:opacity-80 text-white shadow-lg flex items-center justify-center"
      title="Volver arriba"
    >
      <i class="fa-solid fa-chevron-up text-sm"></i>
    </button>
  </Transition>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
  reactive,
  computed,
  nextTick,
  watch,
  toRef,
} from "vue";
import axios from "axios";
import { updateDisc, deleteDisc, getDiscsDated } from "@services/discs/discs";
import { fillImages } from "@services/lastfm/lastfm.ts";
import DiscComponent from "./components/DiscComponent.vue";
import { useCatalogStore } from "@stores/catalog/catalog";
import { MONTHS, getYearOptions } from "@helpers/dateConstants";
import { obtenerTokenSpotify } from "@helpers/SpotifyFunctions.ts";
import DiscFilters from "@components/DiscFilters.vue";
import SimpleSelect from "@components/SimpleSelect.vue";
import { useAuthStore } from "@stores/auth/auth";

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
    const authStore = useAuthStore();
    const isSuperUser = computed(() => authStore.hasRole("superUser"));
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

    let fetchGen = 0; // generación activa — se incrementa en cada selectMonth

    const fetchAllPagesForMonth = async (gen: number) => {
      try {
        if (loadMore.value) observer.unobserve(loadMore.value);
      } catch { }

      while (hasMore.value) {
        if (gen !== fetchGen) return; // generación obsoleta: abortar
        await fetchDiscs(gen);
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
      const gen = ++fetchGen; // nueva generación: invalida cualquier fetch anterior

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
      hasMore.value = true;
      loading.value = false;

      await fetchDiscsByDateRange(startDate, endDate, gen);
      if (gen !== fetchGen) return;
      await fetchAllPagesForMonth(gen);
      if (gen !== fetchGen) return;
      await focusAndScrollToDisc();
    };

    const fetchDiscsByDateRange = async (
      startDate: string,
      endDate: string,
      gen: number
    ) => {
      loading.value = true;
      try {
        const response = await getDiscsDated(limit.value, offset.value, [
          startDate,
          endDate,
        ], selectedCountry.value || undefined);

        if (gen !== fetchGen) return; // resultado obsoleto: descartar

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


    const fetchDiscs = async (gen?: number) => {
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
        ], selectedCountry.value || undefined);

        if (gen !== undefined && gen !== fetchGen) return; // resultado obsoleto: descartar

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
        if (gen === undefined || gen === fetchGen) {
          loading.value = false;
          await nextTick();
          checkIfNeedsMore();
        }
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

    const buscarImagenesLastFm = async (releaseDate: string) => {
      const date = new Date(releaseDate);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const week = Math.ceil(date.getDate() / 7);
      await fillImages(month, year, week);
    };

    const resetAndFetch = () => {
      offset.value = 0;

      fetchDiscs();
    };

    watch(selectedYear, () => {
      selectMonth(0);
    });

    watch(selectedCountry, () => {
      selectMonth(selectedMonth.value);
    });

    // --- Scroll to top ---
    const showScrollTop = ref(false);
    const handleScroll = () => { showScrollTop.value = window.scrollY > 400; };
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    onMounted(() => {
      if (loadMore.value) observer.observe(loadMore.value);

      const d = initial.value;
      selectMonth(d ? d.getMonth() : new Date().getMonth());

      window.addEventListener("scroll", handleScroll, { passive: true });
    });

    onUnmounted(() => window.removeEventListener("scroll", handleScroll));

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchDiscs();
      }
    });

    const removeDisc = (discId: string) => {
      for (let i = groupedDiscs.value.length - 1; i >= 0; i--) {
        const group = groupedDiscs.value[i];
        const idx = group.discs.findIndex((d: any) => d.id === discId);
        if (idx !== -1) {
          group.discs.splice(idx, 1);
          if (group.discs.length === 0) {
            groupedDiscs.value.splice(i, 1);
          }
          break;
        }
      }
    };

    const handleDateChange = (discId: string, newDate: string) => {
      // Remueve el disco del grupo actual; se reubicará en el próximo fetch
      removeDisc(discId);
    };

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
      removeDisc,
      handleDateChange,
      isSuperUser,
      buscarImagenesLastFm,
      showScrollTop,
      scrollToTop,
    };
  },
});
</script>

<style scoped>
.scroll-top-fade-enter-active,
.scroll-top-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.scroll-top-fade-enter-from,
.scroll-top-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
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
