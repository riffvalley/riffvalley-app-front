<template>
  <div
    class="mb-4 gap-0 filters-pills"
    :class="[
      wrapperClass,
      externalRow1 ? 'contents' : 'flex flex-col'
    ]"
  >
    <!-- Fila 1: Buscar + País + Género -->
    <div v-if="externalRow1" class="contents">
      <input
        v-if="showSearchQuery"
        v-model="searchQuery"
        type="text"
        placeholder="Buscar álbum o artista..."
        class="pill-control w-full min-w-0"
      />

      <SearchableSelect
        v-if="showCountryFilter"
        v-model="selectedCountry"
        :options="countries"
        placeholder="Buscar país..."
        triggerPlaceholder="Selecciona un país"
        allLabel="Todos los países"
        title="name"
        trackby="id"
        :max="150"
        class="select-pill w-full min-w-0"
        :class="selectClass"
      />

      <SearchableSelect
        v-model="selectedGenre"
        :options="genres"
        placeholder="Selecciona un género"
        title="name"
        trackby="id"
        :max="150"
        class="select-pill w-full min-w-0"
        :class="selectClass"
      />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-2">
      <input
        v-if="showSearchQuery"
        v-model="searchQuery"
        type="text"
        placeholder="Buscar álbum o artista..."
        class="pill-control"
      />

      <SearchableSelect
        v-if="showCountryFilter"
        v-model="selectedCountry"
        :options="countries"
        placeholder="Buscar país..."
        triggerPlaceholder="Selecciona un país"
        allLabel="Todos los países"
        title="name"
        trackby="id"
        :max="150"
        class="select-pill w-full"
        :class="selectClass"
      />

      <SearchableSelect
        v-model="selectedGenre"
        :options="genres"
        placeholder="Selecciona un género"
        title="name"
        trackby="id"
        :max="150"
        class="select-pill w-full"
        :class="selectClass"
      />
    </div>

    <!-- Fila 2: Año / Mes / Semana (vuelve a estar donde estaba) -->
    <div
      v-if="showWeekPicker"
      class="mt-4 mb-2"
      :class="externalRow1 ? 'col-span-full' : ''"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        <!-- AÑO -->
        <SimpleSelect
          class="select-pill w-full"
          :options="yearsOptions"
          v-model="weeksYear"
          :group-label="weeksYear === 0 ? 'Año – Todos' : `Año – ${weeksYear}`"
          placeholder="Año"
        />

        <!-- MES -->
        <SimpleSelect
          v-if="weeksYear !== 0"
          class="select-pill w-full"
          :options="monthsOptions"
          v-model="weeksMonth"
          placeholder="Mes"
        />

        <!-- SEMANAS -->
        <SimpleSelect
          v-if="weeksYear !== 0 && weeksMonth"
          class="select-pill w-full"
          :options="periodOptions"
          v-model="selectedPeriodKey"
          :group-label="`Semanas – ${monthNames[weeksMonth - 1]} ${weeksYear}`"
          placeholder="Semana"
        />
      </div>
    </div>
  </div>
</template>



<script lang="ts">
import { defineComponent, ref, watch, computed } from "vue";
import SearchableSelect from "@components/SearchableSelect.vue";
import SimpleSelect from '@components/SimpleSelect.vue';
import { MONTHS, getAvailableYears } from '@helpers/dateConstants';

type RangeTuple = [string, string];
type Option = { key: string; label: string; start: string; end: string };

