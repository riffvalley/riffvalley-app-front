import { computed } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";
import {
  approveRequest,
  createRequest,
  getAllRequests,
  getMyRequests,
  rejectRequest,
  reopenRequest,
  updateRequest,
} from "../api/requests";
import type { CreateRequestDto, UpdateRequestDto } from "../types/requests";

export const requestsQueryKey = ["requests"] as const;
export const myRequestsQueryKey = [...requestsQueryKey, "mine"] as const;
export const adminRequestsQueryKey = [...requestsQueryKey, "admin"] as const;

export function requestsQueryKeyForSession(scope: "mine" | "admin", userId: string | null, generation: number) {
  return [...requestsQueryKey, scope, userId, generation] as const;
}

function canAccessRequests(auth: ReturnType<typeof useAuthStore>, scope: "mine" | "admin") {
  return auth.authStatus === "authenticated"
    && auth.isAuthenticated
    && !!auth.userId
    && (scope === "mine" || hasMinimumRole(auth.role, "riffvalley"));
}

function assertRequestSession(
  auth: ReturnType<typeof useAuthStore>,
  userId: string | null,
  generation: number,
  signal: AbortSignal,
  scope: "mine" | "admin",
) {
  if (
    signal.aborted
    || !userId
    || !canAccessRequests(auth, scope)
    || auth.userId !== userId
    || auth.authSessionGeneration !== generation
  ) {
    throw new Error("La sesión cambió antes de completar la consulta de solicitudes.");
  }
}

export function useMyRequestsQuery() {
  const auth = useAuthStore();
  const queryKey = computed(() => requestsQueryKeyForSession("mine", auth.userId, auth.authSessionGeneration));
  return useQuery({
    queryKey,
    enabled: computed(() => canAccessRequests(auth, "mine")),
    queryFn: async ({ queryKey: key, signal }) => {
      const [, , userId, generation] = key;
      assertRequestSession(auth, userId, generation, signal, "mine");
      const result = await getMyRequests(signal);
      assertRequestSession(auth, userId, generation, signal, "mine");
      return result;
    },
    staleTime: 30_000,
    retry: false,
  });
}

export function useAdminRequestsQuery() {
  const auth = useAuthStore();
  const queryKey = computed(() => requestsQueryKeyForSession("admin", auth.userId, auth.authSessionGeneration));
  return useQuery({
    queryKey,
    enabled: computed(() => canAccessRequests(auth, "admin")),
    queryFn: async ({ queryKey: key, signal }) => {
      const [, , userId, generation] = key;
      assertRequestSession(auth, userId, generation, signal, "admin");
      const result = await getAllRequests(signal);
      assertRequestSession(auth, userId, generation, signal, "admin");
      return result;
    },
    staleTime: 30_000,
    retry: false,
  });
}

export function useRequestMutations() {
  const queryClient = useQueryClient();
  const invalidateRequests = () => queryClient.invalidateQueries({ queryKey: requestsQueryKey });
  return {
    create: useMutation({ mutationFn: (dto: CreateRequestDto) => createRequest(dto), onSuccess: invalidateRequests }),
    update: useMutation({ mutationFn: ({ id, dto }: { id: string; dto: UpdateRequestDto }) => updateRequest(id, dto), onSuccess: invalidateRequests }),
    approve: useMutation({ mutationFn: (id: string) => approveRequest(id), onSuccess: invalidateRequests }),
    reopen: useMutation({ mutationFn: (id: string) => reopenRequest(id), onSuccess: invalidateRequests }),
    reject: useMutation({ mutationFn: ({ id, notes }: { id: string; notes: string }) => rejectRequest(id, notes), onSuccess: invalidateRequests }),
  };
}
