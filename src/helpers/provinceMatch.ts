import { provinceSlug } from "./slug";

const DIACRITICS_REGEX = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g"
);

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim();
}

/** Un nombre de provincia puede venir bilingue ("Valencia / Valencia", "Alacant/Alicante"...). */
function provinceNameParts(name: string): string[] {
  return name.split("/").map((part) => normalize(part));
}

/** Compara dos nombres de provincia tolerando bilinguismo, acentos y variaciones de orden/espaciado. */
export function provincesMatch(a: string, b: string): boolean {
  const partsA = provinceNameParts(a);
  const partsB = provinceNameParts(b);
  return partsA.some((pa) => partsB.includes(pa));
}

export interface VenueProvinceStatLike {
  province: string | null;
  count: number;
}

export interface ResolvedProvinceSlug {
  /** Nombre de provincia exacto tal cual lo devuelve el backend, listo para filtrar /locations?province=. */
  backendProvince: string | null;
  /** true si el slug es el especial "sin-ubicar" (salas sin geocode). */
  isUnlocated: boolean;
  displayName: string;
}

const UNLOCATED_SLUG = "sin-ubicar";

/** Resuelve un slug de URL (p.ej. "madrid") contra las stats por provincia del backend. */
export function resolveProvinceSlug(
  slug: string,
  stats: VenueProvinceStatLike[]
): ResolvedProvinceSlug {
  if (slug === UNLOCATED_SLUG) {
    return { backendProvince: null, isUnlocated: true, displayName: "Sin ubicar" };
  }

  const stat = stats.find((s) => s.province && provinceSlug(s.province) === slug);
  if (stat?.province) {
    return { backendProvince: stat.province, isUnlocated: false, displayName: stat.province };
  }

  const fallbackName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { backendProvince: null, isUnlocated: false, displayName: fallbackName };
}
