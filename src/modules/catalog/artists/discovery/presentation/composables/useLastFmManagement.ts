import { ref, shallowReadonly, shallowRef } from "vue";
import type { ArtistManagementDisc, ArtistManagementItem, ArtistManagementMatch } from "../../../domain/artistManagement";
import type {
  LastFmManagementDependencies,
  LastFmManagementProfile,
} from "../../application/artistExternalProfile";
import { selectCatalogArtist } from "../../application/artistExternalProfile";

export function useLastFmManagement<TDisc extends ArtistManagementDisc = ArtistManagementDisc>(
  dependencies: LastFmManagementDependencies<TDisc>,
  onProfileError: () => void,
) {
  const cache = new Map<string, LastFmManagementProfile>();
  const visible = ref(false);
  const artistName = ref("");
  const artistImage = shallowRef<string | null>(null);
  const profile = shallowRef<LastFmManagementProfile | null>(null);
  const catalogArtist = shallowRef<ArtistManagementMatch<TDisc> | null>(null);
  let requestVersion = 0;

  const cacheKey = (name: string) => name.trim().toLocaleLowerCase();

  async function loadProfile(name: string): Promise<LastFmManagementProfile | null> {
    const key = cacheKey(name);
    const cached = cache.get(key);
    if (cached) return cached;
    try {
      const loaded = await dependencies.loadProfile(name);
      cache.set(key, loaded);
      return loaded;
    } catch {
      onProfileError();
      return null;
    }
  }

  async function loadImage(name: string, version: number) {
    try {
      const image = await dependencies.findFallbackImage(name);
      if (requestVersion === version && image) artistImage.value = image;
    } catch {
      // The existing modal keeps Last.fm and Catalog content when image lookup fails.
    }
  }

  async function open(artist: ArtistManagementItem<TDisc>) {
    const version = ++requestVersion;
    artistName.value = artist.name;
    artistImage.value = artist.image;
    profile.value = null;
    catalogArtist.value = artist;
    visible.value = true;

    const profilePromise = loadProfile(artist.name);
    if (!artist.image) void loadImage(artist.name, version);
    const loaded = await profilePromise;
    if (requestVersion === version) profile.value = loaded;
  }

  async function navigateToSimilar(name: string) {
    const version = ++requestVersion;
    artistName.value = name;
    artistImage.value = null;
    profile.value = null;
    catalogArtist.value = null;

    const [loadedProfile, artists] = await Promise.all([
      loadProfile(name),
      dependencies.searchCatalogArtists(name).catch(() => []),
    ]);
    if (requestVersion !== version) return;
    if (!loadedProfile) return;

    const matchingArtist = selectCatalogArtist(artists, name);
    profile.value = loadedProfile;
    catalogArtist.value = matchingArtist;
    artistImage.value = matchingArtist?.image ?? null;
    if (!artistImage.value) void loadImage(name, version);
  }

  function close() {
    visible.value = false;
  }

  return {
    visible: shallowReadonly(visible),
    artistName: shallowReadonly(artistName),
    artistImage: shallowReadonly(artistImage),
    profile: shallowReadonly(profile),
    catalogArtist: shallowReadonly(catalogArtist),
    open,
    close,
    navigateToSimilar,
  };
}
