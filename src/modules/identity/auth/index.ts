import { useAuthStore } from "./stores/auth";

export { useAuthStore };
export type AuthStore = ReturnType<typeof useAuthStore>;

export {
  broadcastAuthPermissionsChanged,
  subscribeToRemoteAuthLogin,
  subscribeToRemoteAuthLogout,
  subscribeToRemoteAuthPermissionsChanged,
} from "./api/sessionAuthCoordinator";
