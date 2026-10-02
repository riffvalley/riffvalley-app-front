// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import router from '../../../../src/app/router';
import { createSessionGuard } from '../../../../src/app/router/sessionGuard';
import { useSupportStore } from '../../../../src/stores/support/support';
import { setPendingSuggestionIds } from '../../../../src/app/dependencies/suggestions';
import SidebarMenu from '../../../../src/layouts/default/components/SidebarMenu.vue';

const { refreshPending, roleState } = vi.hoisted(() => ({
  refreshPending: vi.fn(),
  roleState: { current: 'superUser' },
}));
vi.mock('@/app/dependencies/suggestions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/app/dependencies/suggestions')>();
  return { ...actual, refreshPendingSuggestionIds: refreshPending };
});
vi.mock('@/app/dependencies/workspace', () => ({
  useWorkspaceStore: () => ({ dashboardButtonsEnabled: false }),
}));
vi.mock('@stores/auth/auth.ts', () => ({
  useAuthStore: () => ({ hasRole: (role: string) => roleState.current === role, logout: vi.fn() }),
}));
vi.mock('@services/versions/versions', () => ({ getLatestPublicVersion: vi.fn().mockResolvedValue(null) }));
vi.mock('@services/requests/requests', () => ({ getAllRequests: vi.fn().mockResolvedValue([]) }));

describe('suggestions access, read persistence, and sidebar badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    roleState.current = 'superUser';
    refreshPending.mockResolvedValue([]);
  });

  it('keeps both lazy routes authenticated and restricts management to superUser', () => {
    const userRoute = router.getRoutes().find((route) => route.path === '/suggestions');
    const managementRoute = router.getRoutes().find((route) => route.path === '/suggestions/management');
    expect(userRoute?.meta).toMatchObject({ requiresAuth: true });
    expect(userRoute?.meta.requiresRole).toBeUndefined();
    expect(managementRoute?.meta).toMatchObject({ requiresAuth: true, requiresRole: 'superUser' });
    expect(typeof userRoute?.components?.default).toBe('function');
    expect(typeof managementRoute?.components?.default).toBe('function');
  });

  it('redirects anonymous users to Login and authenticated users without superUser away from management', () => {
    const guard = createSessionGuard(() => ({ isAuthenticated: false, roles: [] }), () => false);
    const target = router.resolve('/suggestions');
    expect(guard(target)).toEqual({ name: 'Login' });

    const restrictedGuard = createSessionGuard(() => ({ isAuthenticated: true, roles: ['user'] }), () => false);
    expect(restrictedGuard(router.resolve('/suggestions/management'))).toEqual({ name: 'Home' });
  });

  it('persists read IDs under rv_support_read_ids and counts only unread pending IDs', () => {
    localStorage.setItem('rv_support_read_ids', '["already-read"]');
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSupportStore();
    store.setPendingIds(['already-read', 'new-1', 'new-2']);
    expect(store.unreadCount).toBe(2);
    store.markAsRead('new-1');
    expect(localStorage.getItem('rv_support_read_ids')).toBe('["already-read","new-1"]');
    expect(store.unreadCount).toBe(1);

    setActivePinia(createPinia());
    const restored = useSupportStore();
    expect(restored.isRead('new-1')).toBe(true);
    expect(restored.unreadCount).toBe(0);
    restored.setPendingIds(['new-1']);
    expect(restored.unreadCount).toBe(0);
  });

  it('loads pending IDs through app only for superUser and keeps badge location, count, and 99+ cap', async () => {
    const pendingIds = ['pending-1', 'pending-2', 'pending-3'];
    refreshPending.mockImplementationOnce(async () => {
      useSupportStore().setPendingIds(pendingIds);
      return pendingIds;
    });
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(SidebarMenu, {
      props: { menuVisible: true, isDark: false },
      global: { plugins: [pinia], stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(refreshPending).toHaveBeenCalledOnce();
    expect(wrapper.findAll('span').filter((badge) => badge.text().trim() === '3')).toHaveLength(2);
    setPendingSuggestionIds(Array.from({ length: 101 }, (_, index) => `session-${index}`));
    await nextTick();
    expect(wrapper.findAll('span').filter((badge) => badge.text().trim() === '99+')).toHaveLength(2);

    wrapper.unmount();
    vi.clearAllMocks();
    roleState.current = 'user';
    const userOnly = mount(SidebarMenu, {
      props: { menuVisible: true, isDark: false },
      global: {
        plugins: [createPinia()],
        stubs: { RouterLink: { template: '<a><slot /></a>' } },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(refreshPending).not.toHaveBeenCalled();
    expect(userOnly.findAll('span').filter((badge) => badge.text().trim() === '99+')).toHaveLength(0);
  });

  it('keeps mount-time pending failures silent', async () => {
    refreshPending.mockRejectedValueOnce(new Error('offline'));
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(SidebarMenu, {
      props: { menuVisible: true, isDark: false },
      global: { plugins: [pinia], stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(refreshPending).toHaveBeenCalledOnce();
    expect(wrapper.text()).not.toContain('99+');
  });
});
