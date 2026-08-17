import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { authGuard, LoginPage } from '@/modules/auth';
import HomePage from "@views/homePage/HomePage.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: HomePage,
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
    meta: { requiresAuth: true, requiredRoles: ["user"] },
  },
  {
    path: "/calendar-baby",
    name: "CalendarBaby",
    component: () => import("@views/discsCalendarBaby/DiscCalendarBaby.vue"),
    meta: { requiresAuth: true, requiredRoles: ["babyUser"] },
  },
  {
    path: "/import",
    name: "Import",
    component: () => import("@views/importPage/ImportPage.vue"),
    meta: { requiresAuth: true, deniedRoles: ["babyUser"] },
  },
  {
    path: "/suggest",
    name: "Suggest",
    component: () => import("@views/importPage/SuggestPage.vue"),
    meta: { requiresAuth: true, requiredRoles: ["babyUser"] },
  },
  {
    path: "/petitions",
    name: "Petitions",
    component: () => import("@views/petitions/PetitionsPage.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
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
    meta: { requiresAuth: true, requiredRoles: ["superUser"] },
  },
  {
    path: "/recap",
    name: "Recap",
    component: () => import("@views/weekRecap/WeekRecap.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
  },
  {
    path: "/content-calendar",
    name: "ContentCalendar",
    component: () => import("@views/contentCalendar/ContentCalendar.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
  },
  {
    path: "/articles",
    name: "Articles",
    component: () => import("@views/articles/ArticlesKanban.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
  },
  {
    path: "/import-discs",
    name: "ImportDiscs",
    component: () => import("@views/importPage/ImportDiscs.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
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
    meta: { requiresAuth: true, requiredRoles: ["superUser"] },
  },
  {
    path: "/users/stats",
    name: "UserStats",
    component: () => import("@views/users/AdminStats.vue"),
    meta: { requiresAuth: true, requiredRoles: ["superUser"] },
  },
  {
    path: "/users/activity",
    name: "UserActivity",
    component: () => import("@views/users/UserActivity.vue"),
    meta: { requiresAuth: true, requiredRoles: ["superUser"] },
  },
  {
    path: "/news",
    name: "News",
    component: () => import("@views/news/ManageNews.vue"),
    meta: { requiresAuth: true, requiredRoles: ["superUser"] },
  },
  {
    path: "/versions",
    name: "versions-admin",
    component: () => import("@views/versions/ManageVersions.vue"),
    meta: { requiresAuth: true, requiredRoles: ["superUser"] },
  },
  {
    path: "/versions/kanban",
    name: "versions-kanban",
    component: () => import("@views/versions/VersionKanban.vue"),
    meta: { requiresAuth: true, requiredRoles: ["superUser"] },
  },
  {
    path: "/list",
    name: "List",
    component: () => import("@/layouts/list/ListLayout.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
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
        meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
        props: true,
      },
      {
        path: "edit/:id",
        name: "EditList",
        component: () => import("@views/list/EditList.vue"),
        meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
        props: true,
      },
      {
        path: "create",
        name: "CreateList",
        component: () => import("@views/list/CreateList.vue"),
        meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
      },
    ],
  },
  {
    path: "/reunions",
    name: "Reunions",
    component: () => import("@/layouts/reunions/ReunionLayout.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
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
        meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
        props: true,
      },
      {
        path: ":id",
        name: "EditReunion",
        component: () => import("@views/reunions/EditReunion.vue"),
        meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
        props: true,
      },
    ],
  },
  {
    path: "/login",
    name: "Login",
    component: LoginPage,
  },
  {
    path: "/how-to-use",
    name: "HowToUse",
    component: () => import("@views/help/HowToUse.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/spotify",
    name: "Spotify",
    redirect: "/spotify/festivales",
  },
  {
    path: "/spotify/festivales",
    name: "SpotifyFestivales",
    component: () => import("@views/spotify/SpotifyFestivalsKanban.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/spotify/generos",
    name: "SpotifyGeneros",
    component: () => import("@views/spotify/SpotifyGenresKanban.vue"),
    meta: { requiresAuth: true },
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
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
  },
  {
    path: "/discos/radar/:id",
    name: "RadarDetalle",
    component: () => import("@views/discos/RadarDetalle.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
  },
  {
    path: "/discos/mejores",
    name: "MejoresDiscos",
    component: () => import("@views/discos/MejoresDiscos.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
  },
  {
    path: "/discos/mejores/:id",
    name: "MejoresDetalle",
    component: () => import("@views/discos/MejoresDetalle.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
  },
  {
    path: "/videos",
    name: "Videos",
    component: () => import("@views/videos/VideosKanban.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
  },
  {
    path: "/videos/list/:id",
    name: "VideoListDetalle",
    component: () => import("@views/videos/VideoListDetalle.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
    props: true,
  },
  {
    path: "/artists",
    name: "ArtistManagement",
    component: () => import("@views/artists/ArtistManagement.vue"),
    meta: { requiresAuth: true },
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
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
  },
  {
    path: "/disc-list-error",
    name: "DiscListError",
    component: () => import("@views/discsList/DiscListError.vue"),
    meta: { requiresAuth: true, requiredRoles: ["riffValley"] },
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

router.beforeEach(authGuard);

export default router;
