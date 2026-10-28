import { computed } from 'vue';
import { useDashboardPreferences, type DashboardModuleConfig } from '@/modules/identity/account';
import { useUserStore } from '@stores/user/users';
import SwalService from '@services/swal/SwalService';
import {
  dashboardWidgetDefaults,
  isDashboardWidgetId,
  type DashboardModule,
} from '@/app/dashboardWidgetRegistry';

export type { DashboardModule } from '@/app/dashboardWidgetRegistry';

// Config antigua guardada solo en localStorage, previa a persistir en el backend.
const LEGACY_LS_KEY = 'rv_dashboard_config';

function loadLegacyConfig(): DashboardModuleConfig[] | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(LEGACY_LS_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function removeLegacyConfig() {
  try {
    localStorage.removeItem(LEGACY_LS_KEY);
  } catch {
    // Legacy cleanup is best-effort and must not reject the save queue.
  }
}

function mergeWithDefaults(saved: DashboardModuleConfig[] | null): DashboardModule[] {
  if (!saved || !saved.length) return dashboardWidgetDefaults.map(m => ({ ...m }));
  const byId = Object.fromEntries(dashboardWidgetDefaults.map(m => [m.id, m]));
  const merged = saved
    .filter(s => isDashboardWidgetId(s.id))
    .map(s => ({ ...byId[s.id], enabled: s.enabled }));
  const savedIds = new Set(merged.map(m => m.id));
  for (const m of dashboardWidgetDefaults) {
    if (!savedIds.has(m.id)) merged.push({ ...m });
  }
  return merged;
}

export type DashboardConfigTarget = 'desktop' | 'mobile';

interface TargetSaveState {
  confirmed: DashboardModuleConfig[] | null;
  revision: number;
}

interface PreferencesSaveState {
  queue: Promise<void>;
  targets: Record<DashboardConfigTarget, TargetSaveState>;
}

// updateUserStore dispara PATCHes sin ordenarlos. Una cola por store evita que
// dos escrituras del editor lleguen al servidor ni resuelvan fuera de orden.
const saveStates = new WeakMap<object, PreferencesSaveState>();

function copyConfig(config: DashboardModuleConfig[] | null): DashboardModuleConfig[] | null {
  return config?.map(item => ({ ...item })) ?? null;
}

export function useDashboardConfig(target: DashboardConfigTarget = 'desktop') {
  const dashboardPreferencesStore = useDashboardPreferences();
  const userStore = useUserStore();
  const isMobile = target === 'mobile';
  const storeKey = isMobile ? 'mobileDashboardConfig' : 'dashboardConfig';

  function getSaveState(): PreferencesSaveState {
    const existing = saveStates.get(dashboardPreferencesStore);
    if (existing) return existing;

    const state: PreferencesSaveState = {
      queue: Promise.resolve(),
      targets: {
        desktop: { confirmed: copyConfig(dashboardPreferencesStore.dashboardConfig), revision: 0 },
        mobile: { confirmed: copyConfig(dashboardPreferencesStore.mobileDashboardConfig), revision: 0 },
      },
    };
    saveStates.set(dashboardPreferencesStore, state);
    return state;
  }

  // `successMessage` es opcional para no forzar un toast en llamadas internas
  // (p.ej. la migración de la config antigua al montar). `payloadOverride` es
  // solo para resetToDefault, que siempre guarda [] y no el array actual.
  function persist(
    successMessage?: string,
    payloadOverride?: DashboardModuleConfig[],
    onSuccess?: () => void,
  ): Promise<void> {
    const payload = payloadOverride ?? modules.value.map(m => ({ id: m.id, enabled: m.enabled }));
    const saveState = getSaveState();
    const targetState = saveState.targets[target];
    const revision = ++targetState.revision;

    // Optimistic update remains visible immediately to the editor and every
    // other consumer deriving its modules from this Pinia store.
    setStoredConfig(copyConfig(payload));

    const operation = saveState.queue.then(async () => {
      try {
        await userStore.updateUserStore({ [storeKey]: copyConfig(payload) });
      } catch {
        // An older failure must not replace a newer optimistic edit. The
        // latest failed operation rolls back to the last server-confirmed value.
        if (revision === targetState.revision) {
          setStoredConfig(copyConfig(targetState.confirmed));
        }
        SwalService.error('No se pudo guardar el cambio del dashboard');
        return;
      }

      targetState.confirmed = copyConfig(payload);
      if (successMessage) SwalService.success(successMessage);
      onSuccess?.();
    });
    saveState.queue = operation.then(() => undefined);
    return operation;
  }

  function setStoredConfig(config: DashboardModuleConfig[] | null) {
    if (isMobile) dashboardPreferencesStore.setMobileDashboardConfig(config);
    else dashboardPreferencesStore.setDashboardConfig(config);
  }

  let initial = isMobile ? dashboardPreferencesStore.mobileDashboardConfig : dashboardPreferencesStore.dashboardConfig;
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

  const modules = computed(() => mergeWithDefaults(
    isMobile ? dashboardPreferencesStore.mobileDashboardConfig : dashboardPreferencesStore.dashboardConfig,
  ));

  if (migrateLegacy) {
    persist(undefined, initial?.map(({ id, enabled }) => ({ id, enabled })), removeLegacyConfig);
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
    if (idx === -1) return Promise.resolve();
    const arr = [...modules.value];
    const [module] = arr.splice(idx, 1);
    const moved = { ...module, enabled: opts?.enable ?? module.enabled };
    const targetIdx = beforeId ? arr.findIndex(m => m.id === beforeId) : -1;
    arr.splice(targetIdx === -1 ? arr.length : targetIdx, 0, moved);
    return persist(opts?.enable ? 'Módulo activado' : 'Orden actualizado', arr.map(m => ({ id: m.id, enabled: m.enabled })));
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
    return persist('Orden actualizado', rest.map(m => ({ id: m.id, enabled: m.enabled })));
  }

  function enableModule(id: string) {
    return moveModule(id, null, { enable: true });
  }

  function disableModule(id: string) {
    if (!modules.value.some(m => m.id === id && m.enabled)) return;
    const next = modules.value.map(m => m.id === id ? { ...m, enabled: false } : m);
    return persist('Módulo desactivado', next.map(({ id: moduleId, enabled }) => ({ id: moduleId, enabled })));
  }

  function resetToDefault() {
    // [] y no null: el DTO del backend valida @IsArray() (no acepta null).
    return persist('Dashboard restablecido a valores por defecto', []);
  }

  return {
    modules, enabledModules, disabledModules,
    isEnabled, orderOf,
    moveModule, moveGroup, enableModule, disableModule,
    resetToDefault,
  };
}
