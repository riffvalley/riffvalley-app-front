/// <reference types="vite/client" />

import type { Role } from '@/modules/auth';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiredRoles?: Role[];
    deniedRoles?: Role[];
  }
}

export {};
