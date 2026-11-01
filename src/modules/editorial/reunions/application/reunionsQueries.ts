import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { getReunionDetails, getReunions } from "../api/reunionsApi";
import type { Reunion } from "../types/reunions";

export interface ReunionsSession {
  userId: MaybeRefOrGetter<string | null>;
  generation: MaybeRefOrGetter<number>;
  role: MaybeRefOrGetter<string | null>;
}

export const reunionsQueryKeys = {
  root: (userId: string | null, generation: number, role: string | null) =>
    ["editorial", "reunions", userId, generation, role] as const,
  list: (userId: string | null, generation: number, role: string | null) =>
    [...reunionsQueryKeys.root(userId, generation, role), "list"] as const,
  detail: (userId: string | null, generation: number, role: string | null, id: string) =>
    [...reunionsQueryKeys.root(userId, generation, role), "detail", id] as const,
};

export function useReunionsListQuery(session: ReunionsSession) {
  return useQuery({
    queryKey: computed(() =>
      reunionsQueryKeys.list(
        toValue(session.userId),
        toValue(session.generation),
        toValue(session.role)
      )
    ),
    enabled: computed(() => Boolean(toValue(session.userId))),
    queryFn: ({ signal }) => getReunions(signal),
    staleTime: 30_000,
  });
}

export function useReunionDetailQuery(
  session: ReunionsSession,
  reunionId: MaybeRefOrGetter<string | null>
) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: computed(() =>
      reunionsQueryKeys.detail(
        toValue(session.userId),
        toValue(session.generation),
        toValue(session.role),
        toValue(reunionId ?? null) ?? ""
      )
    ),
    enabled: computed(() => Boolean(toValue(session.userId) && toValue(reunionId ?? null))),
    queryFn: ({ queryKey, signal }) => getReunionDetails(queryKey[6], signal),
    initialData: () => {
      const id = toValue(reunionId);
      return id
        ? queryClient
            .getQueryData<Reunion[]>(
              reunionsQueryKeys.list(
                toValue(session.userId),
                toValue(session.generation),
                toValue(session.role)
              )
            )
            ?.find((reunion) => reunion.id === id)
        : undefined;
    },
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(
        reunionsQueryKeys.list(
          toValue(session.userId),
          toValue(session.generation),
          toValue(session.role)
        )
      )?.dataUpdatedAt,
    staleTime: 30_000,
  });
}
