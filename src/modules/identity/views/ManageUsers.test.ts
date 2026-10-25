// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const {
  getUsers,
  postUserService,
  updateUserSuperAdminService,
  activateUserService,
  deactivateUserService,
  deleteUserService,
  errorToast,
  successToast,
  confirmModal,
} = vi.hoisted(() => ({
  getUsers: vi.fn(),
  postUserService: vi.fn(),
  updateUserSuperAdminService: vi.fn(),
  activateUserService: vi.fn(),
  deactivateUserService: vi.fn(),
  deleteUserService: vi.fn(),
  errorToast: vi.fn(),
  successToast: vi.fn(),
  confirmModal: vi.fn(),
}));

vi.mock("@/modules/identity/api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/api/users")>();
  return {
    ...actual,
    getUsers,
    postUserService,
    updateUserSuperAdminService,
    activateUserService,
    deactivateUserService,
    deleteUserService,
  };
});
vi.mock("@services/swal/SwalService", () => ({
  default: {
    error: errorToast,
    success: successToast,
    confirm: confirmModal,
  },
}));

import { observePrivateQueryCache } from "@/app/privateQueryCache";
import { useAuthStore } from "@/modules/identity/stores/auth";
import { useUserStore } from "@/stores/user/users";
import { adminUsersQueryKey, adminUsersQueryKeyForSession } from "@/modules/identity/composables/useAdminUsersQuery";
import ManageUsers from "./ManageUsers.vue";
import type { AdminUser } from "@/modules/identity/types/users";

const list: AdminUser[] = [
  {
    id: "u-zed",
    username: "Zed",
    email: "aaa@example.test",
    role: "user",
    createdAt: "2025-01-02T00:00:00.000Z",
    notes: null,
    isActive: true,
  },
  {
    id: "u-amy",
    username: "Amy",
    email: "zzz@example.test",
    role: "collaborator",
    createdAt: "2025-01-01T00:00:00.000Z",
    notes: null,
    isActive: false,
  },
];

