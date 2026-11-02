export const venueCatalogCountriesQueryKey = ["venues", "import", "countries"] as const;

export const venueCatalogRegionsQueryKey = (countryId: string) =>
  ["venues", "import", "regions", countryId] as const;
