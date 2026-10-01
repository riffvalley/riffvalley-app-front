import type { ArtistManagementItem } from "../../../domain/artistManagement";

export function removeArtistLocally<TArtist extends ArtistManagementItem>(
  artists: TArtist[],
  totalItems: number,
  artistId: string,
): { artists: TArtist[]; totalItems: number } {
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
