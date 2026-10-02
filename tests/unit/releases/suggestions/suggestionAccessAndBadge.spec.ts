// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import router from '../../../../src/app/router';
import { createSessionGuard } from '../../../../src/app/router/sessionGuard';
import { useSupportStore } from '../../../../src/stores/support/support';
import SidebarMenu from '../../../../src/layouts/default/components/SidebarMenu.vue';

const { get, roleState } = vi.hoisted(() => ({ get: vi.fn(), roleState: { current: 'superUser' } }));
vi.mock('@services/api/api.ts', () => ({ default: { get } }));
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

  it('loads the badge only for superUser, derives it from pending suggestions and caps the display at 99+', async () => {
    get.mockImplementation(async (path: string) => {
      if (path === '/suggestions') return { data: Array.from({ length: 101 }, (_, index) => ({ id: `s-${index}`, status: 'in_progress' })) };
      return { data: [] };
    });
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(SidebarMenu, {
      props: { menuVisible: true, isDark: false },
      global: { plugins: [pinia], stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(get).toHaveBeenCalledWith('/suggestions', { params: { status: 'in_progress' } });
    expect(wrapper.text()).toContain('99+');

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
    expect(get).not.toHaveBeenCalledWith('/suggestions', expect.anything());
    expect(userOnly.text()).not.toContain('99+');
  });
});
