import { computed } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import {
  createSavedDiscFilter,
  deleteSavedDiscFilter,
  getSavedDiscFilters,
  updateSavedDiscFilter,
} from "../api/savedDiscFilters";
import type {
  SaveDiscFilterPayload,
  SavedDiscFilter,
  UpdateDiscFilterPayload,
} from "../types/savedDiscFilter";

export const savedDiscFiltersQueryKey = ["catalog", "disc-list", "saved-filters"] as const;

export function savedDiscFiltersQueryKeyForSession(userId: string | null, generation: number) {
  return [...savedDiscFiltersQueryKey, userId, generation] as const;
}

export function useSavedDiscFilters() {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();
  const sessionIsCurrent = (userId: string | null, generation: number) =>
    authStore.authStatus === "authenticated" &&
    authStore.isAuthenticated &&
    authStore.userId === userId &&
    authStore.authSessionGeneration === generation;
  const currentSession = () => {
    if (!sessionIsCurrent(authStore.userId, authStore.authSessionGeneration) || !authStore.userId)
      throw new Error("La sesión cambió antes de completar la operación.");
    return { userId: authStore.userId, generation: authStore.authSessionGeneration };
  };

  const query = useQuery({
    queryKey: computed(() =>
      savedDiscFiltersQueryKeyForSession(authStore.userId, authStore.authSessionGeneration)
    ),
    enabled: computed(() => authStore.isAuthenticated && Boolean(authStore.userId)),
    queryFn: ({ signal }) => getSavedDiscFilters(signal),
    staleTime: 30_000,
  });

  const invalidate = (userId: string, generation: number) =>
    queryClient.invalidateQueries({
      queryKey: savedDiscFiltersQueryKeyForSession(userId, generation),
      exact: true,
    });

  const create = useMutation({
    mutationFn: async (payload: SaveDiscFilterPayload) => {
      const session = currentSession();
      const result = await createSavedDiscFilter(payload);
      if (!sessionIsCurrent(session.userId, session.generation))
        throw new Error("La sesión cambió antes de completar la operación.");
      return { session, result };
    },
    onSuccess: ({ session }) => invalidate(session.userId, session.generation),
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateDiscFilterPayload }) => {
      const session = currentSession();
      const result = await updateSavedDiscFilter(id, payload);
      if (!sessionIsCurrent(session.userId, session.generation))
        throw new Error("La sesión cambió antes de completar la operación.");
      return { session, result };
    },
    onSuccess: ({ session }) => invalidate(session.userId, session.generation),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const session = currentSession();
      await deleteSavedDiscFilter(id);
      if (!sessionIsCurrent(session.userId, session.generation))
        throw new Error("La sesión cambió antes de completar la operación.");
      return session;
    },
    onSuccess: (session) => invalidate(session.userId, session.generation),
  });

  return {
    filters: computed(() => query.data.value ?? [] as SavedDiscFilter[]),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    retry: query.refetch,
    create,
    update,
    remove,
  };
}
