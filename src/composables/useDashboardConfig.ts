import { computed, ref } from 'vue';
import { useAuthStore, type DashboardModuleConfig } from '@stores/auth/auth';
import { useUserStore } from '@stores/user/users';
import SwalService from '@services/swal/SwalService';

export interface DashboardModule {
  id: string;
  label: string;
  icon: string;
  size: 'full' | 'half';
  enabled: boolean;
}

const DEFAULT_MODULES: DashboardModule[] = [
  { id: 'novedades',      label: 'Novedades Riff Valley',    icon: 'fa-solid fa-newspaper',      size: 'half', enabled: true },
  { id: 'comunidad',      label: 'Comunidad / Top usuarios', icon: 'fa-solid fa-users',           size: 'half', enabled: true },
  { id: 'discoAleatorio', label: 'Disco aleatorio',          icon: 'fa-solid fa-shuffle',         size: 'half', enabled: true },
  { id: 'portadaDia',     label: 'Portada del día',          icon: 'fa-solid fa-image',           size: 'half', enabled: true },
  { id: 'top3mes',        label: 'Top 3 Mes actual',         icon: 'fa-solid fa-fire',            size: 'full', enabled: true },
  { id: 'top3semana',     label: 'Top 3 Semana actual',      icon: 'fa-solid fa-fire',            size: 'full', enabled: true },
  { id: 'artistas',       label: 'Tus artistas favoritos',   icon: 'fa-solid fa-heart',           size: 'full', enabled: true },
  { id: 'cementerio',     label: 'Cementerio de discos',     icon: 'fa-solid fa-skull',           size: 'half', enabled: true },
  { id: 'mundoMusical',   label: 'Tu mundo musical',         icon: 'fa-solid fa-earth-americas',  size: 'half', enabled: true },
  { id: 'ultimosVotos',   label: 'Tus últimos 5 votos',      icon: 'fa-solid fa-clock-rotate-left', size: 'half', enabled: true },
  { id: 'aventura',       label: 'Crea tu propia aventura',  icon: 'fa-solid fa-book-open',       size: 'half', enabled: true },
];

// Config antigua guardada solo en localStorage, previa a persistir en el backend.
const LEGACY_LS_KEY = 'rv_dashboard_config';

function loadLegacyConfig(): DashboardModuleConfig[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function mergeWithDefaults(saved: DashboardModuleConfig[] | null): DashboardModule[] {
  if (!saved || !saved.length) return DEFAULT_MODULES.map(m => ({ ...m }));
  const byId = Object.fromEntries(DEFAULT_MODULES.map(m => [m.id, m]));
  const merged = saved
    .filter(s => byId[s.id])
    .map(s => ({ ...byId[s.id], enabled: s.enabled }));
  const savedIds = new Set(saved.map(s => s.id));
  for (const m of DEFAULT_MODULES) {
    if (!savedIds.has(m.id)) merged.push({ ...m });
  }
  return merged;
}

export type DashboardConfigTarget = 'desktop' | 'mobile';

export function useDashboardConfig(target: DashboardConfigTarget = 'desktop') {
  const authStore = useAuthStore();
  const userStore = useUserStore();
  const isMobile = target === 'mobile';

  // `successMessage` es opcional para no forzar un toast en llamadas internas
  // (p.ej. la migración de la config antigua al montar). `payloadOverride` es
  // solo para resetToDefault, que siempre guarda [] y no el array actual.
  function persist(successMessage?: string, payloadOverride?: DashboardModuleConfig[]) {
    const payload = payloadOverride ?? modules.value.map(m => ({ id: m.id, enabled: m.enabled }));
    if (isMobile) {
      authStore.setMobileDashboardConfig(payload);
      userStore.updateUserStore({ mobileDashboardConfig: payload })
        .then(() => { if (successMessage) SwalService.success(successMessage); })
        .catch(() => { SwalService.error('No se pudo guardar el cambio del dashboard'); });
    } else {
      authStore.setDashboardConfig(payload);
      userStore.updateUserStore({ dashboardConfig: payload })
        .then(() => { if (successMessage) SwalService.success(successMessage); })
        .catch(() => { SwalService.error('No se pudo guardar el cambio del dashboard'); });
    }
  }

  let initial = isMobile ? authStore.mobileDashboardConfig : authStore.dashboardConfig;
  // La migración de la config antigua (localStorage previo al backend) solo
  // aplica al dashboard de escritorio: el móvil nunca tuvo esa versión legacy.
  let migrateLegacy = false;
  if (!isMobile && !initial) {
    const legacy = loadLegacyConfig();
    if (legacy) {
      initial = legacy;
      migrateLegacy = true;
    }
  }

  const modules = ref<DashboardModule[]>(mergeWithDefaults(initial));

  if (migrateLegacy) {
    persist();
    localStorage.removeItem(LEGACY_LS_KEY);
  }

  const enabledModules = computed(() => modules.value.filter(m => m.enabled));
  const disabledModules = computed(() => modules.value.filter(m => !m.enabled));

  function isEnabled(id: string): boolean {
    return modules.value.find(m => m.id === id)?.enabled ?? true;
  }

  function orderOf(id: string): number {
    return modules.value.findIndex(m => m.id === id);
  }

  // Mueve `id` justo antes de `beforeId` (o al final si es null), sin alterar
  // el orden relativo del resto. Al filtrar por enabled para pintar el grid,
  // los módulos desactivados intercalados no afectan al orden visual entre
  // los que sí se ven — por eso basta con un único array ordenado.
  function moveModule(id: string, beforeId: string | null, opts?: { enable?: boolean }) {
    const idx = modules.value.findIndex(m => m.id === id);
    if (idx === -1) return;
    const arr = [...modules.value];
    const [moved] = arr.splice(idx, 1);
    if (opts?.enable !== undefined) moved.enabled = opts.enable;
    const targetIdx = beforeId ? arr.findIndex(m => m.id === beforeId) : -1;
    arr.splice(targetIdx === -1 ? arr.length : targetIdx, 0, moved);
    modules.value = arr;
    persist(opts?.enable ? 'Módulo activado' : 'Orden actualizado');
  }

  // Mueve varios módulos a la vez (p.ej. los dos 1x1 de una fila), preservando
  // su orden relativo entre sí, justo antes de `beforeId` (o al final si es
  // null). Un único persist() para todo el grupo, en vez de uno por módulo.
  function moveGroup(ids: string[], beforeId: string | null) {
    const idSet = new Set(ids);
    const extracted: DashboardModule[] = [];
    for (const m of modules.value) if (idSet.has(m.id)) extracted.push(m);
    const rest = modules.value.filter(m => !idSet.has(m.id));
    const targetIdx = beforeId ? rest.findIndex(m => m.id === beforeId) : -1;
    rest.splice(targetIdx === -1 ? rest.length : targetIdx, 0, ...extracted);
    modules.value = rest;
    persist('Orden actualizado');
  }

  function enableModule(id: string) {
    moveModule(id, null, { enable: true });
  }

  function disableModule(id: string) {
    const m = modules.value.find(m => m.id === id);
    if (m && m.enabled) {
      m.enabled = false;
      persist('Módulo desactivado');
    }
  }

  function resetToDefault() {
    modules.value = DEFAULT_MODULES.map(m => ({ ...m }));
    // [] y no null: el DTO del backend valida @IsArray() (no acepta null).
    persist('Dashboard restablecido a valores por defecto', []);
  }

  return {
    modules, enabledModules, disabledModules,
    isEnabled, orderOf,
    moveModule, moveGroup, enableModule, disableModule,
    resetToDefault,
  };
}
