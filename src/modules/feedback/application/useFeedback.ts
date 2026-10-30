import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";
import { invalidateSidebarSummary } from "@/app/sidebarSummary";
import { getCurrentVersionItems } from "@services/versions/currentVersionItems";
import {
  completeFeedback,
  createFeedback,
  deleteFeedback,
  getFeedback,
  getMyFeedback,
  rejectFeedback,
  reopenFeedback,
  updateFeedback,
} from "../api/feedback";
import type { FeedbackListParams, FeedbackType, FeedbackStatus } from "../types/feedback";

export const feedbackQueryKey = ["feedback"] as const;
export const myFeedbackQueryKey = [...feedbackQueryKey, "mine"] as const;
export const adminFeedbackQueryKey = [...feedbackQueryKey, "admin"] as const;
export const currentVersionItemsQueryKey = ["versions", "current-items"] as const;

export function feedbackQueryKeyForSession(
  scope: "mine" | "admin",
  userId: string | null,
  generation: number,
) {
  return [...feedbackQueryKey, scope, userId, generation] as const;
}

export function adminFeedbackQueryKeyForSession(
  params: FeedbackListParams,
  userId: string | null,
  generation: number,
) {
  return [...feedbackQueryKeyForSession("admin", userId, generation), params.type ?? "all", params.status ?? "all"] as const;
}

function canReadFeedback(auth: ReturnType<typeof useAuthStore>, scope: "mine" | "admin") {
  return auth.authStatus === "authenticated"
    && auth.isAuthenticated
    && !!auth.userId
    && (scope === "mine" || hasMinimumRole(auth.role, "superadmin"));
}

function assertFeedbackSession(
  auth: ReturnType<typeof useAuthStore>,
  userId: string | null,
  generation: number,
  signal: AbortSignal,
  scope: "mine" | "admin",
): asserts userId is string {
  if (
    signal.aborted
    || !userId
    || !canReadFeedback(auth, scope)
    || auth.userId !== userId
    || auth.authSessionGeneration !== generation
  ) {
    throw new Error("La sesión cambió antes de completar la consulta de Feedback.");
  }
}

export function useMyFeedbackQuery() {
  const auth = useAuthStore();
  const queryKey = computed(() => feedbackQueryKeyForSession("mine", auth.userId, auth.authSessionGeneration));
  return useQuery({
    queryKey,
    enabled: computed(() => canReadFeedback(auth, "mine")),
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ queryKey: requestedKey, signal }) => {
      const [, , userId, generation] = requestedKey;
      assertFeedbackSession(auth, userId, generation, signal, "mine");
      const result = await getMyFeedback(signal);
      assertFeedbackSession(auth, userId, generation, signal, "mine");
      return result;
    },
  });
}

export function useAdminFeedbackQuery(
  type: MaybeRefOrGetter<FeedbackType | "all">,
  status: MaybeRefOrGetter<FeedbackStatus | "all">,
) {
  const auth = useAuthStore();
  const params = computed<FeedbackListParams>(() => ({
    ...(toValue(type) !== "all" ? { type: toValue(type) } : {}),
    ...(toValue(status) !== "all" ? { status: toValue(status) } : {}),
  }));
  const queryKey = computed(() => adminFeedbackQueryKeyForSession(params.value, auth.userId, auth.authSessionGeneration));

  return useQuery({
    queryKey,
    enabled: computed(() => canReadFeedback(auth, "admin")),
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ queryKey: requestedKey, signal }) => {
      const [, , userId, generation] = requestedKey;
      const requestedType = requestedKey[4];
      const requestedStatus = requestedKey[5];
      assertFeedbackSession(auth, userId, generation, signal, "admin");
      const result = await getFeedback({
        ...(requestedType !== "all" ? { type: requestedType as FeedbackType } : {}),
        ...(requestedStatus !== "all" ? { status: requestedStatus as FeedbackStatus } : {}),
      }, signal);
      assertFeedbackSession(auth, userId, generation, signal, "admin");
      return result;
    },
  });
}

export function useCurrentFeedbackVersionItemsQuery(enabled: MaybeRefOrGetter<boolean>) {
  const auth = useAuthStore();
  const isEnabled = computed(() => toValue(enabled) && canReadFeedback(auth, "admin"));
  const queryKey = computed(() => [...currentVersionItemsQueryKey, auth.userId, auth.authSessionGeneration] as const);
  return useQuery({
    queryKey,
    enabled: isEnabled,
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ queryKey: requestedKey, signal }) => {
      const [, , userId, generation] = requestedKey;
      assertFeedbackSession(auth, userId, generation, signal, "admin");
      const result = await getCurrentVersionItems(signal);
      assertFeedbackSession(auth, userId, generation, signal, "admin");
      return result;
    },
  });
}

export function useFeedbackMutations() {
  const queryClient = useQueryClient();
  const invalidateFeedback = () => queryClient.invalidateQueries({ queryKey: feedbackQueryKey });
  const invalidateFeedbackAndSidebar = async () => {
    await Promise.all([
      invalidateFeedback(),
      invalidateSidebarSummary(queryClient),
    ]);
  };

  return {
    create: useMutation({ mutationFn: createFeedback, onSuccess: invalidateFeedbackAndSidebar }),
    update: useMutation({ mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof updateFeedback>[1] }) => updateFeedback(id, dto), onSuccess: invalidateFeedback }),
    reopen: useMutation({ mutationFn: reopenFeedback, onSuccess: invalidateFeedbackAndSidebar }),
    reject: useMutation({ mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason: string }) => rejectFeedback(id, { rejectionReason }), onSuccess: invalidateFeedbackAndSidebar }),
    complete: useMutation({ mutationFn: ({ id, versionItemId }: { id: string; versionItemId?: string }) => completeFeedback(id, { versionItemId }), onSuccess: invalidateFeedbackAndSidebar }),
    remove: useMutation({ mutationFn: deleteFeedback, onSuccess: invalidateFeedbackAndSidebar }),
  };
}