export default defineComponent({
  components: { SearchableSelect, SimpleSelect, },
  props: {
    searchQuery: { type: String, default: "" },
    selectedGenre: { type: String, default: "" },
    selectedCountry: { type: String, default: "" },
    selectedWeek: { type: Array, default: null },
    genres: { type: Array, default: () => [] },
    countries: { type: Array, default: () => [] },

    selectClass: { type: String, default: "" },
    triggerHeight: { type: [Number, String], default: 36 },
    wrapperClass: { type: String, default: "" },

    showWeekPicker: { type: Boolean, default: true },
    showSearchQuery: { type: Boolean, default: true },
    showCountryFilter: { type: Boolean, default: true },
    externalRow1: { type: Boolean, default: false },

  },
  emits: ["update:searchQuery", "update:selectedGenre", "update:selectedCountry", "update:selectedWeek", "resetAndFetch"],
  setup(props, { emit }) {
    const searchQuery = ref(props.searchQuery);
    const selectedGenre = ref(props.selectedGenre);
    const selectedCountry = ref(props.selectedCountry);
    watch(searchQuery, (v) => emit("update:searchQuery", v));
    watch(selectedGenre, (v) => emit("update:selectedGenre", v));
    watch(selectedCountry, (v) => emit("update:selectedCountry", v));

    // Estado base
    const today = new Date();
    // Por defecto: AÑO COMPLETO (weeksMonth = 0)
    const weeksMonth = ref<number>(0);
    const weeksYear = ref<number>(new Date().getFullYear()); // 2025 ahora

    const monthNames = MONTHS;
    const availableYears = getAvailableYears();

    // Utils UTC
    const isoStartUTC = (d: Date) => {
      const x = new Date(d);
      x.setUTCHours(0, 0, 0, 0);
      return x.toISOString();
    };
    const isoEndUTC = (d: Date) => {
      const x = new Date(d);
      x.setUTCHours(23, 59, 59, 999);
      return x.toISOString();
    };

    // Año completo
    const yearOption = computed<Option>(() => {
      const y = Number(weeksYear.value);
      return {
        key: `Y-${y}`,
        label: `Año completo`,
        start: isoStartUTC(new Date(Date.UTC(y, 0, 1))),
        end: isoEndUTC(new Date(Date.UTC(y, 11, 31))),
      };
    });

    const monthsOptions = computed(() => [
      { value: 0, label: 'Año completo' },
      ...monthNames.map((label, i) => ({ value: i + 1, label }))
    ]);

    const yearsOptions = computed(() => [
      { value: 0, label: "Todos los años" },
      ...availableYears.map(y => ({ value: y, label: String(y) })),
    ]);

    const periodOptions = computed(() => {
      if (!weeksMonth.value || !weeksYear.value) return [];
      // Primero “Mes completo”
      const base = [{ value: monthOption.value.key, label: 'Mes completo' }];
      // Luego semanas
      const weeks = weekOptions.value.map(w => ({ value: w.key, label: w.label }));
      return [...base, ...weeks];
    });


    // Mes completo
    const monthOption = computed<Option>(() => {
      const y = Number(weeksYear.value), m = Math.max(0, Number(weeksMonth.value) - 1);
      const start = isoStartUTC(new Date(Date.UTC(y, m, 1)));
      const end = isoEndUTC(new Date(Date.UTC(y, m + 1, 0)));
      return { key: `M-${y}-${m + 1}`, label: "Mes completo", start, end };
    });

    // Semanas viernes→jueves
    const weekOptions = computed<Option[]>(() => {
      if (!weeksMonth.value || !weeksYear.value) return [];
      const y = Number(weeksYear.value), m = Number(weeksMonth.value) - 1;

      const first = new Date(Date.UTC(y, m, 1));
      let d = new Date(first);
      const add = (date: Date, days: number) => {
        const n = new Date(date); n.setUTCDate(n.getUTCDate() + days); return n;
      };
      const day = d.getUTCDay(); // 0..6
      const toFriday = day <= 5 ? 5 - day : 7 - (day - 5);
      d = add(d, toFriday);

      const opts: Option[] = [];
      const monthEnd = new Date(Date.UTC(y, m + 1, 0));

      const short = (date: Date) =>
        `${String(date.getUTCDate()).padStart(2, "0")} ${monthNames[date.getUTCMonth()].slice(0, 3)}`;

      while (d.getUTCMonth() === m) {
        const start = isoStartUTC(d);
        const endThurs = add(d, 6);
        const end = isoEndUTC(endThurs);
        opts.push({ key: `W-${d.toISOString().slice(0, 10)}`, label: `${short(d)} – ${short(endThurs)}`, start, end });
        d = add(d, 7);
        if (d > add(monthEnd, 7)) break;
      }
      return opts;
    });

    const selectedPeriodKey = ref<string | null>(null);

    // Emitir según selección
    const emitYear = () => emit("update:selectedWeek", [yearOption.value.start, yearOption.value.end] as RangeTuple);
    const emitMonth = () => emit("update:selectedWeek", [monthOption.value.start, monthOption.value.end] as RangeTuple);

    // Si cambia mes/año:
    watch([weeksMonth, weeksYear], () => {
      // 1) TODOS LOS AÑOS
      if (weeksYear.value === 0) {
        // cerrar/resetear mes y semana
        weeksMonth.value = 0;
        selectedPeriodKey.value = null;

        // 2) emitir "sin filtro"
        emit("update:selectedWeek", null);
        return;
      }

      // 2) Año concreto (comportamiento normal)
      if (weeksMonth.value === 0) {
        selectedPeriodKey.value = null;
        emitYear();     // rango año completo de ese año
      } else {
        selectedPeriodKey.value = monthOption.value.key;
        emitMonth();    // rango mes completo
      }
    }, { immediate: true });

    // Cuando cambia el select de "Periodo"
    watch(selectedPeriodKey, (k) => {
      if (!k) return;
      const all = [monthOption.value, ...weekOptions.value];
      const picked = all.find(o => o.key === k);
      if (!picked) return;
      emit("update:selectedWeek", [picked.start, picked.end] as RangeTuple);
    });

    return {
      searchQuery,
      selectedGenre,
      selectedCountry,
      weeksMonth,
      weeksYear,
      monthNames,
      availableYears,
      selectedPeriodKey,
      weekOptions,
      monthOption,
      monthsOptions,
      yearsOptions,
      periodOptions,
    };
  },
});
</script>

