export const EVENT_IMPORT_COUNTRIES = [
  { isoCode: "ES", label: "España" },
  { isoCode: "PT", label: "Portugal" },
  { isoCode: "FR", label: "Francia" },
  { isoCode: "DE", label: "Alemania" },
  { isoCode: "GB", label: "Reino Unido" },
  { isoCode: "BE", label: "Bélgica" },
  { isoCode: "NL", label: "Países Bajos" },
  { isoCode: "IT", label: "Italia" },
] as const;

export type EventImportCountryCode = (typeof EVENT_IMPORT_COUNTRIES)[number]["isoCode"];
