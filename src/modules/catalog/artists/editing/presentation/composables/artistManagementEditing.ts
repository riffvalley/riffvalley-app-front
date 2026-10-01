import type { Country } from "../../../../reference-data/domain/catalog";
import type { ArtistManagementItem } from "../../../domain/artistManagement";

export interface ArtistEditValues {
  id: string;
  name: string;
  countryId: string;
  image: string;
  description: string;
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
