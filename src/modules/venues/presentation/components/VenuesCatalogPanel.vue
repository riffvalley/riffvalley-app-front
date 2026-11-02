<script setup lang="ts">
import { computed, nextTick, shallowRef, watch } from "vue";
import axios from "axios";
import SwalService from "@/services/swal/SwalService";
import { useAuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";
import { venueTypes } from "../../application/useVenueImport";
import { useVenueCatalog } from "../../application/useVenueCatalog";
import {
  VENUE_STATUSES,
  type UpdateVenueCatalogPayload,
  type VenueCatalogVenue,
} from "../../types/venueCatalog";
import VenueCatalogTable from "./VenueCatalogTable.vue";
import VenueEditDialog from "./VenueEditDialog.vue";

const catalog = useVenueCatalog();
const auth = useAuthStore();
const canManage = computed(() => hasMinimumRole(auth.role, "riffvalley"));
const editingVenue = shallowRef<VenueCatalogVenue | null>(null);
const editOpener = shallowRef<HTMLElement | null>(null);
const editError = shallowRef("");
const actionNotice = shallowRef("");
const deletingId = shallowRef<string | null>(null);
const errorMessage = computed(() => {
  const error = catalog.catalogQuery.error.value;
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(" ");
    if (message) return message;
  }
  return "No se pudo cargar el catálogo. Comprueba la conexión e inténtalo de nuevo.";
});
const pageData = computed(() => catalog.catalogQuery.data.value);
const venues = computed(() => pageData.value?.data ?? []);
const hasFilters = computed(() => Object.values(catalog.filters.value).some(Boolean));
const firstItem = computed(() => (pageData.value?.totalItems ? catalog.offset.value + 1 : 0));
const lastItem = computed(() =>
  pageData.value?.totalItems
    ? Math.min(catalog.offset.value + venues.value.length, pageData.value.totalItems)
    : catalog.offset.value + venues.value.length
);

function beginEdit(venue: VenueCatalogVenue) {
  editOpener.value = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  editError.value = "";
  actionNotice.value = "";
  editingVenue.value = venue;
}

watch(editingVenue, async (venue) => {
  if (venue) return;
  await nextTick();
  editOpener.value?.focus();
  editOpener.value = null;
});

async function saveVenue(payload: UpdateVenueCatalogPayload) {
  if (!editingVenue.value || !canManage.value) return;
  try {
    await catalog.updateMutation.mutateAsync({ id: editingVenue.value.id, payload });
    editingVenue.value = null;
    actionNotice.value = "Los cambios del recinto se han guardado.";
  } catch {
    editError.value = "No se pudieron guardar los cambios. Revisa el nombre e inténtalo de nuevo.";
  }
}

async function removeVenue(venue: VenueCatalogVenue) {
  if (!canManage.value || deletingId.value) return;
  const confirmation = await SwalService.confirm(
    "¿Eliminar este recinto?",
    `Se eliminará «${venue.name}». Esta acción no se puede deshacer.`,
    "Sí, eliminar",
    "Cancelar"
  );
  if (!confirmation.isConfirmed || !canManage.value) return;

  deletingId.value = venue.id;
  actionNotice.value = "";
  try {
    await catalog.deleteMutation.mutateAsync(venue.id);
    actionNotice.value = `Se ha eliminado «${venue.name}».`;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 409 || status === 400 || status === 500) {
      actionNotice.value = `No se pudo eliminar «${venue.name}». Puede tener datos relacionados que deban conservarse; la fila sigue en el catálogo.`;
    } else {
      actionNotice.value = `No se pudo eliminar «${venue.name}». La fila sigue en el catálogo. Inténtalo de nuevo.`;
    }
  } finally {
    deletingId.value = null;
  }
}

function setFilter(key: "query" | "type" | "status" | "localityId", value: string) {
  catalog.updateFilter(key, value as never);
}

function retryOptions(query: { refetch: () => unknown }) {
  void query.refetch();
}
</script>

