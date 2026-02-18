import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useAuthStore } from "../stores/auth/auth";

import Login from "@views/loginPage/LoginPage.vue";
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
    component: () => import("/src/views/discsList/DiscList.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/statistics",
    name: "Statistics",
    component: () => import("/src/views/statistics/Statistics.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/calendar",
    name: "Calendar",
    component: () => import("/src/views/discsCalendar/DiscCalendar.vue"),
    meta: { requiresAuth: true, requiresRole: "user" }, // o sin "requiredRole" si quieres que otros lo vean también
  },
  {
    path: "/calendar-baby",
    name: "CalendarBaby",
    component: () =>
      import("/src/views/discsCalendarBaby/DiscCalendarBaby.vue"),
    meta: { requiresAuth: true, requiresRole: "babyUser" },
  },
  {
    path: "/import",
    name: "Import",
    component: () => import("/src/views/importPage/ImportPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/suggest",
    name: "Suggest",
    component: () => import("/src/views/importPage/SuggestPage.vue"),
    meta: { requiresAuth: true, requiresRole: "babyUser" },
  },
  {
    path: "/petitions",
    name: "Petitions",
    component: () => import("@/views/petitions/PetitionsPage.vue"),
    meta: { requiresAuth: true, requiresRole: "user" },
  },
  {
    path: "/recap",
    name: "Recap",
    component: () => import("/src/views/weekRecap/WeekRecap.vue"),
    meta: { requiresAuth: true, requiresRole: "riffValley" },
  },
  {
    path: "/content-calendar",
    name: "ContentCalendar",
    component: () => import("/src/views/contentCalendar/ContentCalendar.vue"),
    meta: { requiresAuth: true, requiresRole: "riffValley" },
  },
  {
    path: "/articles",
    name: "Articles",
    component: () => import("/src/views/articles/ArticlesKanban.vue"),
    meta: { requiresAuth: true, requiresRole: "riffValley" },
  },
  {
    path: "/password",
    name: "Password",
    component: () => import("/src/views/password/PasswordChange.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/users",
    name: "Users",
    component: () => import("/src/views/users/ManageUsers.vue"),
    meta: { requiresAuth: true, requiresRole: "superUser" },
  },
  {
    path: "/users/stats",
    name: "AdminStats",
    component: () => import("@views/users/AdminStats.vue"),
    meta: { requiresAuth: true, requiresRole: "superUser" },
  },
  {
    path: "/news",
    name: "News",
    component: () => import("/src/views/news/ManageNews.vue"),
    meta: { requiresAuth: true, requiresRole: "superUser" },
  },
  {
    path: "/versions",
    name: "versions-admin",   // 👈 cambia aquí
    component: () => import("/src/views/versions/ManageVersions.vue"),
    meta: { requiresAuth: true, requiresRole: "superUser" },
  },
  {
    path: '/versions/kanban',
    name: 'versions-kanban',
    component: () => import("/src/views/versions/VersionKanban.vue"),
    meta: { requiresAuth: true, requiresRole: "superUser" },
  },

  {
    path: "/list",
    name: "List",
    component: () => import("/src/layouts/list/ListLayout.vue"),
    meta: { requiresAuth: true, requiresRole: "riffValley" },
    children: [
      {
        path: "",
        name: "ListDefault",
        redirect: "/list/lists",
      },
      {
        path: "lists",
        name: "ListsList",
        component: () => import("/src/views/list/ListsList.vue"),
        meta: { requiresAuth: true, requiresRole: "riffValley" },
        props: true,
      },
      {
        path: "edit/:id",
        name: "EditList",
        component: () => import("/src/views/list/EditList.vue"),
        meta: { requiresAuth: true, requiresRole: "riffValley" },
        props: true,
      },
      {
        path: "create",
        name: "CreateList",
        component: () => import("/src/views/list/CreateList.vue"),
        meta: { requiresAuth: true, requiresRole: "riffValley" },
      },
    ],
  },
  {
    path: "/reunions",
    name: "Reunions",
    component: () => import("/src/layouts/reunions/ReunionLayout.vue"),
    meta: { requiresAuth: true, requiresRole: "riffValley" },
    children: [
      {
        path: "",
        name: "ReunionsDefault",
        redirect: "/reunions/list",
      },
      {
        path: "list",
        name: "ReunionsList",
        component: () => import("/src/views/reunions/ListReunion.vue"),
        meta: { requiresAuth: true, requiresRole: "riffValley" },
        props: true,
      },
      {
        path: ":id",
        name: "EditReunion",
        component: () => import("/src/views/reunions/EditReunion.vue"),
        meta: { requiresAuth: true, requiresRole: "riffValley" },
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
    component: () => import("/src/views/help/HowToUse.vue"),
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
    component: () => import("/src/views/spotify/SpotifyFestivalsKanban.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/spotify/generos",
    name: "SpotifyGeneros",
    component: () => import("/src/views/spotify/SpotifyGenresKanban.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/patch-notes",
    name: "PatchNotes",
    component: () => import("/src/views/patch-notes/PatchNotes.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/discos/radar",
    name: "RadarNovedades",
    component: () => import("/src/views/discos/RadarNovedades.vue"),
    meta: { requiresAuth: true, requiresRole: "riffValley" },
  },
  {
    path: "/discos/radar/:id",
    name: "RadarDetalle",
    component: () => import("/src/views/discos/RadarDetalle.vue"),
    meta: { requiresAuth: true, requiresRole: "riffValley" },
  },
  {
    path: "/discos/mejores",
    name: "MejoresDiscos",
    component: () => import("/src/views/discos/MejoresDiscos.vue"),
    meta: { requiresAuth: true, requiresRole: "riffValley" },
  },
  {
    path: "/discos/mejores/:id",
    name: "MejoresDetalle",
    component: () => import("/src/views/discos/MejoresDetalle.vue"),
    meta: { requiresAuth: true, requiresRole: "riffValley" },
  },
  {
    path: "/videos",
    name: "Videos",
    component: () => import("/src/views/videos/VideosKanban.vue"),
    meta: { requiresAuth: true, requiresRole: "riffValley" },
  },
  {
    path: "/videos/list/:id",
    name: "VideoListDetalle",
    component: () => import("/src/views/videos/VideoListDetalle.vue"),
    meta: { requiresAuth: true, requiresRole: "riffValley" },
    props: true,
  },
  {
    path: "/maintenance",
    name: "Maintenance",
    component: () => import("/src/views/maintenance/MaintenancePage.vue"),
    meta: { requiresAuth: false },
  },


];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  // 1. Lógica de Mantenimiento
  // Puedes activar esto con la variable de entorno VITE_MAINTENANCE_MODE=true
  // O descomentar la verificación por hostname si prefieres esa lógica específica
  // const isProdUrl = window.location.hostname === 'spammusic.netlify.app';
  console.log('MAINTENANCE_MODE:', import.meta.env.VITE_MAINTENANCE_MODE);
  const isMaintenance = import.meta.env.VITE_MAINTENANCE_MODE === 'true'; // || isProdUrl;

  if (isMaintenance) {
    // Si estamos en mantenimiento, permitir solo acceso a la página de mantenimiento
    if (to.name !== 'Maintenance') {
      return { name: "Maintenance" };
    }
  } else {
    // Si NO estamos en mantenimiento, redirigir fuera de la página de mantenimiento si intentan acceder
    if (to.name === 'Maintenance') {
      return { name: "Home" };
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: "Login" };
  }

  if (
    to.meta.requiresRole &&
    !(authStore.roles || "").includes(to.meta.requiresRole)
  ) {
    return { name: "Home" };
  }

  const restrictedForBabyUser = ["/import"];
  if (
    (authStore.roles || "").includes("babyUser") &&
    restrictedForBabyUser.includes(to.path)
  ) {
    return { name: "Home" };
  }

  return true;
});

export default router;