<style scoped>
/* --- layout menores que ya tenías --- */
.flex-[2] {
  display: flex;
  align-items: center;
  justify-content: start;
}

/* Z-index del menú del SearchableSelect */
:deep(.select-pill .dropdown-panel),
:deep(.select-pill .search__menu),
:deep(.select-pill .options),
:deep(.select-pill .menu) {
  z-index: 9999 !important;
  position: absolute;
}

.filters-pills {
  /* ajusta aquí para compactar o expandir */
  --pill-h: 2.25rem;
  /* 2.75rem si la quieres más alta, 2.25rem más compacta */
  --pill-lh: 2.5rem;
  /* igual a la altura para centrar el texto */
  --pill-pl: 1.0rem;
  /* padding-left */
  --pill-pr: 1.0rem;
  /* padding-right (sube si la flecha pisa el texto) */
  --pill-radius: 9999px;
  --pill-border: 1px solid rgb(229 231 235);
  /* border-gray-200 */
  --pill-shadow: 0 1px 3px rgba(0, 0, 0, .08), 0 1px 2px rgba(0, 0, 0, .06);
  --pill-bg: #fff;
  --pill-ring: 2px solid rgba(209, 213, 219, .8);
  /* ring-gray-300 */
}

/* Base común para input + select nativo */
.pill-control {
  width: 100%;
  height: var(--pill-h);
  line-height: var(--pill-lh);
  padding-left: var(--pill-pl);
  padding-right: var(--pill-pr);
  border-radius: var(--pill-radius);
  border: var(--pill-border);
  background: var(--pill-bg);
  box-shadow: var(--pill-shadow);

  outline: none;
}

.pill-control:focus {
  box-shadow: var(--pill-shadow);
  outline: var(--pill-ring);
}

/* SearchableSelect: aplicamos exactamente lo mismo al trigger */
:deep(.select-pill .search_input_trigger) {
  width: 100%;
  height: var(--pill-h);
  line-height: var(--pill-lh);
  padding-left: calc(var(--pill-pl) + 0.5rem);
  /* un poco más si el icono va dentro */
  padding-right: var(--pill-pr);
  border-radius: var(--pill-radius);
  border: var(--pill-border);
  background: var(--pill-bg);
  box-shadow: var(--pill-shadow);
  position: relative;
}

:deep(.select-pill .search_input_trigger:focus) {
  outline: var(--pill-ring);
}

:deep(.select-pill .search__input) {
  padding-left: 0;
}

/* ya damos PL en el trigger */
:deep(.select-pill .search_input_trigger svg) {
  right: .75rem;
}
</style>
