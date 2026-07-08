const DIACRITICS_REGEX = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g"
);

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Las provincias bilingues ("Valencia / Valencia") usan el nombre en castellano (ultima parte) para la URL. */
export function provinceSlug(province: string): string {
  const parts = province.split("/");
  return slugify(parts[parts.length - 1]);
}
