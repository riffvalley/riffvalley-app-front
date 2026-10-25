// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const { getUsers } = vi.hoisted(() => ({ getUsers: vi.fn() }));

vi.mock("@/modules/identity/users/api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/users/api/users")>();
  return { ...actual, getUsers };
});

import { useAuthStore } from "@/modules/identity/auth/stores/auth";
import type { AdminUser } from "@/modules/identity/users/types/users";
import { adminUsersQueryKeyForSession, useAdminUsersQuery } from "./useAdminUsersQuery";

const users: AdminUser[] = [{
  id: "private-user",
  username: "Private user",
  email: "private@example.test",
  role: "user",
  createdAt: "2025-01-01T00:00:00.000Z",
  notes: "private notes",
  isActive: true,
}];

describe("useAdminUsersQuery authorization", () => {
  let queryClient: QueryClient;
  let pinia: ReturnType<typeof createPinia>;
  let query: ReturnType<typeof useAdminUsersQuery>;
  let wrapper: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    getUsers.mockReset();
    pinia = createPinia();
    setActivePinia(pinia);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    useAuthStore().$patch({
      authStatus: "authenticated",
      token: "in-memory-token",
      userId: "admin-a",
      username: "admin",
      role: "superadmin",
      authSessionGeneration: 7,
      sessionMode: "renewable",
    });
  });

  afterEach(() => {
    wrapper?.unmount();
    queryClient.clear();
  });

  it("rejects a pending response after superadmin permission is revoked without a session change", async () => {
    let resolveUsers!: (value: AdminUser[]) => void;
    getUsers.mockImplementation(() => new Promise<AdminUser[]>((resolve) => { resolveUsers = resolve; }));
    wrapper = mount(defineComponent({
      setup() {
        query = useAdminUsersQuery();
        return () => null;
      },
    }), { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } });
    await vi.waitFor(() => expect(getUsers).toHaveBeenCalledOnce());
    const authStore = useAuthStore();
    const generation = authStore.authSessionGeneration;

    authStore.role = "user";
    resolveUsers(users);
    await flushPromises();

    expect(authStore.userId).toBe("admin-a");
    expect(authStore.authSessionGeneration).toBe(generation);
    expect(query.data.value).toBeUndefined();
    expect(queryClient.getQueryData(adminUsersQueryKeyForSession("admin-a", generation))).toBeUndefined();
    expect(query.error.value?.message).toContain("permisos cambiaron");
  });

});
