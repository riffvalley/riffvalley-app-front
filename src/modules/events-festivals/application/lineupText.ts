export function splitLineupNames(value: string): string[] {
  return value
    .split("+")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export function lineupNameCacheKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
