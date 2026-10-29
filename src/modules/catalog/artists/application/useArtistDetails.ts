import { isAxiosError } from "axios";
import { readonly, shallowRef, watch, type Ref } from "vue";
import { getArtistDetails } from "../api/artistDetails";
import type { ArtistDetailsDto } from "../types/artistApi";

export function useArtistDetails(artistId: Readonly<Ref<string>>, enabled: Readonly<Ref<boolean>>) {
  const detail = shallowRef<ArtistDetailsDto | null>(null);
  const loading = shallowRef(false);
  const error = shallowRef(false);
  const notFound = shallowRef(false);
  let controller: AbortController | null = null;
  let generation = 0;

  function clear(): void {
    controller?.abort();
    generation += 1;
    detail.value = null;
    loading.value = false;
    error.value = false;
    notFound.value = false;
  }

  function load(): void {
    if (!enabled.value) return;
    controller?.abort();
    const request = new AbortController();
    controller = request;
    const currentGeneration = ++generation;
    const requestedId = artistId.value;
    detail.value = null;
    error.value = false;
    notFound.value = false;
    loading.value = true;

    void getArtistDetails(requestedId, request.signal)
      .then((result) => {
        if (currentGeneration !== generation || request.signal.aborted || !enabled.value || artistId.value !== requestedId) return;
        if (result.id !== requestedId) {
          error.value = true;
          return;
        }
        const seen = new Set<string>();
        const discs = result.discs.filter((disc) => {
          if (seen.has(disc.id)) return false;
          seen.add(disc.id);
          return true;
        });
        detail.value = {
          ...result,
          discs: discs.sort((a, b) => {
            if (!a.releaseDate) return b.releaseDate ? 1 : 0;
            if (!b.releaseDate) return -1;
            return b.releaseDate.localeCompare(a.releaseDate);
          }),
        };
      })
      .catch((reason: unknown) => {
        if (currentGeneration !== generation || request.signal.aborted || !enabled.value || artistId.value !== requestedId) return;
        if (isAxiosError(reason) && reason.response?.status === 404) notFound.value = true;
        else error.value = true;
      })
      .finally(() => {
        if (currentGeneration === generation && !request.signal.aborted) loading.value = false;
      });
  }

  watch(() => [artistId.value, enabled.value] as const, ([isEnabled]) => {
    clear();
    if (isEnabled) load();
  }, { immediate: true });

  return { detail: readonly(detail), loading: readonly(loading), error: readonly(error), notFound: readonly(notFound), load, clear };
}
