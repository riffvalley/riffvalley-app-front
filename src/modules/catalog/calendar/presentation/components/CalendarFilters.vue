<template>
  <!-- Filtros del calendario con el mismo diseño que Discos.
       Fila 1: buscador + año. Fila 2: país + género. Lo usan los dos calendarios. -->
  <div class="mb-6 flex flex-col gap-3" data-test="calendar-filters">
    <div class="grid grid-cols-[minmax(0,1fr)_6rem] gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
      <div class="relative min-w-0">
        <i
          class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300"
          aria-hidden="true"
        ></i>
        <input
          :value="searchQuery"
          type="search"
          autocomplete="off"
          aria-label="Buscar discos o artistas"
          placeholder="Buscar..."
          class="h-[50px] w-full rounded-2xl border border-gray-300 bg-white pl-11 pr-4 text-base text-rv-navy shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy dark:border-white/20 dark:bg-rv-darkCard dark:text-white dark:placeholder:text-gray-300 dark:focus-visible:ring-gray-200"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="relative min-w-0">
        <select
          :value="year"
          aria-label="Año"
          class="h-[50px] w-full cursor-pointer appearance-none rounded-2xl border border-gray-300 bg-white pl-4 pr-10 text-base text-rv-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy dark:border-white/20 dark:bg-rv-darkCard dark:text-white dark:focus-visible:ring-gray-200"
          @change="emit('update:year', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="option in yearOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <i
          class="fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-300"
          aria-hidden="true"
        ></i>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div class="min-w-0" data-test="calendar-country">
        <DiscListCountrySelect
          :model-value="country"
          :options="countries"
          @update:model-value="emit('update:country', $event)"
        />
      </div>
      <div class="min-w-0" data-test="calendar-genre">
        <!-- El calendario filtra por un género: mismo selector que Discos, en modo de uno. -->
        <DiscListGenreSelect
          :model-value="genre ? [genre] : []"
          :options="genres"
          :multiple="false"
          @update:model-value="onGenreChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DiscListCountrySelect, DiscListGenreSelect } from "@/modules/catalog/discs";

interface Option {
  id: string;
  name: string;
}

const props = defineProps<{
  searchQuery: string;
  year: number;
  yearOptions: { value: number; label: string }[];
  country: string;
  countries: Option[];
  genre: string;
  genres: (Option & { color?: string | null })[];
}>();

const emit = defineEmits<{
  "update:searchQuery": [value: string];
  "update:year": [value: number];
  "update:country": [value: string];
  "update:genre": [value: string];
}>();

/** El selector trabaja en minúsculas: se devuelve el id tal como viene del servidor. */
function onGenreChange(ids: string[]): void {
  const id = ids[0] ?? "";
  emit("update:genre", props.genres.find((genre) => genre.id.toLowerCase() === id)?.id ?? id);
}
</script>
