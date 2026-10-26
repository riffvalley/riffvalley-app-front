// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const {
  activateUserService,
  deactivateUserService,
  deleteUserService,
  postUserService,
  updateUserSuperAdminService,
} = vi.hoisted(() => ({
  activateUserService: vi.fn(),
  deactivateUserService: vi.fn(),
  deleteUserService: vi.fn(),
  postUserService: vi.fn(),
  updateUserSuperAdminService: vi.fn(),
}));

vi.mock("@/modules/identity/users/api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/users/api/users")>();
  return {
    ...actual,
    activateUserService,
    deactivateUserService,
    deleteUserService,
    postUserService,
    updateUserSuperAdminService,
  };
});

import { useAdminUserMutations } from "./useAdminUserMutations";
import { useAuthStore } from "@/modules/identity/auth";

describe("useAdminUserMutations", () => {
  let queryClient: QueryClient;
  let pinia: ReturnType<typeof createPinia>;
  let mutations: ReturnType<typeof useAdminUserMutations>;
  let wrapper: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
    queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const authStore = useAuthStore();
    authStore.$patch({
      authStatus: "authenticated",
      token: "in-memory-token",
      userId: "admin-a",
      username: "admin",
      role: "superadmin",
      authSessionGeneration: 3,
    });
    wrapper = mount(
      defineComponent({
        setup() {
          mutations = useAdminUserMutations();
          return () => null;
        },
      }),
      { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } }
    );
  });

  afterEach(() => {
    wrapper?.unmount();
    queryClient.clear();
  });

  it("delegates create, update, role, active-state and delete with exact API payloads", async () => {
    postUserService.mockResolvedValue({ token: "response-token" });
    updateUserSuperAdminService.mockResolvedValue({});
    activateUserService.mockResolvedValue(undefined);
    deactivateUserService.mockResolvedValue(undefined);
    deleteUserService.mockResolvedValue(undefined);
    const session = mutations.captureSession()!;

    await mutations.createUser.mutateAsync({
      session,
      payload: { email: "new@example.test", username: "new-user", password: "Password1" },
    });
    await mutations.updateUser.mutateAsync({
      session,
      payload: { userId: "user-1", changes: { username: "renamed" } },
    });
    await mutations.updateUser.mutateAsync({
      session,
      payload: { userId: "user-1", changes: { role: "collaborator" } },
    });
    await mutations.setUserActive.mutateAsync({
      session,
      payload: { userId: "user-1", active: false },
    });
    await mutations.setUserActive.mutateAsync({
      session,
      payload: { userId: "user-1", active: true },
    });
    await mutations.deleteUser.mutateAsync({ session, payload: { userId: "user-1" } });

    expect(postUserService).toHaveBeenCalledWith({
      email: "new@example.test",
      username: "new-user",
      password: "Password1",
    });
    expect(updateUserSuperAdminService).toHaveBeenNthCalledWith(1, "user-1", {
      username: "renamed",
    });
    expect(updateUserSuperAdminService).toHaveBeenNthCalledWith(2, "user-1", {
      role: "collaborator",
    });
    expect(deactivateUserService).toHaveBeenCalledWith("user-1");
    expect(activateUserService).toHaveBeenCalledWith("user-1");
    expect(deleteUserService).toHaveBeenCalledWith("user-1");
    expect(mutations.createUser.data.value).toBeUndefined();
  });

  it("invalidates the current session list and only relevant statistics", async () => {
    updateUserSuperAdminService.mockResolvedValue({});
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const session = mutations.captureSession()!;

    await mutations.updateUser.mutateAsync({
      session,
      payload: { userId: "user-1", changes: { notes: null } },
    });
    await mutations.updateUser.mutateAsync({
      session,
      payload: { userId: "user-1", changes: { email: "updated@example.test" } },
    });

    expect(invalidate).toHaveBeenNthCalledWith(1, {
      queryKey: ["identity", "users", "admin-list", "admin-a", 3],
      exact: true,
    });
    expect(invalidate).toHaveBeenNthCalledWith(2, {
      queryKey: ["identity", "users", "admin-list", "admin-a", 3],
      exact: true,
    });
    expect(invalidate).toHaveBeenNthCalledWith(3, {
      queryKey: ["identity", "activity", "dashboard"],
    });
    expect(invalidate).toHaveBeenCalledTimes(3);
  });

  it("does not invalidate after failure or a response from a previous session", async () => {
    updateUserSuperAdminService.mockRejectedValueOnce(new Error("offline"));
    let completeRequest!: () => void;
    updateUserSuperAdminService.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          completeRequest = resolve;
        })
    );
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const session = mutations.captureSession()!;

    await expect(
      mutations.updateUser.mutateAsync({
        session,
        payload: { userId: "user-1", changes: { role: "user" } },
      })
    ).rejects.toThrow("offline");
    const pending = mutations.updateUser.mutateAsync({
      session,
      payload: { userId: "user-1", changes: { role: "user" } },
    });
    await vi.waitFor(() => expect(completeRequest).toBeTypeOf("function"));
    useAuthStore().$patch({ userId: "admin-b", authSessionGeneration: 4 });
    completeRequest();
    await expect(pending).rejects.toThrow("La sesión cambió");

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("does not start a mutation for a session that is no longer current", async () => {
    const session = mutations.captureSession()!;
    useAuthStore().$patch({ role: "user" });

    await expect(
      mutations.deleteUser.mutateAsync({ session, payload: { userId: "user-1" } })
    ).rejects.toThrow("La sesión cambió");
    expect(deleteUserService).not.toHaveBeenCalled();
  });

  it("ignores an in-flight mutation result after superadmin permission is revoked", async () => {
    let completeRequest!: () => void;
    updateUserSuperAdminService.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completeRequest = resolve;
        })
    );
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const authStore = useAuthStore();
    const generation = authStore.authSessionGeneration;
    const session = mutations.captureSession()!;

    const pending = mutations.updateUser.mutateAsync({
      session,
      payload: { userId: "user-1", changes: { username: "updated" } },
    });
    await vi.waitFor(() => expect(completeRequest).toBeTypeOf("function"));
    authStore.role = "user";
    completeRequest();

    await expect(pending).rejects.toThrow("La sesión cambió");
    expect(authStore.authSessionGeneration).toBe(generation);
    expect(invalidate).not.toHaveBeenCalled();
    expect(mutations.isCurrentSession(session)).toBe(false);
  });
});
