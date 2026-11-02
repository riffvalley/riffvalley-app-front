import type { QueryClient } from "@tanstack/vue-query";
import type { TourResolutionResult } from "../api/entityResolutionContracts";
import { ENTITY_RESOLUTION_BATCH_LIMIT } from "../api/entityResolutionContracts";
import {
  ENTITY_RESOLUTION_STALE_TIME,
  entityResolutionQueryKeys,
  tourResolutionQueryOptions,
} from "./entityResolutionQueries";

const RESOLUTION_DEBOUNCE_MS = 450;

/** Case and whitespace are the only frontend equivalences allowed by normalizeGeography. */
export function tourResolutionKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("und");
}

interface PendingTour {
  key: string;
  name: string;
  promise: Promise<TourResolutionResult>;
  resolve: (result: TourResolutionResult) => void;
  reject: (error: unknown) => void;
}

/** QueryCache owns completed data; this table-scoped map only joins pending work. */
export function useEventTourResolution(queryClient: QueryClient) {
  const pending = new Map<string, PendingTour>();
  const queued: PendingTour[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  function cached(key: string): TourResolutionResult | undefined {
    const now = Date.now();
    for (const query of queryClient.getQueryCache().findAll({
      queryKey: [...entityResolutionQueryKeys.all, "tour"],
    })) {
      if (now - query.state.dataUpdatedAt >= ENTITY_RESOLUTION_STALE_TIME) continue;
      const names = query.queryKey[3];
      const response = query.state.data as { results?: TourResolutionResult[] } | undefined;
      if (!Array.isArray(names) || !response || !Array.isArray(response.results)) continue;
      const index = names.findIndex(
        (name) => typeof name === "string" && tourResolutionKey(name) === key
      );
      const result = response.results[index];
      if (result) return result;
    }
    return undefined;
  }

  function flush() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    const batchQueue = queued.splice(0);
    for (let offset = 0; offset < batchQueue.length; offset += ENTITY_RESOLUTION_BATCH_LIMIT) {
      const batch = batchQueue.slice(offset, offset + ENTITY_RESOLUTION_BATCH_LIMIT);
      void queryClient
        .fetchQuery(tourResolutionQueryOptions({ names: batch.map(({ name }) => name) }))
        .then(({ results }) => {
          batch.forEach((entry, index) => {
            const result = results[index];
            if (result) entry.resolve(result);
            else entry.reject(new Error("La respuesta de Tour no contiene el índice solicitado."));
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

  function resolve(names: readonly string[], immediate = false): Promise<TourResolutionResult[]> {
    if (disposed) return Promise.reject(new DOMException("La vista se ha cerrado.", "AbortError"));
    const results = names.map((name) => {
      const key = tourResolutionKey(name);
      const fresh = cached(key);
      if (fresh) return Promise.resolve(fresh);
      const waiting = pending.get(key);
      if (waiting) return waiting.promise;
      let resolveEntry!: (result: TourResolutionResult) => void;
      let rejectEntry!: (error: unknown) => void;
      const promise = new Promise<TourResolutionResult>((res, rej) => {
        resolveEntry = res;
        rejectEntry = rej;
      });
      const entry = { key, name: name.trim(), promise, resolve: resolveEntry, reject: rejectEntry };
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
  }

  return { resolve, flush, dispose };
}
