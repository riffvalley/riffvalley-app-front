/** Artist inspection equivalence: trim, compact whitespace, and ignore case. */
export function artistResolutionKey(name: string): string {
  return name.trim().replace(/\s+/gu, " ").toLocaleLowerCase("und");
}

/** Mirrors the backend normalizeGeography contract for context compatibility. */
export function geographyContextKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("und");
}
