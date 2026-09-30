import type { RouteLocationNormalized } from "vue-router";

interface RoutingSession { isAuthenticated: boolean; roles: string[] }

export function createSessionGuard(getSession: () => RoutingSession, maintenance: () => boolean) {
  return (to: RouteLocationNormalized) => {
    const authStore = getSession();
    const isMaintenance = maintenance();

    if (isMaintenance) {
      if (to.name !== 'Maintenance') {
        return { name: "Maintenance" };
      }
    } else {
      if (to.name === 'Maintenance') {
        return { name: "Home" };
      }
    }

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return { name: "Login" };
    }

    if (
      to.meta.requiresRole &&
      !authStore.roles.includes(to.meta.requiresRole)
    ) {
      return { name: "Home" };
    }

    const restrictedForBabyUser = ["/import"];
    if (
      authStore.roles.includes("babyUser") &&
      restrictedForBabyUser.includes(to.path)
    ) {
      return { name: "Home" };
    }

    return true;
  };
}
