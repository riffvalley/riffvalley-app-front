import { ref } from 'vue';

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
];

const LS_KEY = 'rv_dashboard_config';

function loadConfig(): DashboardModule[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_MODULES.map(m => ({ ...m }));
    const saved: { id: string; enabled: boolean }[] = JSON.parse(raw);
    const byId = Object.fromEntries(DEFAULT_MODULES.map(m => [m.id, m]));
    const merged = saved
      .filter(s => byId[s.id])
      .map(s => ({ ...byId[s.id], enabled: s.enabled }));
    const savedIds = new Set(saved.map(s => s.id));
    for (const m of DEFAULT_MODULES) {
      if (!savedIds.has(m.id)) merged.push({ ...m });
    }
    return merged;
  } catch {
    return DEFAULT_MODULES.map(m => ({ ...m }));
  }
}

function saveConfig(modules: DashboardModule[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(
    modules.map(m => ({ id: m.id, enabled: m.enabled }))
  ));
}

export function useDashboardConfig() {
  const modules = ref<DashboardModule[]>(loadConfig());

  function isEnabled(id: string): boolean {
    return modules.value.find(m => m.id === id)?.enabled ?? true;
  }

  function orderOf(id: string): number {
    return modules.value.findIndex(m => m.id === id);
  }

  function toggleModule(id: string) {
    const m = modules.value.find(m => m.id === id);
    if (m) {
      m.enabled = !m.enabled;
      saveConfig(modules.value);
    }
  }

  function reorder(fromIndex: number, toIndex: number) {
    const arr = [...modules.value];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    modules.value = arr;
    saveConfig(modules.value);
  }

  function resetToDefault() {
    modules.value = DEFAULT_MODULES.map(m => ({ ...m }));
    localStorage.removeItem(LS_KEY);
  }

  return { modules, isEnabled, orderOf, toggleModule, reorder, resetToDefault };
}
