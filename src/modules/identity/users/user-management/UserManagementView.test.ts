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
  refreshSession,
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
  refreshSession: vi.fn(),
}));

vi.mock("@/modules/identity/users/api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/users/api/users")>();
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
vi.mock("@/modules/identity/auth/api/sessionAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/auth/api/sessionAuth")>();
  return {
    ...actual,
    sessionAuthTransport: { ...actual.sessionAuthTransport, refresh: refreshSession },
  };
});

import { observePrivateQueryCache } from "@/app/privateQueryCache";
import { useAuthStore } from "@/modules/identity/auth/stores/auth";
import { useUserStore } from "@/stores/user/users";
import { adminUsersQueryKey, adminUsersQueryKeyForSession } from "@/modules/identity/users/composables/useAdminUsersQuery";
import ManageUsers from "./UserManagementView.vue";
import type { AdminUser } from "@/modules/identity/users/types/users";

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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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

  it("removes the Users snapshot, drafts, selection and dialogs immediately on a role downgrade", async () => {
    getUsers.mockResolvedValue(list);
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));
    const target = wrapper.vm.users[0];

    wrapper.vm.openNotesModal(target);
    wrapper.vm.userNotes = "sensitive draft";
    wrapper.vm.newPassword = "Sensitive123";
    wrapper.vm.newUser = { email: "draft@example.test", username: "draft-user", password: "Draft123" };
    wrapper.vm.showCreateModal = true;
    wrapper.vm.showPasswordModal = true;
    wrapper.vm.showCreatePassword = true;
    wrapper.vm.showChangePassword = true;

    useAuthStore().role = "user";
    await flushPromises();

    expect(wrapper.vm.users).toEqual([]);
    expect(wrapper.vm.selectedUser).toBeNull();
    expect(wrapper.vm.userNotes).toBe("");
    expect(wrapper.vm.newPassword).toBe("");
    expect(wrapper.vm.newUser).toEqual({ email: "", username: "", password: "" });
    expect(wrapper.vm.showCreateModal).toBe(false);
    expect(wrapper.vm.showPasswordModal).toBe(false);
    expect(wrapper.vm.showNotesModal).toBe(false);
    expect(wrapper.vm.showCreatePassword).toBe(false);
    expect(wrapper.vm.showChangePassword).toBe(false);
    expect(wrapper.findAll(".user-card")).toHaveLength(0);
    expect(wrapper.text()).not.toContain("aaa@example.test");
    expect(wrapper.text()).not.toContain("zzz@example.test");
    expect(document.body.textContent).not.toContain("sensitive draft");
    expect(document.body.querySelector("input[placeholder='Mínimo 6 caracteres']")).toBeNull();
    expect(queryClient.getQueryData(adminUsersQueryKeyForSession("admin-a", 1))).toBeUndefined();

    wrapper.vm.openCreateModal();
    wrapper.vm.openPasswordModal(target);
    expect(wrapper.vm.showCreateModal).toBe(false);
    expect(wrapper.vm.showPasswordModal).toBe(false);
    expect(wrapper.vm.selectedUser).toBeNull();
    wrapper.unmount();
  });

  it("preserves the Users snapshot and current draft when refresh keeps effective permissions", async () => {
    getUsers.mockResolvedValue(list);
    refreshSession.mockResolvedValue({
      user: { id: "admin-a", username: "admin", role: "superadmin" },
      token: "refreshed-token",
    });
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));
    const target = wrapper.vm.users[0];
    wrapper.vm.openNotesModal(target);
    wrapper.vm.userNotes = "keep this draft";

    await expect(useAuthStore().renewSession()).resolves.toBe("renewed");

    expect(useAuthStore().authSessionGeneration).toBe(1);
    expect(wrapper.vm.users).toHaveLength(2);
    expect(wrapper.vm.selectedUser).toBe(target);
    expect(wrapper.vm.userNotes).toBe("keep this draft");
    expect(wrapper.vm.showNotesModal).toBe(true);
    wrapper.unmount();
  });

  it("restores only freshly fetched Users after superadmin permission returns", async () => {
    const refreshedList = [{ ...list[0], id: "u-fresh", username: "Fresh admin result" }];
    getUsers.mockResolvedValueOnce(list).mockResolvedValueOnce(refreshedList);
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));

    useAuthStore().role = "user";
    await flushPromises();
    expect(wrapper.findAll(".user-card")).toHaveLength(0);

    useAuthStore().role = "superadmin";
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(1));

    expect(getUsers).toHaveBeenCalledTimes(2);
    expect((wrapper.find('.user-card input[placeholder="Username"]').element as HTMLInputElement).value).toBe("Fresh admin result");
    expect(wrapper.findAll('.user-card input[placeholder="Username"]').map((input) => (input.element as HTMLInputElement).value)).not.toContain("Zed");
    expect(queryClient.getQueryData(adminUsersQueryKeyForSession("admin-a", 1))).toEqual(refreshedList);
    wrapper.unmount();
  });

  it("does not repopulate the view when a pending query resolves after a permission downgrade", async () => {
    let resolveQuery!: (users: AdminUser[]) => void;
    let requestSignal: AbortSignal | undefined;
    getUsers.mockImplementation((signal: AbortSignal) => {
      requestSignal = signal;
      return new Promise<AdminUser[]>((resolve) => { resolveQuery = resolve; });
    });
    const wrapper = render();
    await vi.waitFor(() => expect(getUsers).toHaveBeenCalledOnce());

    useAuthStore().role = "user";
    resolveQuery(list);
    await flushPromises();

    expect(useAuthStore().userId).toBe("admin-a");
    expect(useAuthStore().authSessionGeneration).toBe(1);
    expect(requestSignal?.aborted).toBe(true);
    expect(wrapper.vm.users).toEqual([]);
    expect(wrapper.findAll(".user-card")).toHaveLength(0);
    expect(queryClient.getQueryData(adminUsersQueryKeyForSession("admin-a", 1))).toBeUndefined();
    wrapper.unmount();
  });

  it("does not apply or announce a pending mutation result after permission is revoked", async () => {
    getUsers.mockResolvedValue(list);
    let resolveMutation!: () => void;
    updateUserSuperAdminService.mockImplementation(() => new Promise<void>((resolve) => { resolveMutation = resolve; }));
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));
    const row = wrapper.vm.users[0];
    row.username = "pending edit";

    const pending = wrapper.vm.updateField(row, "username");
    await vi.waitFor(() => expect(resolveMutation).toBeTypeOf("function"));
    useAuthStore().role = "user";
    resolveMutation();
    await pending;

    expect(updateUserSuperAdminService).toHaveBeenCalledOnce();
    expect(wrapper.vm.users).toEqual([]);
    expect(wrapper.findAll(".user-card")).toHaveLength(0);
    expect(successToast).not.toHaveBeenCalled();
    expect(errorToast).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(adminUsersQueryKeyForSession("admin-a", 1))).toBeUndefined();
    wrapper.unmount();
  });

  it("keeps a reopened create dialog and its pending state when an older success arrives", async () => {
    getUsers.mockResolvedValue(list);
    const oldRequest = deferred<void>();
    const currentRequest = deferred<void>();
    postUserService.mockImplementationOnce(() => oldRequest.promise).mockImplementationOnce(() => currentRequest.promise);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));

    wrapper.vm.openCreateModal();
    Object.assign(wrapper.vm.newUser, { email: "old@example.test", username: "old-user", password: "Password1" });
    const oldSubmit = wrapper.vm.createUser();
    await vi.waitFor(() => expect(postUserService).toHaveBeenCalledTimes(1));
    await wrapper.vm.createUser();
    expect(postUserService).toHaveBeenCalledOnce();

    wrapper.vm.closeCreateModal();
    wrapper.vm.openCreateModal();
    Object.assign(wrapper.vm.newUser, { email: "new@example.test", username: "new-user", password: "Password2" });
    const currentSubmit = wrapper.vm.createUser();
    await vi.waitFor(() => expect(postUserService).toHaveBeenCalledTimes(2));
    const currentPending = wrapper.vm.createPendingOperation;

    oldRequest.resolve(undefined);
    await oldSubmit;
    expect(wrapper.vm.showCreateModal).toBe(true);
    expect(wrapper.vm.newUser).toEqual({ email: "new@example.test", username: "new-user", password: "Password2" });
    expect(wrapper.vm.createPendingOperation).toBe(currentPending);
    expect(successToast).not.toHaveBeenCalled();

    currentRequest.resolve(undefined);
    await currentSubmit;
    expect(wrapper.vm.showCreateModal).toBe(false);
    expect(successToast).toHaveBeenCalledWith("Usuario creado correctamente");
    expect(invalidate).toHaveBeenCalledTimes(4);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: adminUsersQueryKeyForSession("admin-a", 1), exact: true });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["identity", "activity", "dashboard"] });
    wrapper.unmount();
  });

  it("does not show an old create error in a new opening or invalidate on failure", async () => {
    getUsers.mockResolvedValue(list);
    const oldRequest = deferred<void>();
    postUserService.mockImplementationOnce(() => oldRequest.promise);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));

    wrapper.vm.openCreateModal();
    Object.assign(wrapper.vm.newUser, { email: "old@example.test", username: "old-user", password: "Password1" });
    const oldSubmit = wrapper.vm.createUser();
    await vi.waitFor(() => expect(postUserService).toHaveBeenCalledOnce());
    wrapper.vm.closeCreateModal();
    wrapper.vm.openCreateModal();
    Object.assign(wrapper.vm.newUser, { email: "draft@example.test", username: "draft-user", password: "Password2" });

    oldRequest.reject(new Error("offline"));
    await oldSubmit;
    expect(wrapper.vm.showCreateModal).toBe(true);
    expect(wrapper.vm.newUser).toEqual({ email: "draft@example.test", username: "draft-user", password: "Password2" });
    expect(wrapper.vm.createPendingOperation).toBeNull();
    expect(errorToast).not.toHaveBeenCalledWith("Error al crear usuario");
    expect(invalidate).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("does not let an older password response replace a newly selected user or operation", async () => {
    getUsers.mockResolvedValue(list);
    const oldRequest = deferred<void>();
    const currentRequest = deferred<void>();
    updateUserSuperAdminService.mockImplementationOnce(() => oldRequest.promise).mockImplementationOnce(() => currentRequest.promise);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));
    const [zed, amy] = wrapper.vm.users;

    wrapper.vm.openPasswordModal(zed);
    wrapper.vm.newPassword = "OldPassword1";
    const oldSubmit = wrapper.vm.updatePassword();
    await vi.waitFor(() => expect(updateUserSuperAdminService).toHaveBeenCalledTimes(1));
    await wrapper.vm.updatePassword();
    expect(updateUserSuperAdminService).toHaveBeenCalledOnce();

    wrapper.vm.closePasswordModal();
    wrapper.vm.openPasswordModal(amy);
    wrapper.vm.newPassword = "NewPassword1";
    const currentSubmit = wrapper.vm.updatePassword();
    await vi.waitFor(() => expect(updateUserSuperAdminService).toHaveBeenCalledTimes(2));
    const currentPending = wrapper.vm.passwordPendingOperation;

    oldRequest.resolve(undefined);
    await oldSubmit;
    expect(wrapper.vm.showPasswordModal).toBe(true);
    expect(wrapper.vm.selectedUser.id).toBe("u-amy");
    expect(wrapper.vm.newPassword).toBe("NewPassword1");
    expect(wrapper.vm.passwordPendingOperation).toBe(currentPending);
    expect(successToast).not.toHaveBeenCalled();

    currentRequest.resolve(undefined);
    await currentSubmit;
    expect(wrapper.vm.showPasswordModal).toBe(false);
    expect(wrapper.vm.selectedUser).toBeNull();
    expect(successToast).toHaveBeenCalledWith("Contraseña actualizada");
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: adminUsersQueryKeyForSession("admin-a", 1), exact: true });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["identity", "activity", "dashboard"] });
    wrapper.unmount();
  });

  it("keeps a same-user notes reopening intact when the previous operation succeeds", async () => {
    getUsers.mockResolvedValue(list);
    const oldRequest = deferred<void>();
    updateUserSuperAdminService.mockImplementationOnce(() => oldRequest.promise);
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));
    const zed = wrapper.vm.users[0];

    wrapper.vm.openNotesModal(zed);
    wrapper.vm.userNotes = "Submitted note";
    const oldSubmit = wrapper.vm.saveNotes();
    await vi.waitFor(() => expect(updateUserSuperAdminService).toHaveBeenCalledOnce());
    wrapper.vm.closeNotesModal();
    wrapper.vm.openNotesModal(zed);
    wrapper.vm.userNotes = "New draft";

    oldRequest.resolve(undefined);
    await oldSubmit;
    expect(wrapper.vm.showNotesModal).toBe(true);
    expect(wrapper.vm.selectedUser).toBe(zed);
    expect(wrapper.vm.userNotes).toBe("New draft");
    expect(zed.notes).toBeNull();
    expect(successToast).not.toHaveBeenCalledWith("Notas guardadas");
    wrapper.unmount();
  });

  it("keeps an administrative dialog closed when permission is revoked during its mutation", async () => {
    getUsers.mockResolvedValue(list);
    const request = deferred<void>();
    postUserService.mockImplementationOnce(() => request.promise);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));
    wrapper.vm.openCreateModal();
    Object.assign(wrapper.vm.newUser, { email: "admin@example.test", username: "admin-user", password: "Password1" });
    const pending = wrapper.vm.createUser();
    await vi.waitFor(() => expect(postUserService).toHaveBeenCalledOnce());

    useAuthStore().role = "user";
    expect(wrapper.vm.showCreateModal).toBe(false);
    request.resolve(undefined);
    await pending;

    expect(wrapper.vm.showCreateModal).toBe(false);
    expect(wrapper.vm.newUser).toEqual({ email: "", username: "", password: "" });
    expect(successToast).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
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

    const fillAndSubmitCreateForm = async () => {
      wrapper.vm.openCreateModal();
      await flushPromises();
      const fields = [
        ["input[type='email']", "created@example.test"],
        ["input[placeholder='nombreusuario']", "created"],
        ["input[placeholder='Mínimo 6 caracteres']", "Password1"],
      ] as const;
      for (const [selector, value] of fields) {
        const input = document.body.querySelector<HTMLInputElement>(selector);
        if (!input) throw new Error(`Missing create-user field: ${selector}`);
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await flushPromises();
      }
      document.body.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await flushPromises();
    };

    await fillAndSubmitCreateForm();
    expect(postUserService).toHaveBeenCalledWith({ email: "created@example.test", username: "created", password: "Password1" });
    expect(wrapper.vm.showCreateModal).toBe(false);
    expect(successToast).toHaveBeenCalledWith("Usuario creado correctamente");
    expect(useUserStore()).not.toHaveProperty("users");

    postUserService.mockRejectedValueOnce(new Error("offline"));
    await fillAndSubmitCreateForm();
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

    const zedCard = wrapper.findAll(".user-card").find((card) =>
      (card.get('input[placeholder="Username"]').element as HTMLInputElement).value === "Zed-renamed"
    );
    if (!zedCard) throw new Error("Missing Zed user card");
    await zedCard.get('button[title="Notas"]').trigger("click");
    const notesField = document.body.querySelector<HTMLTextAreaElement>("textarea");
    if (!notesField) throw new Error("Missing notes dialog field");
    notesField.value = "Internal note";
    notesField.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    document.body.querySelector<HTMLButtonElement>(".modal-md .modal-btn-primary")?.click();
    await flushPromises();

    await zedCard.get('button[title="Cambiar contraseña"]').trigger("click");
    let passwordField = document.body.querySelector<HTMLInputElement>("input[placeholder='Mínimo 6 caracteres']");
    if (!passwordField) throw new Error("Missing password dialog field");
    document.body.querySelector<HTMLButtonElement>(".modal-sm button[type='button']")?.click();
    await flushPromises();
    expect(passwordField.type).toBe("text");
    document.body.querySelector<HTMLButtonElement>(".modal-sm .modal-btn-cancel")?.click();
    await flushPromises();
    expect(wrapper.vm.showPasswordModal).toBe(false);

    await zedCard.get('button[title="Cambiar contraseña"]').trigger("click");
    passwordField = document.body.querySelector<HTMLInputElement>("input[placeholder='Mínimo 6 caracteres']");
    if (!passwordField) throw new Error("Missing reopened password dialog field");
    expect(passwordField.value).toBe("");
    expect(passwordField.type).toBe("password");
    passwordField.value = "Admin123";
    passwordField.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    document.body.querySelector<HTMLButtonElement>(".modal-btn-primary")?.click();
    await flushPromises();

    expect(updateUserSuperAdminService).toHaveBeenNthCalledWith(4, "u-zed", { notes: "Internal note" });
    expect(updateUserSuperAdminService).toHaveBeenNthCalledWith(5, "u-zed", { password: "Admin123" });
    expect(wrapper.vm.showNotesModal).toBe(false);
    expect(wrapper.vm.showPasswordModal).toBe(false);
    expect(wrapper.vm.userNotes).toBe("");
    expect(wrapper.vm.newPassword).toBe("");
    expect(successToast).toHaveBeenCalledWith("Notas guardadas");
    expect(successToast).toHaveBeenCalledWith("Contraseña actualizada");
    wrapper.unmount();
  });

  it("keeps the password and notes dialogs open and reports server failures", async () => {
    getUsers.mockResolvedValue(list);
    updateUserSuperAdminService
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"));
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAll(".user-card")).toHaveLength(2));

    await wrapper.get('.user-card button[title="Notas"]').trigger("click");
    const notesField = document.body.querySelector<HTMLTextAreaElement>("textarea");
    if (!notesField) throw new Error("Missing notes dialog field");
    notesField.value = "Keep this after error";
    notesField.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    document.body.querySelector<HTMLButtonElement>(".modal-md .modal-btn-primary")?.click();
    await flushPromises();

    expect(document.body.querySelector("textarea")?.value).toBe("Keep this after error");
    expect(errorToast).toHaveBeenCalledWith("Error al guardar notas");
    expect(wrapper.vm.showNotesModal).toBe(true);

    await wrapper.get('.user-card button[title="Cambiar contraseña"]').trigger("click");
    const passwordField = document.body.querySelector<HTMLInputElement>("input[placeholder='Mínimo 6 caracteres']");
    if (!passwordField) throw new Error("Missing password dialog field");
    passwordField.value = "Admin123";
    passwordField.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    document.body.querySelector<HTMLButtonElement>(".modal-sm .modal-btn-primary")?.click();
    await flushPromises();

    expect(errorToast).toHaveBeenCalledWith("Error al actualizar contraseña");
    expect(wrapper.vm.showPasswordModal).toBe(true);
    expect(document.body.querySelector<HTMLInputElement>("input[placeholder='Mínimo 6 caracteres']")?.value).toBe("Admin123");
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
