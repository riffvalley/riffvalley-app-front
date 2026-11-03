import type { QueryClient } from "@tanstack/vue-query";
import {
  artistResolutionQueryOptions,
  entityResolutionQueryKeys,
  ENTITY_RESOLUTION_STALE_TIME,
} from "./entityResolutionQueries";
import type { ArtistResolutionResult } from "../api/artistResolution";
import { ENTITY_RESOLUTION_BATCH_LIMIT } from "../api/entityResolutionContracts";
import { artistResolutionKey } from "./entityResolutionIdentity";

const RESOLUTION_DEBOUNCE_MS = 450;

interface PendingArtist {
  key: string;
  name: string;
  promise: Promise<ArtistResolutionResult>;
  resolve: (result: ArtistResolutionResult) => void;
  reject: (error: unknown) => void;
}

function cachedArtistResult(
  queryClient: QueryClient,
  key: string
): ArtistResolutionResult | undefined {
  const now = Date.now();
  const queries = queryClient.getQueryCache().findAll({
    queryKey: [...entityResolutionQueryKeys.all, "artist"],
  });

  for (const query of queries) {
    if (now - query.state.dataUpdatedAt >= ENTITY_RESOLUTION_STALE_TIME) continue;
    const names = query.queryKey[3];
    if (!Array.isArray(names) || !Array.isArray(query.state.data)) continue;
    const index = names.findIndex(
      (name) => typeof name === "string" && artistResolutionKey(name) === key
    );
    if (index < 0) continue;
    const result = (query.state.data as ArtistResolutionResult[])[index];
    if (result) return result;
  }

  return undefined;
}

/** One table-scoped coordinator. QueryCache owns completed remote data; this map only joins pending work. */
export function useEventEntityResolution(queryClient: QueryClient) {
  const pending = new Map<string, PendingArtist>();
  const queued: PendingArtist[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  function flush() {
    timer = undefined;
    const batchQueue = queued.splice(0);
    for (let offset = 0; offset < batchQueue.length; offset += ENTITY_RESOLUTION_BATCH_LIMIT) {
      const batch = batchQueue.slice(offset, offset + ENTITY_RESOLUTION_BATCH_LIMIT);
      void queryClient
        .fetchQuery(artistResolutionQueryOptions(batch.map(({ name }) => name)))
        .then((results) => {
          batch.forEach((entry, index) => {
            const result = results[index];
            if (result) entry.resolve(result);
            else
              entry.reject(new Error("La respuesta de Artist no contiene el índice solicitado."));
            if (pending.get(entry.key) === entry) pending.delete(entry.key);
          });
        })
        .catch((error: unknown) => {
          batch.forEach((entry) => {
            entry.reject(error);
            if (pending.get(entry.key) === entry) pending.delete(entry.key);
          });
        });
    }
  }

  function resolve(names: readonly string[], immediate = false): Promise<ArtistResolutionResult[]> {
    const results = names.map((name) => {
      const key = artistResolutionKey(name);
      const cached = cachedArtistResult(queryClient, key);
      if (cached) return Promise.resolve(cached);

      const existing = pending.get(key);
      if (existing) return existing.promise;

      let resolvePending!: (result: ArtistResolutionResult) => void;
      let rejectPending!: (error: unknown) => void;
      const promise = new Promise<ArtistResolutionResult>((resolvePromise, rejectPromise) => {
        resolvePending = resolvePromise;
        rejectPending = rejectPromise;
      });
      const entry = {
        key,
        name: name.trim(),
        promise,
        resolve: resolvePending,
        reject: rejectPending,
      };
      pending.set(key, entry);
      queued.push(entry);
      return promise;
    });

    if (queued.length && !timer) {
      if (immediate) flush();
      else timer = setTimeout(flush, RESOLUTION_DEBOUNCE_MS);
    }
    if (immediate && timer) flush();
    return Promise.all(results);
  }

  function dispose() {
    disposed = true;
    if (timer) clearTimeout(timer);
    timer = undefined;
    const error = new DOMException("La vista del importador se ha cerrado.", "AbortError");
    queued.splice(0).forEach((entry) => {
      entry.reject(error);
      if (pending.get(entry.key) === entry) pending.delete(entry.key);
    });
    // In-flight Query requests remain cacheable and may still serve another observer.
  }

  return {
    resolve,
    flush,
    dispose,
    get isDisposed() {
      return disposed;
    },
  };
}