describe("ManageUsers Query listing", () => {
  let queryClient: QueryClient;
  let pinia: ReturnType<typeof createPinia>;
  let stopPrivateCacheObserver: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000, gcTime: Infinity } },
    });
    const authStore = useAuthStore();
    authStore.$patch({
      authStatus: "authenticated",
      token: "memory-access-token",
      userId: "admin-a",
      username: "admin",
      role: "superadmin",
      authSessionGeneration: 1,
      sessionMode: "renewable",
    });
    stopPrivateCacheObserver = observePrivateQueryCache(authStore, queryClient);
  });

  function render() {
    return mount(ManageUsers, {
      global: {
        plugins: [pinia, [VueQueryPlugin, { queryClient }]],
      },
    });
  }

  it("loads, caches and renders users without copying the result into Pinia", async () => {
    getUsers.mockResolvedValue(list);
    const wrapper = render();

    expect(wrapper.get('[role="status"]').text()).toContain("Cargando usuarios");
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));

    expect(getUsers).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(adminUsersQueryKeyForSession("admin-a", 1))).toEqual(list);
    expect(useUserStore()).not.toHaveProperty("users");
    wrapper.unmount();
  });

  it("preserves search, role filters and sorting on the local editable rows", async () => {
    getUsers.mockResolvedValue(list);
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));

    const search = wrapper.get('input[placeholder="Buscar por usuario o email..."]');
    await search.setValue("zed");
    expect(wrapper.findAll(".user-card")).toHaveLength(1);
    expect((wrapper.get('.user-card input[placeholder="Username"]').element as HTMLInputElement).value).toBe("Zed");

    await search.setValue("");
    await wrapper.findAll("button").find((button) => button.text().trim() === "Todos")?.trigger("click");
    const emailSort = wrapper.findAll("button").find((button) => button.text().includes("Email"));
    await emailSort?.trigger("click");
    const usernames = wrapper.findAll('.user-card input[placeholder="Username"]').map((input) => (input.element as HTMLInputElement).value);
    expect(usernames).toEqual(["Zed", "Amy"]);

    const roleButton = wrapper.findAll("button").find((button) => button.text().trim() === "Collaborator");
    await roleButton?.trigger("click");
    expect(wrapper.findAll(".user-card")).toHaveLength(1);
    expect((wrapper.get('.user-card input[placeholder="Username"]').element as HTMLInputElement).value).toBe("Amy");
    wrapper.unmount();
  });

  it("shows query errors and the successful empty-list state", async () => {
    getUsers.mockRejectedValueOnce(new Error("offline"));
    const failed = render();
    await vi.waitFor(() => expect(failed.get('[role="alert"]').text()).toContain("Error al cargar usuarios"));
    expect(errorToast).toHaveBeenCalledWith("Error al cargar usuarios");
    failed.unmount();
    queryClient.clear();

    getUsers.mockResolvedValueOnce([]);
    const empty = render();
    await vi.waitFor(() => expect(empty.text()).toContain("No hay usuarios registrados"));
    expect(getUsers).toHaveBeenCalledTimes(2);
    empty.unmount();
  });

  it("reuses the fresh query result when the view mounts again", async () => {
    queryClient.setQueryData(adminUsersQueryKeyForSession("admin-a", 1), list);
    const wrapper = render();
    await flushPromises();

    expect(wrapper.findAll(".user-card")).toHaveLength(2);
    expect(getUsers).not.toHaveBeenCalled();
    expect(useUserStore()).not.toHaveProperty("users");
    wrapper.unmount();
  });

  it("keeps the cached list visible if a later refetch fails", async () => {
    queryClient.setQueryData(adminUsersQueryKeyForSession("admin-a", 1), list);
    const wrapper = render();
    await flushPromises();

    getUsers.mockRejectedValueOnce(new Error("offline"));
    await queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });

    expect(wrapper.findAll(".user-card")).toHaveLength(2);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("clears the local snapshot and rejects a late response after an identity change", async () => {
    let resolveOldQuery!: (users: AdminUser[]) => void;
    let oldSignal: AbortSignal | undefined;
    getUsers
      .mockImplementationOnce((signal: AbortSignal) => {
        oldSignal = signal;
        return new Promise<AdminUser[]>((resolve) => { resolveOldQuery = resolve; });
      })
      .mockResolvedValueOnce([{ ...list[1], id: "u-new", username: "New account" }]);
    const wrapper = render();
    await vi.waitFor(() => expect(getUsers).toHaveBeenCalledOnce());

    const authStore = useAuthStore();
    authStore.$patch({ userId: "admin-b", username: "admin-b", token: "replacement-token" });
    await vi.waitFor(() => expect(getUsers).toHaveBeenCalledTimes(2));
    resolveOldQuery(list);
    await flushPromises();

    expect(oldSignal?.aborted).toBe(true);
    await vi.waitFor(() => expect((wrapper.get('.user-card input[placeholder="Username"]').element as HTMLInputElement).value).toBe("New account"));
    expect(wrapper.findAll('.user-card input[placeholder="Username"]').map((input) => (input.element as HTMLInputElement).value)).toEqual(["New account"]);
    expect(queryClient.getQueryData(adminUsersQueryKeyForSession("admin-b", 1))).toEqual([{ ...list[1], id: "u-new", username: "New account" }]);
    wrapper.unmount();
  });

  it("clears a pending private request on logout", async () => {
    let resolveQuery!: (users: AdminUser[]) => void;
    let signal: AbortSignal | undefined;
    getUsers.mockImplementation((querySignal: AbortSignal) => {
      signal = querySignal;
      return new Promise<AdminUser[]>((resolve) => { resolveQuery = resolve; });
    });
    const wrapper = render();
    await vi.waitFor(() => expect(getUsers).toHaveBeenCalledOnce());

    useAuthStore().clearSessionLocally();
    resolveQuery(list);
    await flushPromises();

    expect(signal?.aborted).toBe(true);
    expect(queryClient.getQueryData(adminUsersQueryKeyForSession("admin-a", 2))).toBeUndefined();
    expect(wrapper.findAll(".user-card")).toHaveLength(0);
    wrapper.unmount();
  });

  it("creates a user through the API mutation and keeps the form open on failure", async () => {
    getUsers.mockResolvedValue(list);
    postUserService.mockResolvedValueOnce({ token: "must-not-be-cached" });
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));
    wrapper.vm.newUser = { email: "created@example.test", username: "created", password: "Password1" };
    wrapper.vm.showCreateModal = true;

    await wrapper.vm.createUser();
    expect(postUserService).toHaveBeenCalledWith({ email: "created@example.test", username: "created", password: "Password1" });
    expect(wrapper.vm.showCreateModal).toBe(false);
    expect(successToast).toHaveBeenCalledWith("Usuario creado correctamente");
    expect(useUserStore()).not.toHaveProperty("users");

    postUserService.mockRejectedValueOnce(new Error("offline"));
    wrapper.vm.showCreateModal = true;
    await wrapper.vm.createUser();
    expect(wrapper.vm.showCreateModal).toBe(true);
    expect(errorToast).toHaveBeenCalledWith("Error al crear usuario");
    wrapper.unmount();
  });

  it("preserves administrative edits, notes and password payloads", async () => {
    getUsers.mockResolvedValue(list);
    updateUserSuperAdminService.mockResolvedValue({});
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));
    const user = wrapper.vm.users[0];

    user.username = "Zed-renamed";
    await wrapper.vm.updateField(user, "username");
    await wrapper.vm.updateRole(user, { target: { value: "riffvalley" } } as unknown as Event);
    wrapper.vm.updateCreatedAt(user, { target: { value: "2025-02-03" } } as unknown as Event);
    await vi.waitFor(() => expect(updateUserSuperAdminService).toHaveBeenCalledTimes(3));
    expect(updateUserSuperAdminService).toHaveBeenNthCalledWith(1, "u-zed", { username: "Zed-renamed" });
    expect(updateUserSuperAdminService).toHaveBeenNthCalledWith(2, "u-zed", { role: "riffvalley" });
    expect(updateUserSuperAdminService).toHaveBeenNthCalledWith(3, "u-zed", { createdAt: new Date("2025-02-03") });

    wrapper.vm.openNotesModal(user);
    wrapper.vm.userNotes = "Internal note";
    await wrapper.vm.saveNotes();
    wrapper.vm.openPasswordModal(user);
    wrapper.vm.newPassword = "Admin123";
    await wrapper.vm.updatePassword();
    expect(updateUserSuperAdminService).toHaveBeenNthCalledWith(4, "u-zed", { notes: "Internal note" });
    expect(updateUserSuperAdminService).toHaveBeenNthCalledWith(5, "u-zed", { password: "Admin123" });
    expect(wrapper.vm.showNotesModal).toBe(false);
    expect(wrapper.vm.showPasswordModal).toBe(false);
    wrapper.unmount();
  });

  it("requires confirmation for activation and deletion and invalidates only admin keys", async () => {
    getUsers.mockResolvedValue(list);
    activateUserService.mockResolvedValue(undefined);
    deactivateUserService.mockResolvedValue(undefined);
    deleteUserService.mockResolvedValue(undefined);
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));
    const user = wrapper.vm.users[0];
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();

    confirmModal.mockResolvedValueOnce({ isConfirmed: false });
    await wrapper.vm.confirmBanUser(user);
    confirmModal.mockResolvedValueOnce({ isConfirmed: true });
    await wrapper.vm.confirmBanUser(user);
    expect(deactivateUserService).toHaveBeenCalledOnce();
    expect(user.isActive).toBe(false);

    confirmModal.mockResolvedValueOnce({ isConfirmed: false });
    await wrapper.vm.confirmDeleteUser(user);
    expect(deleteUserService).not.toHaveBeenCalled();
    confirmModal.mockResolvedValueOnce({ isConfirmed: true });
    await wrapper.vm.confirmDeleteUser(user);
    expect(deleteUserService).toHaveBeenCalledWith("u-zed");
    expect(wrapper.vm.users.map((row: AdminUser) => row.id)).toEqual(["u-amy"]);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: adminUsersQueryKeyForSession("admin-a", 1),
      exact: true,
    });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: adminUsersQueryKey });
    wrapper.unmount();
  });

  it("ignores a successful mutation response after the authenticated identity changes", async () => {
    getUsers
      .mockResolvedValueOnce(list)
      .mockResolvedValueOnce([{ ...list[0], id: "u-new-session", username: "New identity" }]);
    let resolveUpdate!: () => void;
    updateUserSuperAdminService.mockImplementation(() => new Promise<void>((resolve) => { resolveUpdate = resolve; }));
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));
    const user = wrapper.vm.users[0];
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    user.username = "should-not-commit";

    const pending = wrapper.vm.updateField(user, "username");
    await vi.waitFor(() => expect(resolveUpdate).toBeTypeOf("function"));
    useAuthStore().$patch({ userId: "admin-b", username: "other-admin", authSessionGeneration: 2 });
    resolveUpdate();
    await pending;

    expect(invalidate).not.toHaveBeenCalled();
    expect(successToast).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(wrapper.vm.users.map((row: AdminUser) => row.username)).toEqual(["New identity"]));
    wrapper.unmount();
  });

  afterEach(() => {
    stopPrivateCacheObserver?.();
    queryClient.clear();
  });
});