<template>
  <section
    class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-rv-darkCard sm:p-5"
    aria-labelledby="venues-catalog-title"
  >
    <header class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="venues-catalog-title" class="text-lg font-semibold text-rv-navy dark:text-white">
          Catálogo
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Busca y gestiona los recintos registrados.
        </p>
      </div>
      <p
        v-if="pageData?.totalItems !== undefined"
        class="text-sm text-gray-600 dark:text-gray-300"
        aria-live="polite"
      >
        {{ pageData.totalItems }} {{ pageData.totalItems === 1 ? "recinto" : "recintos" }}
      </p>
    </header>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div>
        <label
          for="venue-filter-query"
          class="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-200"
          >Nombre del recinto
          <input
            id="venue-filter-query"
            type="search"
            :value="catalog.filters.query"
            maxlength="180"
            placeholder="Buscar por nombre"
            class="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white dark:placeholder:text-gray-400"
            @input="setFilter('query', ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
      <div>
        <label
          for="venue-filter-country"
          class="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-200"
          >País
          <select
            id="venue-filter-country"
            :value="catalog.filters.countryId"
            :disabled="
              catalog.countriesQuery.isLoading.value || catalog.countriesQuery.isError.value
            "
            class="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:opacity-60 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
            @change="catalog.changeCountry(($event.target as HTMLSelectElement).value)"
          >
            <option value="">Todos los países</option>
            <option
              v-for="country in catalog.countriesQuery.data.value ?? []"
              :key="country.id"
              :value="country.id"
            >
              {{ country.name }}
            </option>
          </select>
        </label>
      </div>
      <div>
        <label
          for="venue-filter-region"
          class="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-200"
          >Comunidad o región
          <select
            id="venue-filter-region"
            :value="catalog.filters.administrativeRegionId"
            :disabled="
              !catalog.filters.countryId ||
              catalog.regionsQuery.isLoading.value ||
              catalog.regionsQuery.isError.value
            "
            class="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:opacity-60 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
            @change="catalog.changeRegion(($event.target as HTMLSelectElement).value)"
          >
            <option value="">Todas las regiones</option>
            <option
              v-for="region in catalog.regionsQuery.data.value ?? []"
              :key="region.id"
              :value="region.id"
            >
              {{ region.name }}
            </option>
          </select>
        </label>
        <p
          v-if="catalog.regionsQuery.isError.value"
          class="mt-1 text-xs text-red-700 dark:text-red-300"
          role="alert"
        >
          No se pudieron cargar las regiones.
          <button
            type="button"
            class="font-semibold underline"
            @click="retryOptions(catalog.regionsQuery)"
          >
            Reintentar
          </button>
        </p>
      </div>
      <div>
        <label
          for="venue-filter-locality"
          class="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-200"
          >Localidad
          <select
            id="venue-filter-locality"
            :value="catalog.filters.localityId"
            :disabled="
              !catalog.filters.administrativeRegionId ||
              catalog.localitiesQuery.isLoading.value ||
              catalog.localitiesQuery.isError.value
            "
            class="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:opacity-60 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
            @change="setFilter('localityId', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Todas las localidades</option>
            <option
              v-for="locality in catalog.localitiesQuery.data.value ?? []"
              :key="locality.id"
              :value="locality.id"
            >
              {{ locality.name }}
            </option>
          </select>
        </label>
        <p
          v-if="catalog.localitiesQuery.isLoading.value"
          class="mt-1 text-xs text-gray-600 dark:text-gray-300"
          role="status"
        >
          Cargando localidades…
        </p>
        <p
          v-else-if="catalog.localitiesQuery.isError.value"
          class="mt-1 text-xs text-red-700 dark:text-red-300"
          role="alert"
        >
          No se pudieron cargar las localidades.
          <button
            type="button"
            class="font-semibold underline"
            @click="retryOptions(catalog.localitiesQuery)"
          >
            Reintentar
          </button>
        </p>
      </div>
      <div>
        <label
          for="venue-filter-type"
          class="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-200"
          >Tipo
          <select
            id="venue-filter-type"
            :value="catalog.filters.type"
            class="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
            @change="setFilter('type', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Todos los tipos</option>
            <option v-for="type in venueTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </label>
      </div>
      <div>
        <label
          for="venue-filter-status"
          class="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-200"
          >Estado
          <select
            id="venue-filter-status"
            :value="catalog.filters.status"
            class="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
            @change="setFilter('status', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Todos los estados</option>
            <option v-for="status in VENUE_STATUSES" :key="status" :value="status">
              {{ status === "active" ? "Activa" : status === "closed" ? "Cerrada" : "Temporal" }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <p
      v-if="actionNotice"
      class="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-white/10 dark:bg-rv-darkSurface dark:text-gray-100"
      role="status"
    >
      {{ actionNotice }}
    </p>
    <div
      v-if="catalog.countriesQuery.isError.value"
      class="mb-3 text-sm text-red-700 dark:text-red-300"
      role="alert"
    >
      No se pudieron cargar los países.
      <button
        type="button"
        class="font-semibold underline"
        @click="retryOptions(catalog.countriesQuery)"
      >
        Reintentar
      </button>
    </div>

    <div
      v-if="catalog.catalogQuery.isLoading.value"
      class="space-y-2 py-4"
      role="status"
      aria-label="Cargando catálogo"
    >
      <div
        v-for="row in 5"
        :key="row"
        class="h-10 animate-pulse rounded-md bg-gray-100 dark:bg-white/10"
      ></div>
      <span class="sr-only">Cargando recintos…</span>
    </div>
    <div
      v-else-if="catalog.catalogQuery.isError.value"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
      role="alert"
    >
      <p>{{ errorMessage }}</p>
      <button
        type="button"
        class="mt-2 font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple"
        @click="catalog.catalogQuery.refetch()"
      >
        Reintentar
      </button>
    </div>
    <div
      v-else-if="venues.length === 0"
      class="rounded-lg border border-dashed border-gray-300 px-4 py-9 text-center dark:border-white/20"
    >
      <p class="font-medium text-rv-navy dark:text-white">
        {{
          hasFilters
            ? "No hay recintos que coincidan con estos filtros."
            : "Todavía no hay salas registradas."
        }}
      </p>
      <p v-if="hasFilters" class="mt-1 text-sm text-gray-600 dark:text-gray-300">
        Prueba a cambiar o limpiar los filtros.
      </p>
    </div>
    <template v-else>
      <VenueCatalogTable
        :venues="venues"
        :can-manage="canManage"
        :deleting-id="deletingId"
        @edit="beginEdit"
        @remove="removeVenue"
      />
      <nav
        v-if="catalog.totalPages.value === undefined || catalog.totalPages.value > 1"
        class="mt-4 flex flex-wrap items-center justify-between gap-3"
        aria-label="Paginación del catálogo"
      >
        <p class="text-sm text-gray-600 dark:text-gray-300">
          {{ firstItem }}–{{ lastItem
          }}<span v-if="pageData?.totalItems !== undefined"> de {{ pageData.totalItems }}</span>
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="min-h-10 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:text-white"
            :disabled="catalog.currentPage.value <= 1 || catalog.catalogQuery.isFetching.value"
            @click="catalog.goToPage(catalog.currentPage.value - 1)"
          >
            Anterior
          </button>
          <span
            v-if="catalog.totalPages.value !== undefined"
            class="text-sm tabular-nums text-gray-700 dark:text-gray-200"
            >Página {{ catalog.currentPage.value }} de {{ catalog.totalPages.value }}</span
          >
          <span v-else class="text-sm text-gray-700 dark:text-gray-200"
            >Página {{ catalog.currentPage.value }}</span
          >
          <button
            type="button"
            class="min-h-10 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:text-white"
            :disabled="
              catalog.catalogQuery.isFetching.value ||
              (catalog.totalPages.value !== undefined
                ? catalog.currentPage.value >= catalog.totalPages.value
                : venues.length < 20)
            "
            @click="catalog.goToPage(catalog.currentPage.value + 1)"
          >
            Siguiente
          </button>
        </div>
      </nav>
    </template>

    <VenueEditDialog
      v-if="editingVenue"
      :venue="editingVenue"
      :saving="catalog.updateMutation.isPending.value"
      :error="editError"
      @cancel="editingVenue = null"
      @save="saveVenue"
    />
  </section>
</template>
