import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import type { UserRole } from "@interfaces/auth";
import { useAuthStore } from "../stores/auth/auth";
import { hasMinimumRole } from "@helpers/roles";

import Login from "@views/loginPage/LoginPage.vue";

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
    component: () => import("@views/dashboard/DashboardPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/rankings",
    name: "Rankings",
    component: () => import("@views/homePage/HomePage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/disc-list",
    name: "DiscList",
    component: () => import("@views/discsList/DiscList.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/statistics",
    name: "Statistics",
    component: () => import("@views/statistics/Statistics.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/calendar",
    name: "Calendar",
    component: () => import("@views/discsCalendar/DiscCalendar.vue"),
    meta: { requiresAuth: true, requiresRole: "user" },
  },
  {
    path: "/calendar-baby",
    name: "CalendarBaby",
    component: () => import("@views/discsCalendarBaby/DiscCalendarBaby.vue"),
    meta: { requiresAuth: true, requiresRole: "user" },
  },
  {
    path: "/import",
    name: "Import",
    component: () => import("@views/importPage/ImportPage.vue"),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
  },
  {
    path: "/suggest",
    name: "Suggest",
    component: () => import("@views/importPage/SuggestPage.vue"),
    meta: { requiresAuth: true, requiresRole: "user" },
  },
  {
    path: "/petitions",
    name: "Petitions",
    component: () => import("@views/petitions/PetitionsPage.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
  },
  {
    path: "/suggestions",
    name: "Suggestions",
    component: () => import("@views/suggestions/SuggestionsPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/suggestions/management",
    name: "SuggestionsManagement",
    component: () => import("@views/suggestions/SuggestionsManagement.vue"),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
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
    component: () => import("@views/password/PasswordChange.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/users",
    name: "Users",
    component: () => import("@views/users/ManageUsers.vue"),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
  },
  {
    path: "/users/stats",
    name: "UserStats",
    component: () => import("@views/users/AdminStats.vue"),
    meta: { requiresAuth: true, requiresRole: "superadmin" },
  },
  {
    path: "/users/activity",
    name: "UserActivity",
    component: () => import("@views/users/UserActivity.vue"),
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
    component: () => import("@views/artists/ArtistManagement.vue"),
    meta: { requiresAuth: true, requiresRole: "riffvalley" },
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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  const isMaintenance = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

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

  if (to.meta.requiresAuth && !hasMinimumRole(authStore.role, "user")) {
    return { name: "Login" };
  }

  if (to.meta.requiresRole && !hasMinimumRole(authStore.role, to.meta.requiresRole)) {
    return { name: "Home" };
  }

  return true;
});

export default router;
