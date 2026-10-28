// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDashboardConfig } from './useDashboardConfig';
import { useDashboardPreferencesStore, type DashboardModuleConfig } from '@/modules/identity/account/preferences/stores/dashboardPreferences';
import { dashboardWidgetDefaults } from '@/app/dashboardWidgetRegistry';

const mocks = vi.hoisted(() => ({
  updateUserStore: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@stores/user/users', () => ({
  useUserStore: () => ({ updateUserStore: mocks.updateUserStore }),
}));

vi.mock('@services/swal/SwalService', () => ({
  default: { success: mocks.success, error: mocks.error },
}));

const targets = [
  { target: 'desktop' as const, storeKey: 'dashboardConfig', storageKey: 'dashboardConfig' },
  { target: 'mobile' as const, storeKey: 'mobileDashboardConfig', storageKey: 'mobileDashboardConfig' },
];

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function seedConfig(target: 'desktop' | 'mobile', config: DashboardModuleConfig[]) {
  const store = useDashboardPreferencesStore();
  if (target === 'mobile') store.setMobileDashboardConfig(config);
  else store.setDashboardConfig(config);
}

describe('useDashboardConfig remote persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setActivePinia(createPinia());
    mocks.updateUserStore.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the registry order and enabled defaults when preferences are absent', () => {
    const desktop = useDashboardConfig('desktop');
    const mobile = useDashboardConfig('mobile');
    const expected = dashboardWidgetDefaults.map(({ id, label, icon, size, enabled }) => ({
      id,
      label,
      icon,
      size,
      enabled,
    }));

    expect(desktop.modules.value).toEqual(expected);
    expect(mobile.modules.value).toEqual(expected);
    expect(desktop.modules.value.every(({ enabled }) => enabled)).toBe(true);
  });

  it('keeps known saved order and visibility while ignoring unknown IDs and adding new defaults', () => {
    seedConfig('desktop', [
      { id: 'future-widget', enabled: false },
      { id: 'portadaDia', enabled: false },
      { id: 'novedades', enabled: false },
    ]);
    const config = useDashboardConfig('desktop');

    expect(config.modules.value.slice(0, 2).map(({ id, enabled }) => ({ id, enabled }))).toEqual([
      { id: 'portadaDia', enabled: false },
      { id: 'novedades', enabled: false },
    ]);
    expect(config.modules.value).toHaveLength(dashboardWidgetDefaults.length);
    expect(config.modules.value.map(({ id }) => id)).not.toContain('future-widget');
    expect(config.modules.value[2].id).toBe('comunidad');
  });

  it('keeps desktop and mobile configurations independent', async () => {
    const desktop = useDashboardConfig('desktop');
    const mobile = useDashboardConfig('mobile');

    await desktop.disableModule('novedades');
    expect(desktop.isEnabled('novedades')).toBe(false);
    expect(mobile.isEnabled('novedades')).toBe(true);

    await mobile.disableModule('comunidad');
    expect(desktop.isEnabled('comunidad')).toBe(true);
    expect(mobile.isEnabled('comunidad')).toBe(false);

    const store = useDashboardPreferencesStore();
    expect(store.dashboardConfig?.some(({ id, enabled }) => id === 'novedades' && !enabled)).toBe(true);
    expect(store.mobileDashboardConfig?.some(({ id, enabled }) => id === 'comunidad' && !enabled)).toBe(true);
  });

  it.each(targets)('$target keeps editor, Pinia and localStorage after a successful save', async ({ target, storeKey, storageKey }) => {
    const savedByServer: DashboardModuleConfig[][] = [];
    mocks.updateUserStore.mockImplementation(async (payload) => {
      savedByServer.push(payload[storeKey]);
    });
    const config = useDashboardConfig(target);
    const store = useDashboardPreferencesStore();

    await config.disableModule('novedades');

    const expected = config.modules.value.map(({ id, enabled }) => ({ id, enabled }));
    expect(config.isEnabled('novedades')).toBe(false);
    expect(store[storeKey]).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? 'null')).toEqual(expected);
    expect(savedByServer).toEqual([expected]);
    expect(mocks.success).toHaveBeenCalledWith('Módulo desactivado');
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it.each(targets)('$target keeps editor and dashboard state in Pinia and saves remotely when localStorage writes throw', async ({ target, storeKey }) => {
    const savedByServer: DashboardModuleConfig[][] = [];
    mocks.updateUserStore.mockImplementation(async (payload) => {
      savedByServer.push(payload[storeKey]);
    });
    const config = useDashboardConfig(target);
    const dashboardViewConfig = useDashboardConfig(target);
    const store = useDashboardPreferencesStore();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    });

    await expect(config.disableModule('novedades')).resolves.toBeUndefined();

    const expected = config.modules.value.map(({ id, enabled }) => ({ id, enabled }));
    expect(config.isEnabled('novedades')).toBe(false);
    expect(dashboardViewConfig.isEnabled('novedades')).toBe(false);
    expect(store[storeKey]).toEqual(expected);
    expect(savedByServer).toEqual([expected]);
    expect(mocks.success).toHaveBeenCalledWith('Módulo desactivado');
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it.each(targets)('$target rolls back in Pinia after HTTP failure with denied storage and accepts the next save', async ({ target, storeKey }) => {
    const previous = [{ id: 'novedades', enabled: false }, { id: 'comunidad', enabled: true }];
    seedConfig(target, previous);
    const savedByServer: DashboardModuleConfig[][] = [];
    mocks.updateUserStore.mockRejectedValueOnce(new Error('network error'))
      .mockImplementation(async (payload) => {
        savedByServer.push(payload[storeKey]);
      });
    const editorConfig = useDashboardConfig(target);
    const dashboardViewConfig = useDashboardConfig(target);
    const store = useDashboardPreferencesStore();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    });

    await expect(editorConfig.resetToDefault()).resolves.toBeUndefined();

    expect(editorConfig.isEnabled('novedades')).toBe(false);
    expect(dashboardViewConfig.isEnabled('novedades')).toBe(false);
    expect(store[storeKey]).toEqual(previous);
    expect(savedByServer).toEqual([]);
    expect(mocks.error).toHaveBeenCalledWith('No se pudo guardar el cambio del dashboard');

    await editorConfig.disableModule('comunidad');
    const expected = editorConfig.modules.value.map(({ id, enabled }) => ({ id, enabled }));
    expect(editorConfig.isEnabled('comunidad')).toBe(false);
    expect(dashboardViewConfig.isEnabled('comunidad')).toBe(false);
    expect(store[storeKey]).toEqual(expected);
    expect(savedByServer).toEqual([expected]);
    expect(mocks.success).toHaveBeenCalledWith('Módulo desactivado');
  });

  it.each(targets)('$target keeps concurrent edits ordered with denied storage', async ({ target, storeKey }) => {
    const requests: ReturnType<typeof deferred<void>>[] = [];
    const savedByServer: DashboardModuleConfig[][] = [];
    mocks.updateUserStore.mockImplementation((payload) => {
      savedByServer.push(payload[storeKey]);
      const request = deferred<void>();
      requests.push(request);
      return request.promise;
    });
    const editorConfig = useDashboardConfig(target);
    const dashboardViewConfig = useDashboardConfig(target);
    const store = useDashboardPreferencesStore();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    });

    const firstSave = editorConfig.disableModule('novedades');
    const secondSave = editorConfig.disableModule('comunidad');
    const expected = editorConfig.modules.value.map(({ id, enabled }) => ({ id, enabled }));
    await Promise.resolve();

    expect(requests).toHaveLength(1);
    expect(store[storeKey]).toEqual(expected);
    expect(dashboardViewConfig.isEnabled('novedades')).toBe(false);
    expect(dashboardViewConfig.isEnabled('comunidad')).toBe(false);

    requests[0].reject(new Error('first save failed'));
    await firstSave;
    await Promise.resolve();
    expect(requests).toHaveLength(2);
    expect(store[storeKey]).toEqual(expected);

    requests[1].resolve();
    await secondSave;
    expect(savedByServer).toHaveLength(2);
    expect(store[storeKey]).toEqual(expected);
    expect(mocks.error).toHaveBeenCalledWith('No se pudo guardar el cambio del dashboard');
  });

  it('does not block the save queue when removing a migrated legacy config fails', async () => {
    localStorage.setItem('rv_dashboard_config', JSON.stringify([{ id: 'novedades', enabled: false }]));
    const savedByServer: DashboardModuleConfig[][] = [];
    mocks.updateUserStore.mockImplementation(async (payload) => {
      savedByServer.push(payload.dashboardConfig);
    });
    const removeItem = vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    });

    const config = useDashboardConfig('desktop');
    await Promise.resolve();
    await Promise.resolve();
    await config.disableModule('comunidad');

    expect(removeItem).toHaveBeenCalledWith('rv_dashboard_config');
    expect(config.isEnabled('novedades')).toBe(false);
    expect(config.isEnabled('comunidad')).toBe(false);
    expect(savedByServer).toHaveLength(2);
  });

  it.each(targets)('$target restores confirmed state after failure and accepts the next operation', async ({ target, storeKey, storageKey }) => {
    const previous = [{ id: 'novedades', enabled: false }, { id: 'comunidad', enabled: true }];
    seedConfig(target, previous);
    const previousStorage = localStorage.getItem(storageKey);
    const savedByServer: DashboardModuleConfig[][] = [];
    mocks.updateUserStore.mockRejectedValueOnce(new Error('network error'))
      .mockImplementation(async (payload) => {
        savedByServer.push(payload[storeKey]);
      });
    const config = useDashboardConfig(target);
    const dashboardViewConfig = useDashboardConfig(target);
    const store = useDashboardPreferencesStore();

    await config.resetToDefault();

    expect(config.isEnabled('novedades')).toBe(false);
    expect(dashboardViewConfig.isEnabled('novedades')).toBe(false);
    expect(store[storeKey]).toEqual(previous);
    expect(localStorage.getItem(storageKey)).toBe(previousStorage);
    expect(savedByServer).toEqual([]);
    expect(mocks.error).toHaveBeenCalledWith('No se pudo guardar el cambio del dashboard');
    expect(mocks.success).not.toHaveBeenCalled();

    await config.disableModule('comunidad');
    const expected = config.modules.value.map(({ id, enabled }) => ({ id, enabled }));
    expect(config.isEnabled('comunidad')).toBe(false);
    expect(store[storeKey]).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? 'null')).toEqual(expected);
    expect(savedByServer).toEqual([expected]);
  });

  it.each(targets)('$target serializes concurrent edits so a stale failure cannot roll back a later valid edit', async ({ target, storeKey, storageKey }) => {
    const requests: ReturnType<typeof deferred<void>>[] = [];
    mocks.updateUserStore.mockImplementation(() => {
      const request = deferred<void>();
      requests.push(request);
      return request.promise;
    });
    const config = useDashboardConfig(target);
    const store = useDashboardPreferencesStore();

    const firstSave = config.disableModule('novedades');
    const secondSave = config.disableModule('comunidad');
    const expected = config.modules.value.map(({ id, enabled }) => ({ id, enabled }));

    await Promise.resolve();
    expect(mocks.updateUserStore).toHaveBeenCalledOnce();
    expect(requests).toHaveLength(1);
    expect(config.isEnabled('novedades')).toBe(false);
    expect(config.isEnabled('comunidad')).toBe(false);
    expect(store[storeKey]).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? 'null')).toEqual(expected);

    requests[0].reject(new Error('first save failed'));
    await firstSave;
    await Promise.resolve();

    // The second HTTP write starts only after the first has settled. Its newer
    // optimistic state remains visible while it is pending.
    expect(mocks.updateUserStore).toHaveBeenCalledTimes(2);
    expect(requests).toHaveLength(2);
    expect(store[storeKey]).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? 'null')).toEqual(expected);

    requests[1].resolve();
    await secondSave;
    expect(store[storeKey]).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? 'null')).toEqual(expected);
    expect(mocks.error).toHaveBeenCalledWith('No se pudo guardar el cambio del dashboard');
  });

  it.each(targets)('$target rolls the latest failed edit back to the most recent confirmed save', async ({ target, storeKey, storageKey }) => {
    const requests: ReturnType<typeof deferred<void>>[] = [];
    mocks.updateUserStore.mockImplementation(() => {
      const request = deferred<void>();
      requests.push(request);
      return request.promise;
    });
    const config = useDashboardConfig(target);
    const store = useDashboardPreferencesStore();

    const firstSave = config.disableModule('novedades');
    const firstConfirmed = config.modules.value.map(({ id, enabled }) => ({ id, enabled }));
    const secondSave = config.disableModule('comunidad');
    await Promise.resolve();

    requests[0].resolve();
    await firstSave;
    await Promise.resolve();
    expect(requests).toHaveLength(2);

    requests[1].reject(new Error('second save failed'));
    await secondSave;

    expect(config.isEnabled('novedades')).toBe(false);
    expect(config.isEnabled('comunidad')).toBe(true);
    expect(store[storeKey]).toEqual(firstConfirmed);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? 'null')).toEqual(firstConfirmed);
  });
});
