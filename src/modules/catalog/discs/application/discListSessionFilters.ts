import { watch, type Ref } from "vue";

/**
 * Recuerda los filtros de exploración de Discos mientras dure la sesión del
 * navegador (sessionStorage): sobreviven a cambiar de sección y a recargar, pero
 * no a cerrar la pestaña. Se guardan por usuario para no mezclar cuentas.
 */
export interface DiscListSessionFilters {
  week: [string, string] | null;
  genreIds: string[];
  countryId: string;
  noRatesOnly: boolean;
}

const STORAGE_PREFIX = "rv_disc_list_filters:";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function isIsoRange(value: unknown): value is [string, string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => typeof item === "string" && !Number.isNaN(Date.parse(item)))
  );
}

export function readDiscListSessionFilters(userId: string | null): DiscListSessionFilters | null {
  if (!userId) return null;
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const value = parsed as Record<string, unknown>;
    if (value.week !== null && !isIsoRange(value.week)) return null;
    if (!Array.isArray(value.genreIds) || !value.genreIds.every((id) => typeof id === "string")) return null;
    if (typeof value.countryId !== "string" || typeof value.noRatesOnly !== "boolean") return null;
    return {
      week: value.week === null ? null : [value.week[0], value.week[1]],
      genreIds: [...value.genreIds],
      countryId: value.countryId,
      noRatesOnly: value.noRatesOnly,
    };
  } catch {
    return null;
  }
}

export function writeDiscListSessionFilters(userId: string | null, filters: DiscListSessionFilters): void {
  if (!userId) return;
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(filters));
  } catch {
    // Recordar filtros es una comodidad: si el navegador lo bloquea, se ignora.
  }
}

const APPLIED_FILTER_PREFIX = "rv_disc_list_applied_filter:";

/** Id del filtro guardado aplicado en «Mis filtros» ("" si no hay ninguno). */
export function readDiscListAppliedSavedFilterId(userId: string | null): string {
  if (!userId) return "";
  try {
    return sessionStorage.getItem(`${APPLIED_FILTER_PREFIX}${userId}`) ?? "";
  } catch {
    return "";
  }
}

export function writeDiscListAppliedSavedFilterId(userId: string | null, filterId: string): void {
  if (!userId) return;
  try {
    const key = `${APPLIED_FILTER_PREFIX}${userId}`;
    if (filterId) sessionStorage.setItem(key, filterId);
    else sessionStorage.removeItem(key);
  } catch {
    // Igual que los filtros: si el navegador lo bloquea, se ignora.
  }
}

interface SessionFilterBindings {
  userId: Ref<string | null>;
  selectedWeek: Ref<[string, string] | null>;
  selectedGenres: Ref<string[]>;
  selectedCountry: Ref<string>;
  noRatesOnly: Ref<boolean>;
  setSelectedWeek: (range: [string, string] | null) => void;
  setGenres: (ids: string[]) => void;
  setCountry: (countryId: string) => void;
  setNoRatesOnly: (enabled: boolean) => void;
}

/**
 * Restaura los filtros guardados (devuelve true si había) y guarda cada cambio.
 * Debe llamarse en el setup, antes de montar los filtros, para que el año por
 * defecto no pise un «Todos los años» elegido por el usuario.
 */
export function useDiscListSessionFilters(bindings: SessionFilterBindings): boolean {
  const stored = readDiscListSessionFilters(bindings.userId.value);
  if (stored) {
    bindings.setSelectedWeek(stored.week);
    bindings.setGenres(stored.genreIds);
    bindings.setCountry(stored.countryId);
    bindings.setNoRatesOnly(stored.noRatesOnly);
  }

  watch(
    () => ({
      week: bindings.selectedWeek.value,
      genreIds: [...bindings.selectedGenres.value],
      countryId: bindings.selectedCountry.value,
      noRatesOnly: bindings.noRatesOnly.value,
    }),
    (filters) => writeDiscListSessionFilters(bindings.userId.value, filters),
    { deep: true },
  );

  return Boolean(stored);
}
