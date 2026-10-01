import type { ArtistManagementPort, ArtistUpdatePort } from "../../application/artistManagementPort";
import type { ArtistManagementItem } from "../../domain/artistManagement";
import { listArtists } from "../../listing/application/listArtists";

export const ARTIST_IMAGE_BATCH_SIZE = 200;
export const ARTIST_IMAGE_PAUSE_MS = 150;

export type SearchArtistImage = (artistName: string) => Promise<string | null>;

export interface ArtistImageSearchSessionPort {
  createSearchSession(): Promise<SearchArtistImage>;
}

export interface FillMissingArtistImagesProgress {
  processed: number;
  total: number;
}

export interface FillMissingArtistImagesCallbacks {
  onProgress?: (progress: FillMissingArtistImagesProgress) => void;
  onArtistUpdated?: (artistId: string, image: string) => void;
}

export interface FillMissingArtistImagesResult {
  processed: number;
  total: number;
  updated: number;
}

export async function fillMissingArtistImages(
  artistsPort: ArtistManagementPort & ArtistUpdatePort,
  imageSearchPort: ArtistImageSearchSessionPort,
  callbacks: FillMissingArtistImagesCallbacks = {},
): Promise<FillMissingArtistImagesResult> {
  const missingArtists: ArtistManagementItem[] = [];
  let offset = 0;
  let totalItems = 0;

  do {
    const page = await listArtists(artistsPort, { limit: ARTIST_IMAGE_BATCH_SIZE, offset });
    totalItems = page.totalItems;
    missingArtists.push(...page.data.filter((artist) => !artist.image));
    offset += ARTIST_IMAGE_BATCH_SIZE;
  } while (offset < totalItems);

  const total = missingArtists.length;
  callbacks.onProgress?.({ processed: 0, total });
  if (total === 0) return { processed: 0, total, updated: 0 };

  const searchArtistImage = await imageSearchPort.createSearchSession();
  let updated = 0;
  let processed = 0;

  for (const artist of missingArtists) {
    let image: string | null = null;
    try {
      image = await searchArtistImage(artist.name);
      if (image) {
        await artistsPort.updateArtist(artist.id, { image });
      }
    } catch {
      // Individual Spotify searches and artist updates are allowed to fail independently.
      image = null;
    }

    if (image) {
      updated++;
      callbacks.onArtistUpdated?.(artist.id, image);
    }
    processed++;
    callbacks.onProgress?.({ processed, total });
    await new Promise((resolve) => setTimeout(resolve, ARTIST_IMAGE_PAUSE_MS));
  }

  return { processed, total, updated };
}
