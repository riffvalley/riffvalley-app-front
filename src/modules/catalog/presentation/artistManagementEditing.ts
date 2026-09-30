import type { Country } from "../domain/catalog";
import type { ArtistManagementItem } from "../domain/artistManagement";

export interface ArtistEditValues {
  id: string;
  name: string;
  countryId: string;
  image: string;
  description: string;
}

export function removeArtistLocally(
  artists: ArtistManagementItem[],
  totalItems: number,
  artistId: string,
): { artists: ArtistManagementItem[]; totalItems: number } {
  const exists = artists.some((artist) => artist.id === artistId);
  return {
    artists: artists.filter((artist) => artist.id !== artistId),
    totalItems: exists ? totalItems - 1 : totalItems,
  };
}

export async function confirmAndDeleteArtist(
  confirm: () => Promise<boolean>,
  remove: () => Promise<void>,
): Promise<"cancelled" | "deleted" | "failed"> {
  if (!(await confirm())) return "cancelled";
  try {
    await remove();
    return "deleted";
  } catch {
    return "failed";
  }
}

export function applyArtistEditLocally(
  artists: ArtistManagementItem[],
  totalItems: number,
  values: ArtistEditValues,
  countries: Country[],
  needsReview: boolean | null,
): { artists: ArtistManagementItem[]; totalItems: number } {
  const artist = artists.find((item) => item.id === values.id);
  if (artist) {
    artist.name = values.name;
    artist.image = values.image || null;
    artist.description = values.description || null;
    const country = countries.find((item) => item.id === values.countryId);
    artist.country = country
      ? { id: country.id, name: country.name, isoCode: country.isoCode ?? "" }
      : null;
  }

  if (needsReview !== true || !artist) return { artists, totalItems };
  return {
    artists: artists.filter((item) => item.id !== values.id),
    totalItems: totalItems - 1,
  };
}
