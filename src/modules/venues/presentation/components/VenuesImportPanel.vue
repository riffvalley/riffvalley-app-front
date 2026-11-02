<script setup lang="ts">
import { watch } from "vue";
import { useVenueImport } from "../../application/useVenueImport";
import VenueImportTable from "./VenueImportTable.vue";

const venueImport = useVenueImport();
const {
  countries,
  countriesQuery,
  countryId,
  regions,
  regionsQuery,
  regionId,
  localityName,
  province,
  rows,
  importing,
  localityError,
  localityNotice,
  importError,
  validationErrors,
  summary,
  hadImport,
  pasteNotice,
} = venueImport;

watch(countries, venueImport.setInitialCountry, { immediate: true });
</script>

<template>
  <section
    class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-rv-darkCard sm:p-6"
    aria-labelledby="venues-import-title"
  >
    <header class="mb-5">
      <h2 id="venues-import-title" class="text-lg font-semibold text-rv-navy dark:text-white">
        Importar salas
      </h2>
      <p class="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Selecciona la ubicación y añade los recintos. Puedes pegar una columna desde Excel o Google
        Sheets.
      </p>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div>
        <span
          id="venue-country-label"
          class="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-100"
          >País</span
        >
        <select
          id="venue-country"
          aria-labelledby="venue-country-label"
          :value="countryId"
          :disabled="countriesQuery.isLoading.value || countries.length === 0"
          :aria-invalid="Boolean(validationErrors.country) || undefined"
          aria-describedby="venue-country-help"
          class="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-wait disabled:opacity-70 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
          @change="venueImport.changeCountry(($event.target as HTMLSelectElement).value)"
        >
          <option value="">Selecciona un país</option>
          <option v-for="country in countries" :key="country.id" :value="country.id">
            {{ country.name }}
          </option>
        </select>
        <p v-if="validationErrors.country" class="mt-1 text-xs text-red-700 dark:text-red-300">
          {{ validationErrors.country }}
        </p>
        <p
          v-else-if="countriesQuery.isLoading.value"
          id="venue-country-help"
          class="mt-1 text-xs text-gray-600 dark:text-gray-300"
          role="status"
        >
          Cargando países…
        </p>
        <p
          v-else-if="countriesQuery.isError.value"
          id="venue-country-help"
          class="mt-1 text-xs text-red-700 dark:text-red-300"
          role="alert"
        >
          No se pudieron cargar los países.
          <button
            type="button"
            class="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple"
            @click="countriesQuery.refetch()"
          >
            Reintentar
          </button>
        </p>
        <p
          v-else-if="countries.length === 0"
          id="venue-country-help"
          class="mt-1 text-xs text-gray-600 dark:text-gray-300"
        >
          No hay países disponibles.
        </p>
        <span v-else id="venue-country-help" class="sr-only">País de la localidad</span>
      </div>

      <div>
        <span
          id="venue-region-label"
          class="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-100"
          >Comunidad o región</span
        >
        <select
          id="venue-region"
          aria-labelledby="venue-region-label"
          v-model="regionId"
          :disabled="!countryId || regionsQuery.isLoading.value || regions.length === 0"
          :aria-invalid="Boolean(validationErrors.region) || undefined"
          aria-describedby="venue-region-help"
          class="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
          @change="venueImport.changeRegion(($event.target as HTMLSelectElement).value)"
        >
          <option value="">Selecciona una región</option>
          <option v-for="region in regions" :key="region.id" :value="region.id">
            {{ region.name }}
          </option>
        </select>
        <p v-if="validationErrors.region" class="mt-1 text-xs text-red-700 dark:text-red-300">
          {{ validationErrors.region }}
        </p>
        <p
          v-else-if="regionsQuery.isLoading.value"
          id="venue-region-help"
          class="mt-1 text-xs text-gray-600 dark:text-gray-300"
          role="status"
        >
          Cargando regiones…
        </p>
        <p
          v-else-if="regionsQuery.isError.value"
          id="venue-region-help"
          class="mt-1 text-xs text-red-700 dark:text-red-300"
          role="alert"
        >
          No se pudieron cargar las regiones.
          <button
            type="button"
            class="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple"
            @click="regionsQuery.refetch()"
          >
            Reintentar
          </button>
        </p>
        <p
          v-else-if="countryId && regions.length === 0"
          id="venue-region-help"
          class="mt-1 text-xs text-gray-600 dark:text-gray-300"
        >
          Este país aún no tiene regiones en el catálogo.
        </p>
        <span v-else id="venue-region-help" class="sr-only"
          >Región administrativa de la localidad</span
        >
      </div>

      <div>
        <span
          id="venue-locality-label"
          class="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-100"
          >Localidad</span
        >
        <input
          id="venue-locality"
          aria-labelledby="venue-locality-label"
          v-model="localityName"
          type="text"
          maxlength="150"
          autocomplete="address-level2"
          placeholder="Bilbao"
          :aria-invalid="Boolean(validationErrors.locality || localityError) || undefined"
          aria-describedby="venue-locality-help"
          class="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white dark:placeholder:text-gray-400"
          @input="venueImport.localityChanged()"
        />
        <p v-if="validationErrors.locality" class="mt-1 text-xs text-red-700 dark:text-red-300">
          {{ validationErrors.locality }}
        </p>
        <p
          v-else-if="localityError"
          id="venue-locality-help"
          class="mt-1 text-xs text-red-700 dark:text-red-300"
          role="alert"
        >
          {{ localityError }}
        </p>
        <p v-else id="venue-locality-help" class="mt-1 text-xs text-gray-600 dark:text-gray-300">
          Puede ser una localidad nueva o ya existente.
        </p>
      </div>

      <div>
        <span
          id="venue-province-label"
          class="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-100"
          >Provincia
          <span class="font-normal text-gray-500 dark:text-gray-400">(opcional)</span></span
        >
        <input
          id="venue-province"
          aria-labelledby="venue-province-label"
          v-model="province"
          type="text"
          maxlength="150"
          autocomplete="address-level1"
          placeholder="Bizkaia"
          :aria-invalid="Boolean(validationErrors.province) || undefined"
          aria-describedby="venue-province-help"
          class="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white dark:placeholder:text-gray-400"
          @input="venueImport.provinceChanged()"
        />
        <p v-if="validationErrors.province" class="mt-1 text-xs text-red-700 dark:text-red-300">
          {{ validationErrors.province }}
        </p>
        <span v-else id="venue-province-help" class="sr-only"
          >Ayuda a diferenciar localidades con el mismo nombre</span
        >
      </div>
    </div>

    <p
      v-if="localityNotice"
      class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
      role="status"
    >
      {{ localityNotice }}
    </p>

    <section class="mt-6" aria-labelledby="venue-rows-title">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="venue-rows-title" class="font-semibold text-rv-navy dark:text-white">
            Salas y recintos
          </h3>
          <p class="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
            {{ rows.length }} {{ rows.length === 1 ? "fila" : "filas" }} · Se ignoran las filas
            vacías.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-rv-navy transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          @click="venueImport.addRow()"
        >
          <i class="fa-solid fa-plus text-xs" aria-hidden="true"></i>Añadir fila
        </button>
      </div>

      <VenueImportTable
        :rows="rows"
        :importing="importing"
        @update-name="venueImport.updateName"
        @update-type="venueImport.updateType"
        @update-locality="venueImport.updateLocality"
        @paste-names="venueImport.pasteNames"
        @remove-row="venueImport.removeRow"
      />
      <p v-if="pasteNotice" class="mt-2 text-sm text-amber-800 dark:text-amber-200" role="status">
        {{ pasteNotice }}
      </p>
    </section>

    <div
      class="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="text-sm text-gray-600 dark:text-gray-300" aria-live="polite" aria-atomic="true">
        <template v-if="hadImport">
          <span>{{ summary.created }} creadas</span><span class="mx-1.5">·</span>
          <span>{{ summary.existing }} ya existentes</span><span class="mx-1.5">·</span>
          <span>{{ summary.duplicates }} duplicadas</span><span class="mx-1.5">·</span>
          <span>{{ summary.failed }} fallidas</span>
        </template>
        <span v-else>Se pueden importar más de 100 salas; se enviarán en lotes.</span>
      </div>
      <button
        type="button"
        :disabled="importing"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-rv-navy px-5 text-sm font-semibold text-white transition hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-wait disabled:opacity-70 dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-white"
        @click="venueImport.importRows()"
      >
        <i v-if="importing" class="fa-solid fa-spinner animate-spin text-xs" aria-hidden="true"></i>
        <i v-else class="fa-solid fa-upload text-xs" aria-hidden="true"></i>
        {{ importing ? "Importando…" : "Importar salas" }}
      </button>
    </div>
    <p v-if="importing" class="sr-only" role="status">Importación en curso</p>
    <p
      v-if="importError"
      class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200"
      role="alert"
    >
      {{ importError }}
    </p>
  </section>
</template>
