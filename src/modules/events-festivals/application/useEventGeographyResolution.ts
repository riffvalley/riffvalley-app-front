import type { QueryClient } from "@tanstack/vue-query";
import type {
  LocalityInspectionInput,
  LocalityInspectionResult,
} from "../api/entityResolutionContracts";
import { ENTITY_RESOLUTION_BATCH_LIMIT } from "../api/entityResolutionContracts";
import type { VenueResolutionInput, VenueResolutionResult } from "@/modules/venues";
import {
  ENTITY_RESOLUTION_STALE_TIME,
  entityResolutionQueryKeys,
  localityInspectionQueryOptions,
  venueResolutionQueryOptions,
} from "./entityResolutionQueries";

const BATCH_WINDOW_MS = 450;
type Kind = "locality" | "venue";
type Result = LocalityInspectionResult | VenueResolutionResult;
interface Pending<T extends Result> {
  key: string;
  input: LocalityInspectionInput | VenueResolutionInput;
  promise: Promise<T>;
  resolve: (result: T) => void;
  reject: (error: unknown) => void;
}

function normalized(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("und");
}

export function localityIdentity(input: LocalityInspectionInput): string {
  return JSON.stringify([
    input.countryId,
    normalized(input.name),
    input.administrativeRegionId ?? "",
    normalized(input.province ?? ""),
  ]);
}

export function venueIdentity(input: VenueResolutionInput): string {
  return JSON.stringify([input.localityId, normalized(input.name)]);
}

