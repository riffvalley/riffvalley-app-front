import api from "@/shared/infrastructure/http/client";
import type { ArtistImageQuery, ArtistImageSearchSessionPort, ArtistImagesPort } from "../application/artistImages";

interface ArtistCandidateDto {
  spotifyId?: string | null;
  name?: string | null;
}

interface ArtistSearchMultipleDto {
  artists?: ArtistCandidateDto[] | null;
  items?: ArtistCandidateDto[] | null;
}

interface ArtistImageDto {
  url?: string | null;
  imageUrl?: string | null;
}

interface ArtistImagesDto {
  images?: Array<ArtistImageDto | string> | null;
  items?: Array<ArtistImageDto | string> | null;
}

type ArtistImageResponse = Array<ArtistImageDto | string> | ArtistImagesDto | null;

function getArtistCandidates(data: ArtistSearchMultipleDto | ArtistCandidateDto[] | null): ArtistCandidateDto[] {
  if (Array.isArray(data)) return data;
  return data?.artists ?? data?.items ?? [];
}

function getImageUrls(data: ArtistImageResponse): string[] {
  const images = Array.isArray(data) ? data : data?.images ?? data?.items ?? [];
  return images.flatMap((image) => {
    const url = typeof image === "string" ? image : image.url ?? image.imageUrl;
    return url ? [url] : [];
  });
}

async function searchArtistImages(query: ArtistImageQuery) {
  const { data: searchData } = await api.get<ArtistSearchMultipleDto | ArtistCandidateDto[] | null>(
    "/spotify/artists/search/multiple",
    { params: { artistName: query.name } },
  );

  const candidates = getArtistCandidates(searchData)
    .filter((artist): artist is ArtistCandidateDto & { spotifyId: string; name: string } =>
      Boolean(artist.spotifyId && artist.name),
    )
    .slice(0, query.limit);

  const candidateImages = await Promise.all(candidates.map(async (artist) => {
    const { data } = await api.get<ArtistImageResponse>(
      `/spotify/artists/${encodeURIComponent(artist.spotifyId)}/images`,
    );
    return { name: artist.name, images: getImageUrls(data) };
  }));

  // Keep one image from each artist ahead of alternate images so homonyms remain distinguishable.
  const options = candidateImages.flatMap(({ name, images }) =>
    images[0] ? [{ name, image: images[0] }] : [],
  );
  for (let imageIndex = 1; options.length < query.limit; imageIndex++) {
    let foundAnotherImage = false;
    for (const { name, images } of candidateImages) {
      const image = images[imageIndex];
      if (image) {
        options.push({ name, image });
        foundAnotherImage = true;
        if (options.length === query.limit) break;
      }
    }
    if (!foundAnotherImage) break;
  }

  return options.slice(0, query.limit);
}

export const artistImagesApi: ArtistImagesPort & ArtistImageSearchSessionPort = {
  async createSearchSession() {
    return searchArtistImages;
  },
  searchArtistImages,
};
