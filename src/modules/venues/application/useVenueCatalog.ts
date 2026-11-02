import { computed, shallowRef, watch } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { getAdministrativeRegions, getVenueImportCountries } from "../api/venueImport";
import {
  deleteVenueCatalog,
  getVenueCatalog,
  getVenueLocalityOptions,
  updateVenueCatalog,
  VENUE_CATALOG_PAGE_SIZE,
} from "../api/venueCatalog";
import type { UpdateVenueCatalogPayload, VenueCatalogFilters } from "../types/venueCatalog";
import {
  venueCatalogCountriesQueryKey,
  venueCatalogRegionsQueryKey,
} from "./importCatalogQueryKeys";

export const venueCatalogQueryKey = ["venues", "catalog"] as const;
export const venueCatalogLocalitiesQueryKey = (countryId: string, regionId: string) =>
  [...venueCatalogQueryKey, "locality-options", countryId, regionId] as const;

const emptyFilters = (): VenueCatalogFilters => ({
  query: "",
  countryId: "",
  administrativeRegionId: "",
  localityId: "",
  type: "",
  status: "",
});

export function useVenueCatalog() {
  const queryClient = useQueryClient();
  const filters = shallowRef<VenueCatalogFilters>(emptyFilters());
  const offset = shallowRef(0);
  const request = computed(() => ({
    ...filters.value,
    limit: VENUE_CATALOG_PAGE_SIZE,
    offset: offset.value,
  }));

  const catalogQuery = useQuery({
    queryKey: computed(() => [...venueCatalogQueryKey, request.value] as const),
    queryFn: ({ queryKey, signal }) => getVenueCatalog(queryKey[2], signal),
    staleTime: 30_000,
  });
  const countriesQuery = useQuery({
    queryKey: venueCatalogCountriesQueryKey,
    queryFn: ({ signal }) => getVenueImportCountries(signal),
    staleTime: 5 * 60_000,
  });
  const regionsQuery = useQuery({
    queryKey: computed(() => venueCatalogRegionsQueryKey(filters.value.countryId)),
    queryFn: ({ queryKey, signal }) => getAdministrativeRegions(queryKey[3], signal),
    enabled: computed(() => Boolean(filters.value.countryId)),
    staleTime: 5 * 60_000,
  });
  const localitiesQuery = useQuery({
    queryKey: computed(() =>
      venueCatalogLocalitiesQueryKey(filters.value.countryId, filters.value.administrativeRegionId)
    ),
    queryFn: ({ queryKey, signal }) => getVenueLocalityOptions(queryKey[3], queryKey[4], signal),
    enabled: computed(() =>
      Boolean(filters.value.countryId && filters.value.administrativeRegionId)
    ),
    staleTime: 5 * 60_000,
  });

  function updateFilter<K extends keyof VenueCatalogFilters>(
    key: K,
    value: VenueCatalogFilters[K]
  ) {
    if (filters.value[key] === value) return;
    filters.value = { ...filters.value, [key]: value };
    offset.value = 0;
  }

  function changeCountry(countryId: string) {
    filters.value = {
      ...filters.value,
      countryId,
      administrativeRegionId: "",
      localityId: "",
    };
    offset.value = 0;
  }

  function changeRegion(administrativeRegionId: string) {
    filters.value = { ...filters.value, administrativeRegionId, localityId: "" };
    offset.value = 0;
  }

  function goToPage(page: number) {
    const totalItems = catalogQuery.data.value?.totalItems;
    const pageCount =
      totalItems === undefined
        ? Number.POSITIVE_INFINITY
        : Math.max(1, Math.ceil(totalItems / VENUE_CATALOG_PAGE_SIZE));
    if (page < 1 || page > pageCount) return;
    offset.value = (page - 1) * VENUE_CATALOG_PAGE_SIZE;
  }

  const invalidateCatalog = () => queryClient.invalidateQueries({ queryKey: venueCatalogQueryKey });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateVenueCatalogPayload }) =>
      updateVenueCatalog(id, payload),
    onSuccess: invalidateCatalog,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteVenueCatalog,
    onSuccess: invalidateCatalog,
  });

  watch(
    () => catalogQuery.data.value?.totalItems,
    (totalItems) => {
      if (totalItems === undefined || offset.value === 0) return;
      if (offset.value >= totalItems) {
        offset.value =
          Math.max(0, Math.floor((totalItems - 1) / VENUE_CATALOG_PAGE_SIZE)) *
          VENUE_CATALOG_PAGE_SIZE;
      }
    }
  );

  return {
    filters,
    offset,
    request,
    catalogQuery,
    countriesQuery,
    regionsQuery,
    localitiesQuery,
    currentPage: computed(() => Math.floor(offset.value / VENUE_CATALOG_PAGE_SIZE) + 1),
    totalPages: computed(() =>
      catalogQuery.data.value?.totalItems === undefined
        ? undefined
        : Math.max(1, Math.ceil(catalogQuery.data.value.totalItems / VENUE_CATALOG_PAGE_SIZE))
    ),
    updateFilter,
    changeCountry,
    changeRegion,
    goToPage,
    updateMutation,
    deleteMutation,
    invalidateCatalog,
  };
}