/** QueryCache owns completed results. These maps only join pending requests inside one table. */
export function useEventGeographyResolution(queryClient: QueryClient) {
  const pending = new Map<Kind, Map<string, Pending<Result>>>();
  const queued = new Map<Kind, Pending<Result>[]>([
    ["locality", []],
    ["venue", []],
  ]);
  const timers = new Map<Kind, ReturnType<typeof setTimeout>>();
  let disposed = false;

  function requestIdentity(kind: Kind, input: LocalityInspectionInput | VenueResolutionInput) {
    return kind === "locality"
      ? localityIdentity(input as LocalityInspectionInput)
      : venueIdentity(input as VenueResolutionInput);
  }

  function cached(kind: Kind, key: string): Result | undefined {
    const now = Date.now();
    const queries = queryClient.getQueryCache().findAll({
      queryKey: [...entityResolutionQueryKeys.all, kind],
    });
    for (const query of queries) {
      if (now - query.state.dataUpdatedAt >= ENTITY_RESOLUTION_STALE_TIME) continue;
      const inputs = query.queryKey[3];
      const rawValues = query.state.data;
      const values =
        kind === "locality" &&
        typeof rawValues === "object" &&
        rawValues !== null &&
        "results" in rawValues
          ? rawValues.results
          : rawValues;
      if (!Array.isArray(inputs) || !Array.isArray(values)) continue;
      const index = inputs.findIndex((input) => {
        if (Array.isArray(input) && kind === "locality") {
          return (
            localityIdentity({
              name: String(input[0] ?? ""),
              countryId: String(input[1] ?? ""),
              ...(typeof input[2] === "string" ? { administrativeRegionId: input[2] } : {}),
              ...(typeof input[3] === "string" ? { province: input[3] } : {}),
            }) === key
          );
        }
        if (Array.isArray(input) && kind === "venue") {
          return (
            venueIdentity({ name: String(input[0] ?? ""), localityId: String(input[1] ?? "") }) ===
            key
          );
        }
        if (kind === "locality" && isLocalityInput(input)) {
          return localityIdentity(input) === key;
        }
        if (kind === "venue" && isVenueInput(input)) return venueIdentity(input) === key;
        return false;
      });
      const result = values[index] as Result | undefined;
      if (result) return result;
    }
    return undefined;
  }

  function flush(kind: Kind) {
    const timer = timers.get(kind);
    if (timer) clearTimeout(timer);
    timers.delete(kind);
    const batchQueue = queued.get(kind)!.splice(0);
    for (let offset = 0; offset < batchQueue.length; offset += ENTITY_RESOLUTION_BATCH_LIMIT) {
      const batch = batchQueue.slice(offset, offset + ENTITY_RESOLUTION_BATCH_LIMIT);
      const inputs = batch.map(({ input }) => input);
      const query =
        kind === "locality"
          ? localityInspectionQueryOptions(inputs as LocalityInspectionInput[])
          : venueResolutionQueryOptions(inputs as VenueResolutionInput[]);
      void queryClient
        .fetchQuery(query as never)
        .then((response: unknown) => {
          const values =
            kind === "locality"
              ? (response as { results: Result[] }).results
              : (response as Result[]);
          batch.forEach((entry, index) => {
            const value = values[index];
            if (value) entry.resolve(value);
            else
              entry.reject(new Error("La respuesta geográfica no contiene el índice solicitado."));
            if (pending.get(kind)?.get(entry.key) === entry) pending.get(kind)!.delete(entry.key);
          });
        })
        .catch((error: unknown) => {
          batch.forEach((entry) => {
            entry.reject(error);
            if (pending.get(kind)?.get(entry.key) === entry) pending.get(kind)!.delete(entry.key);
          });
        });
    }
  }

  function resolve<T extends Result>(
    kind: Kind,
    inputs: readonly (LocalityInspectionInput | VenueResolutionInput)[],
    immediate = false
  ): Promise<T[]> {
    if (disposed) return Promise.reject(new DOMException("La vista se ha cerrado.", "AbortError"));
    const promises = inputs.map((input) => {
      const key = requestIdentity(kind, input);
      const fresh = cached(kind, key);
      if (fresh) return Promise.resolve(fresh as T);
      const waiting = pending.get(kind)?.get(key);
      if (waiting) return waiting.promise as Promise<T>;
      let resolveEntry!: (result: T) => void;
      let rejectEntry!: (error: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolveEntry = res;
        rejectEntry = rej;
      });
      const entry: Pending<T> = {
        key,
        input: { ...input },
        promise,
        resolve: resolveEntry,
        reject: rejectEntry,
      };
      const entries = pending.get(kind) ?? new Map<string, Pending<Result>>();
      entries.set(key, entry as Pending<Result>);
      pending.set(kind, entries);
      queued.get(kind)!.push(entry as Pending<Result>);
      return promise;
    });
    if (queued.get(kind)!.length > 0) {
      if (immediate) flush(kind);
      else if (!timers.has(kind))
        timers.set(
          kind,
          setTimeout(() => flush(kind), BATCH_WINDOW_MS)
        );
    }
    return Promise.all(promises);
  }

  return {
    resolveLocalities(inputs: readonly LocalityInspectionInput[], immediate = false) {
      return resolve<LocalityInspectionResult>("locality", inputs, immediate);
    },
    resolveVenues(inputs: readonly VenueResolutionInput[], immediate = false) {
      return resolve<VenueResolutionResult>("venue", inputs, immediate);
    },
    flush() {
      flush("locality");
      flush("venue");
    },
    dispose() {
      disposed = true;
      timers.forEach(clearTimeout);
      timers.clear();
      const error = new DOMException("La vista se ha cerrado.", "AbortError");
      for (const entries of queued.values())
        entries.splice(0).forEach((entry) => entry.reject(error));
      pending.clear();
    },
  };
}

function isLocalityInput(value: unknown): value is LocalityInspectionInput {
  return (
    typeof value === "object" &&
    value !== null &&
    "countryId" in value &&
    "name" in value &&
    typeof value.countryId === "string" &&
    typeof value.name === "string"
  );
}
function isVenueInput(value: unknown): value is VenueResolutionInput {
  return (
    typeof value === "object" &&
    value !== null &&
    "localityId" in value &&
    "name" in value &&
    typeof value.localityId === "string" &&
    typeof value.name === "string"
  );
}
