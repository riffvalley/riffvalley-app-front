import { computed, ref, watch } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  getAdministrativeRegions,
  getVenueImportCountries,
  venueCatalogCountriesQueryKey,
  venueCatalogRegionsQueryKey,
  type AdministrativeRegion,
  type Country,
} from "@/modules/venues";
import { EVENT_IMPORT_COUNTRIES } from "./importGeography";

const CATALOG_STALE_TIME = 5 * 60_000;

export function useEventImportGeography(
  invalidateGeographicAssociations: (countryId: string) => void
) {
  const queryClient = useQueryClient();
  const selectedCountryId = ref("");
  const defaultSelectionSettled = ref(false);
  const regionsRequested = ref(false);

  const countriesQuery = useQuery({
    queryKey: venueCatalogCountriesQueryKey,
    queryFn: ({ signal }) => getVenueImportCountries(signal),
    staleTime: CATALOG_STALE_TIME,
  });

  const countryOptions = computed(() => {
    const catalog = countriesQuery.data.value ?? [];
    return EVENT_IMPORT_COUNTRIES.flatMap(({ isoCode, label }) => {
      const country = catalog.find((candidate) => candidate.isoCode?.toUpperCase() === isoCode);
      return country ? [{ id: country.id, isoCode, label }] : [];
    });
  });

  const missingCountries = computed(() => {
    if (!countriesQuery.data.value) return [];
    const available = new Set(countryOptions.value.map(({ isoCode }) => isoCode));
    return EVENT_IMPORT_COUNTRIES.filter(({ isoCode }) => !available.has(isoCode));
  });

  const countryCatalogIssues = computed(() => {
    const issues: string[] = [];
    if (missingCountries.value.length > 0) {
      issues.push(
        `No están disponibles en el catálogo: ${missingCountries.value
          .map(({ label, isoCode }) => `${label} (${isoCode})`)
          .join(", ")}.`
      );
    }
    return issues;
  });

  watch(
    () => countriesQuery.data.value,
    (catalog) => {
      if (!catalog || defaultSelectionSettled.value) return;
      defaultSelectionSettled.value = true;
      const spain = countryOptions.value.find(({ isoCode }) => isoCode === "ES");
      if (spain) {
        selectedCountryId.value = spain.id;
        invalidateGeographicAssociations(spain.id);
      }
    },
    { immediate: true }
  );

  const regionsQuery = useQuery({
    queryKey: computed(() => venueCatalogRegionsQueryKey(selectedCountryId.value)),
    queryFn: ({ queryKey, signal }) => getAdministrativeRegions(queryKey[3], signal),
    enabled: computed(() => regionsRequested.value && Boolean(selectedCountryId.value)),
    staleTime: CATALOG_STALE_TIME,
  });

  function selectCountry(countryId: string) {
    if (!countryOptions.value.some((country) => country.id === countryId)) return;
    if (selectedCountryId.value === countryId) return;
    selectedCountryId.value = countryId;
    regionsRequested.value = false;
    invalidateGeographicAssociations(countryId);
  }

  function loadRegions(): Promise<AdministrativeRegion[] | undefined> {
    if (!selectedCountryId.value) return Promise.resolve(undefined);
    regionsRequested.value = true;
    const countryId = selectedCountryId.value;
    return queryClient.ensureQueryData({
      queryKey: venueCatalogRegionsQueryKey(countryId),
      queryFn: ({ signal }) => getAdministrativeRegions(countryId, signal),
      staleTime: CATALOG_STALE_TIME,
    });
  }

  const selectedCountry = computed<Country | undefined>(() =>
    countriesQuery.data.value?.find(({ id }) => id === selectedCountryId.value)
  );

  return {
    countryOptions,
    countryCatalogIssues,
    selectedCountryId,
    selectedCountry,
    countriesQuery,
    selectCountry,
    regions: computed(() => regionsQuery.data.value ?? []),
    regionsQuery,
    loadRegions,
  };
}
