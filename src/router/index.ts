import { createRouter, createWebHistory } from "vue-router";
import { watch } from "vue";
import type { RouteRecordRaw } from "vue-router";
import type { UserRole } from "@/modules/identity/shared";
import { useAuthStore, type AuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";

import Login from "@/modules/identity/auth/login/LoginView.vue";

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresRole?: UserRole;
  }
}

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/modules/dashboard"),
    meta: { requiresAuth: true },
  },
  {
    path: "/rankings",
    name: "Rankings",
    component: () => import("@/modules/catalog/top-discs/presentation/views/TopDiscsView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/disc-list",
    name: "DiscList",
    component: () => import("@/modules/catalog/discs/presentation/views/DiscListView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/statistics",
    name: "Statistics",
    component: () => import("@views/statistics/Statistics.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/activity",
    name: "Activity",
    component: () => import("@/modules/activity/presentation/views/ActivityView.vue"),
    meta: { requiresAuth: true, requiresRole: "user" },
  },
  {
    path: "/calendar",
    name: "Calendar",
    component: () => import("@/modules/catalog/calendar/presentation/views/CalendarRoleView.vue"),
    meta: { requiresAuth: true, requiresRole: "user" },
  },
  {
    path: "/calendar-baby",
    name: "CalendarBabyCompatibility",
    redirect: { name: "Calendar" },
    meta: { requiresAuth: true, requiresRole: "user" },
  },
  {
    path: "/import",
    name: "Import",
    component: () => import("@views/importPage/ImportPage.vue"),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
  },
  {
    path: "/disc-requests",
    name: "DiscRequests",
    component: () => import("@/modules/requests/presentation/views/SuggestPage.vue"),
    meta: { requiresAuth: true, requiresRole: "user" },
  },
  {
    path: "/admin/disc-requests",
    name: "AdminDiscRequests",
    component: () => import("@/modules/requests/presentation/views/PetitionsPage.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/feedback",
    name: "Feedback",
    component: () => import("@/modules/feedback/presentation/views/FeedbackView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/suggest",
    name: "LegacySuggest",
    redirect: (to) => ({ name: "DiscRequests", query: to.query, hash: to.hash }),
  },
  {
    path: "/petitions",
    name: "LegacyPetitions",
    redirect: (to) => ({ name: "AdminDiscRequests", query: to.query, hash: to.hash }),
  },
  {
    path: "/suggestions",
    name: "LegacySuggestions",
    redirect: (to) => ({ name: "Feedback", query: to.query, hash: to.hash }),
  },
  {
    path: "/admin/feedback",
    name: "AdminFeedback",
    component: () => import("@/modules/feedback/presentation/views/FeedbackManagementView.vue"),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
  },
  {
    path: "/suggestions/management",
    name: "LegacySuggestionsManagement",
    redirect: (to) => ({ name: "AdminFeedback", query: to.query, hash: to.hash }),
  },
  {
    path: "/recap",
    name: "Recap",
    component: () => import("@views/weekRecap/WeekRecap.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/content-calendar",
    name: "ContentCalendar",
    component: () => import("@views/contentCalendar/ContentCalendar.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/articles",
    name: "Articles",
    component: () => import("@views/articles/ArticlesKanban.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/import-discs",
    name: "ImportDiscs",
    component: () => import("@views/importPage/ImportDiscs.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/password",
    name: "Password",
    component: () => import("@/modules/identity/account/password-change/PasswordChangeView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/users",
    name: "Users",
    component: () => import("@/modules/identity/users/user-management/UserManagementView.vue"),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
  },
  {
    path: "/users/stats",
    meta: { requiresAuth: true, requiresRole: "superadmin" },
    component: () => import("@/modules/identity/activity/layout/UserStatisticsLayout.vue"),
    children: [
      {
        path: "",
        name: "UserStats",
        component: () => import("@/modules/identity/activity/overview/UserStatisticsView.vue"),
        meta: { requiresAuth: true, requiresRole: "superadmin" },
      },
      {
        path: "users",
        name: "UserStatsUsers",
        component: () => import("@/modules/identity/activity/user-activity/UserActivityView.vue"),
        meta: { requiresAuth: true, requiresRole: "superadmin" },
      },
      {
        path: "inactivity",
        name: "UserStatsInactivity",
        component: () => import("@/modules/identity/activity/inactivity/UserInactivityView.vue"),
        meta: { requiresAuth: true, requiresRole: "superadmin" },
      },
    ],
  },
  {
    path: "/users/inactivity",
    name: "UserInactivity",
    redirect: (to) => ({ name: "UserStatsInactivity", query: to.query, hash: to.hash }),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
  },
  {
    path: "/users/activity",
    name: "UserActivity",
    redirect: (to) => ({ name: "UserStatsUsers", query: to.query, hash: to.hash }),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
  },
  {
    path: "/news",
    name: "News",
    component: () => import("@views/news/ManageNews.vue"),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
  },
  {
    path: "/versions",
    name: "versions-admin",
    component: () => import("@views/versions/ManageVersions.vue"),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
  },
  {
    path: "/versions/kanban",
    name: "versions-kanban",
    component: () => import("@views/versions/VersionKanban.vue"),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
  },
  {
    path: "/list",
    name: "List",
    component: () => import("@/layouts/list/ListLayout.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
    children: [
      {
        path: "",
        name: "ListDefault",
        redirect: "/list/lists",
      },
      {
        path: "lists",
        name: "ListsList",
        component: () => import("@views/list/ListsList.vue"),
        meta: { requiresAuth: true, requiresRole: "riffvalley" },
        props: true,
      },
      {
        path: "edit/:id",
        name: "EditList",
        component: () => import("@views/list/EditList.vue"),
        meta: { requiresAuth: true, requiresRole: "riffvalley" },
        props: true,
      },
      {
        path: "create",
        name: "CreateList",
        component: () => import("@views/list/CreateList.vue"),
        meta: { requiresAuth: true, requiresRole: "riffvalley" },
      },
    ],
  },
  {
    path: "/reunions",
    name: "Reunions",
    component: () => import("@/layouts/reunions/ReunionLayout.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
    children: [
      {
        path: "",
        name: "ReunionsDefault",
        redirect: "/reunions/list",
      },
      {
        path: "list",
        name: "ReunionsList",
        component: () => import("@views/reunions/ListReunion.vue"),
        meta: { requiresAuth: true, requiresRole: "riffvalley" },
        props: true,
      },
      {
        path: ":id",
        name: "EditReunion",
        component: () => import("@views/reunions/EditReunion.vue"),
        meta: { requiresAuth: true, requiresRole: "riffvalley" },
        props: true,
      },
    ],
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
  },
  {
    path: "/how-to-use",
    name: "HowToUse",
    component: () => import("@views/help/HowToUse.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/riff-valley-playlists",
    name: "RiffValleyPlaylists",
    redirect: "/riff-valley-playlists/festivales",
  },
  {
    path: "/riff-valley-playlists/festivales",
    name: "RiffValleyPlaylistFestivals",
    component: () => import("@views/riffValleyPlaylists/RiffValleyPlaylistFestivalsKanban.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/riff-valley-playlists/generos",
    name: "RiffValleyPlaylistGenres",
    component: () => import("@views/riffValleyPlaylists/RiffValleyPlaylistGenresKanban.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/patch-notes",
    name: "PatchNotes",
    component: () => import("@views/patch-notes/PatchNotes.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/discos/radar",
    name: "RadarNovedades",
    component: () => import("@views/discos/RadarNovedades.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/discos/radar/:id",
    name: "RadarDetalle",
    component: () => import("@views/discos/RadarDetalle.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/discos/mejores",
    name: "MejoresDiscos",
    component: () => import("@views/discos/MejoresDiscos.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/discos/mejores/:id",
    name: "MejoresDetalle",
    component: () => import("@views/discos/MejoresDetalle.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/videos",
    name: "Videos",
    component: () => import("@views/videos/VideosKanban.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/videos/list/:id",
    name: "VideoListDetalle",
    component: () => import("@views/videos/VideoListDetalle.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
    props: true,
  },
  {
    path: "/artists",
    name: "ArtistManagement",
    component: () => import("@/modules/catalog/artists/presentation/views/ArtistManagementView.vue"),
    meta: { requiresAuth: true, requiresRole: "user" },
  },
  {
    path: "/national-releases/form",
    name: "NationalReleasePublic",
    component: () => import("@views/nationalReleases/NationalReleaseForm.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/national-releases",
    name: "NationalReleasesAdmin",
    component: () => import("@views/nationalReleases/NationalReleasesAdmin.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/disc-list-error",
    name: "DiscListError",
    component: () => import("@views/discsList/DiscListError.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/maintenance",
    name: "Maintenance",
    component: () => import("@views/maintenance/MaintenancePage.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/403",
    name: "Forbidden",
    component: () => import("@views/status/ForbiddenPage.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@views/status/NotFoundPage.vue"),
    meta: { requiresAuth: false },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

let stopActiveRouteAuthorizationWatch: (() => void) | undefined;
let activeRouteAuthorizationStore: AuthStore | undefined;

function watchActiveRouteAuthorization(authStore: AuthStore) {
  if (activeRouteAuthorizationStore === authStore) return;
  stopActiveRouteAuthorizationWatch?.();
  activeRouteAuthorizationStore = authStore;

  stopActiveRouteAuthorizationWatch = watch(
    [
      () => authStore.authStatus,
      () => authStore.role,
      () => router.currentRoute.value.meta.requiresRole,
    ],
    ([status, role, requiredRole]) => {
      if (status === "anonymous") {
        if (router.currentRoute.value.meta.requiresAuth) {
          void router.replace({ name: "Login" });
        }
      } else if (requiredRole && status === "authenticated" && !hasMinimumRole(role, requiredRole)) {
        void router.replace({ name: "Forbidden" });
      }
    },
    { flush: "sync" },
  );
}

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  watchActiveRouteAuthorization(authStore);

  const isMaintenance = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

  if (isMaintenance && to.name !== "Maintenance") {
    return { name: "Maintenance" };
  }

  const authStatus = await authStore.initializeAuth();
  if (authStatus === "error") {
    // Keep the existing password login reachable when session recovery is unavailable.
    if (["Login", "Maintenance", "NotFound"].includes(String(to.name))) return true;
    // A temporary Identity failure must not be interpreted as an anonymous session.
    return false;
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: "Login" };
  }

  if (to.meta.requiresAuth && !hasMinimumRole(authStore.role, "user")) {
    return { name: "Forbidden" };
  }

  if (to.meta.requiresRole && !hasMinimumRole(authStore.role, to.meta.requiresRole)) {
    return { name: "Forbidden" };
  }

  return true;
});

export default router;
