import { createAuthStore, createSessionPersistence, readLegacySessionValue, login } from "@/modules/identity";
import { useWorkspaceStore } from "./workspace";
import { useCommunityFavoriteStore, useCommunityRatingStore } from "@/modules/community";
export const useAuthStore = createAuthStore({
  persistence: createSessionPersistence(() => localStorage),
  async login(payload) {
    const response = await login(payload);
    useWorkspaceStore().initialize({
      dashboardButtonsEnabled: response.dashboardButtonsEnabled === true,
      dashboardConfig: response.dashboardConfig ?? null,
      mobileDashboardConfig: response.mobileDashboardConfig ?? null,
    });
    return { token: response.token, username: response.username, userId: response.id,
      image: response.image || null, roles: response.roles || [] };
  },
  onLogout: () => {
    useWorkspaceStore().clear();
    useCommunityRatingStore().clear();
    useCommunityFavoriteStore().clear();
  },
});

export const readLegacyRolesRaw = () => readLegacySessionValue(() => localStorage, "roles");
export const readPersistedAvatar = () => readLegacySessionValue(() => localStorage, "image");
