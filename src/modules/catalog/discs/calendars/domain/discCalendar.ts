import type { Country, Genre } from "../../../reference-data/domain/catalog";

/** Catalog-owned calendar projection. Community state is composed separately. */
export interface CalendarDisc {
  id: string;
  name: string;
  releaseDate: string | Date;
  artist: { id: string; name: string; countryId?: string | null; country?: Country | null };
  genreId?: string;
  genre?: Genre | null;
  link: string | null;
  image: string | null;
  ep: boolean;
  debut: boolean;
  verified: boolean;
  pinned: boolean;
  nationalReleaseId: string | null;
}
export interface CalendarGroup { releaseDate: string; discs: CalendarDisc[] }

/** Preserve the legacy mixed UTC/local boundaries, including DST. */
export function calendarMonthRange(year: number, month: number): [string, string] {
  return [new Date(Date.UTC(year, month, 1)).toISOString(),
    new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString()];
}

export function mergeCalendarGroups(current: CalendarGroup[], incoming: CalendarGroup[]): CalendarGroup[] {
  const result = current.map((group) => ({ ...group, discs: [...group.discs] }));
  for (const group of incoming) {
    const existing = result.find((item) => item.releaseDate === group.releaseDate);
    if (existing) existing.discs.push(...group.discs);
    else result.push({ ...group, discs: [...group.discs] });
  }
  return result;
}

export function removeCalendarDisc(groups: CalendarGroup[], id: string): CalendarGroup[] {
  // Legacy scans groups from the end and removes the first match within it.
  const result = [...groups];
  for (let i = result.length - 1; i >= 0; i--) {
    const group = result[i];
    const index = group.discs.findIndex((disc) => disc.id === id);
    if (index < 0) continue;
    const discs = group.discs.filter((_, position) => position !== index);
    if (discs.length) result[i] = { ...group, discs };
    else result.splice(i, 1);
    break;
  }
  return result;
}

export function applyCalendarArtistUpdate(
  groups: CalendarGroup[],
  artistId: string,
  update: { name?: string; countryId?: string | null },
): CalendarGroup[] {
  return groups.map((group) => ({
    ...group,
    discs: group.discs.map((disc) => disc.artist.id === artistId
      ? { ...disc, artist: { ...disc.artist, ...update } }
      : disc),
  }));
}

export function applyCalendarDiscArtistCreation(
  groups: CalendarGroup[],
  discId: string,
  artist: { id: string; name: string },
): CalendarGroup[] {
  return groups.map((group) => ({
    ...group,
    discs: group.discs.map((disc) => disc.id === discId
      ? { ...disc, artist: { ...disc.artist, ...artist } }
      : disc),
  }));
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}
export function filterStandardCalendar(groups: CalendarGroup[], query: string, genre: string): CalendarGroup[] {
  const normalized = normalizeSearch(query || "");
  return groups.map((group) => ({ ...group, discs: group.discs.filter((disc) =>
    (!normalized || normalizeSearch(disc.name).includes(normalized) || normalizeSearch(disc.artist.name).includes(normalized)) &&
    (!genre || String(disc.genre?.id ?? "") === String(genre)),
  ) })).filter((group) => group.discs.length > 0);
}
export function filterBabyCalendar(groups: CalendarGroup[], query: string, genre: string): CalendarGroup[] {
  return groups.map((group) => ({ ...group, discs: group.discs.filter((disc) =>
    (disc.name.toLowerCase().includes(query.toLowerCase()) || disc.artist.name.toLowerCase().includes(query.toLowerCase())) &&
    (!genre || disc.genre?.id === genre),
  ) })).filter((group) => group.discs.length > 0);
}

export function sameLocalCalendarDay(date: string, target: Date): boolean {
  const value = new Date(date);
  return value.getFullYear() === target.getFullYear() && value.getMonth() === target.getMonth() && value.getDate() === target.getDate();
}
