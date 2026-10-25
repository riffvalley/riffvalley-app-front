import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth/stores/auth";
import { activityDashboardQueryKey } from "@/modules/identity/activity/composables/useActivityStatisticsQueries";
import {
  activateUserService,
  deactivateUserService,
  deleteUserService,
  postUserService,
  updateUserSuperAdminService,
} from "@/modules/identity/users/api/users";
import { adminUsersQueryKeyForSession } from "@/modules/identity/users/composables/useAdminUsersQuery";
import type { AdminUpdateUserPayload, RegisterUserPayload } from "@/modules/identity/users/types/users";

export interface AdminMutationSession {
  userId: string;
  generation: number;
}

interface SessionMutationVariables<T> {
  session: AdminMutationSession;
  payload: T;
}

interface UpdateAdminUserPayload {
  userId: string;
  changes: AdminUpdateUserPayload;
}

interface UserIdPayload {
  userId: string;
}

interface ActiveStatePayload extends UserIdPayload {
  active: boolean;
}

const staleSessionError = () => new Error("La sesión cambió antes de completar la operación.");

export function useAdminUserMutations() {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  const captureSession = (): AdminMutationSession | null => {
    if (
      authStore.authStatus !== "authenticated" ||
      !authStore.isAuthenticated ||
      !authStore.hasRole("superadmin") ||
      !authStore.userId
    ) {
      return null;
    }

    return { userId: authStore.userId, generation: authStore.authSessionGeneration };
  };

  const isCurrentSession = (session: AdminMutationSession): boolean =>
    authStore.authStatus === "authenticated" &&
    authStore.isAuthenticated &&
    authStore.hasRole("superadmin") &&
    authStore.userId === session.userId &&
    authStore.authSessionGeneration === session.generation;

  const assertCurrentSession = (session: AdminMutationSession) => {
    if (!isCurrentSession(session)) throw staleSessionError();
  };

  const invalidateAfterSuccess = async (session: AdminMutationSession, includeStats: boolean) => {
    if (!isCurrentSession(session)) return;

    await queryClient.invalidateQueries({
      queryKey: adminUsersQueryKeyForSession(session.userId, session.generation),
      exact: true,
    });
    if (includeStats && isCurrentSession(session)) {
      await queryClient.invalidateQueries({ queryKey: activityDashboardQueryKey });
    }
  };

  const createUser = useMutation({
    mutationFn: async ({ session, payload }: SessionMutationVariables<RegisterUserPayload>) => {
      assertCurrentSession(session);
      // Do not retain the registration response, which includes a token, in MutationCache.
      await postUserService(payload);
      assertCurrentSession(session);
    },
    onSuccess: (_data, variables) => invalidateAfterSuccess(variables.session, true),
  });

  const updateUser = useMutation({
    mutationFn: async ({ session, payload }: SessionMutationVariables<UpdateAdminUserPayload>) => {
      assertCurrentSession(session);
      await updateUserSuperAdminService(payload.userId, payload.changes);
      assertCurrentSession(session);
    },
    onSuccess: (_data, variables) => {
      const { changes } = variables.payload;
      const affectsStats = "username" in changes || "email" in changes || "createdAt" in changes;
      return invalidateAfterSuccess(variables.session, affectsStats);
    },
  });

  const setUserActive = useMutation({
    mutationFn: async ({ session, payload }: SessionMutationVariables<ActiveStatePayload>) => {
      assertCurrentSession(session);
      if (payload.active) await activateUserService(payload.userId);
      else await deactivateUserService(payload.userId);
      assertCurrentSession(session);
    },
    onSuccess: (_data, variables) => invalidateAfterSuccess(variables.session, true),
  });

  const deleteUser = useMutation({
    mutationFn: async ({ session, payload }: SessionMutationVariables<UserIdPayload>) => {
      assertCurrentSession(session);
      await deleteUserService(payload.userId);
      assertCurrentSession(session);
    },
    onSuccess: (_data, variables) => invalidateAfterSuccess(variables.session, true),
  });

  return { captureSession, isCurrentSession, createUser, updateUser, setUserActive, deleteUser };
}
