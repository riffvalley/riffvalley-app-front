import { createAuthStore, createSessionPersistence, readLegacySessionValue, login } from "@/modules/identity";
import { useWorkspaceStore } from "./workspace";
import { communityFavoriteState } from "@/modules/community/favorites/application/favoriteState";
import { communityPendingState } from "@/modules/community/pendings/application/pendingState";
import { communityRatingState } from "@/modules/community/ratings/application/ratingState";

function clearCommunitySessionState() {
  communityRatingState.clear();
  communityFavoriteState.clear();
  communityPendingState.clear();
}

export const useAuthStore = createAuthStore({
  persistence: createSessionPersistence(() => localStorage),
  async login(payload) {
    const response = await login(payload);
    clearCommunitySessionState();
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
    clearCommunitySessionState();
  },
});

export const readLegacyRolesRaw = () => readLegacySessionValue(() => localStorage, "roles");
export const readPersistedAvatar = () => readLegacySessionValue(() => localStorage, "image");
