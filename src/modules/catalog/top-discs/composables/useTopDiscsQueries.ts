import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import { getTopDiscs, getTopDiscsOptions } from "../api/topDiscs";
import type { TopDiscsOptionsParams, TopDiscsParams } from "../types/topDiscs";
import {
  normalizeTopDiscsFilterParams,
  normalizeTopDiscsParams as normalizeRankingParams,
} from "../utils/normalizeParams";

export const topDiscsQueryKey = ["catalog", "top-discs"] as const;
export const topDiscsOptionsQueryKey = ["catalog", "top-disc-options"] as const;

export function normalizeTopDiscsParams(params: TopDiscsParams = {}): TopDiscsParams {
  return normalizeRankingParams(params);
}

export function normalizeTopDiscsOptionsParams(
  params: TopDiscsOptionsParams = {}
): TopDiscsOptionsParams {
  return normalizeTopDiscsFilterParams(params);
}

export function topDiscsQueryKeyForSession(
  params: TopDiscsParams,
  userId: string | null,
  sessionGeneration: number
) {
  return [...topDiscsQueryKey, userId, sessionGeneration, normalizeTopDiscsParams(params)] as const;
}

export function topDiscsOptionsQueryKeyFor(params: TopDiscsOptionsParams) {
  return [...topDiscsOptionsQueryKey, normalizeTopDiscsOptionsParams(params)] as const;
}

export function useTopDiscsQuery(
  params: MaybeRefOrGetter<TopDiscsParams>,
  enabled: MaybeRefOrGetter<boolean> = true
) {
  const authStore = useAuthStore();
  const queryKey = computed(() =>
    topDiscsQueryKeyForSession(toValue(params), authStore.userId, authStore.authSessionGeneration)
  );

  return useQuery({
    queryKey,
    enabled: computed(() => toValue(enabled)),
    queryFn: ({ queryKey: requestedKey, signal }) => getTopDiscs(requestedKey[4], signal),
  });
}

export function useTopDiscsOptionsQuery(
  params: MaybeRefOrGetter<TopDiscsOptionsParams>,
  enabled: MaybeRefOrGetter<boolean> = true
) {
  const queryKey = computed(() => topDiscsOptionsQueryKeyFor(toValue(params)));

  return useQuery({
    queryKey,
    enabled: computed(() => toValue(enabled)),
    queryFn: ({ queryKey: requestedKey, signal }) => getTopDiscsOptions(requestedKey[2], signal),
  });
}
