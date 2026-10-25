import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { getRvUsers, updateUserService } = vi.hoisted(() => ({
  getRvUsers: vi.fn(),
  updateUserService: vi.fn(),
}));

vi.mock("@/modules/identity/api/users", () => ({
  getRvUsers,
  updateUserService,
}));

import { useUserStore } from "./users";

describe("legacy user store responsibilities still in use outside admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it("keeps the Riff Valley users list for editorial assignment consumers", async () => {
    const rvUsers = [{ id: "rv-1", username: "editor" }];
    getRvUsers.mockResolvedValue(rvUsers);
    const store = useUserStore();

    await store.loadRvUsers();

    expect(getRvUsers).toHaveBeenCalledOnce();
    expect(store.usersRv).toEqual(rvUsers);
    expect(store).not.toHaveProperty("users");
  });

  it("keeps profile updates and forwards only supported profile fields", async () => {
    const store = useUserStore();
    const dashboardConfig = { modules: ["news"] };
    const mobileDashboardConfig = { modules: ["calendar"] };

    await store.updateUserStore({
      password: "Strong1",
      image: "/avatar.png",
      dashboardButtonsEnabled: false,
      dashboardConfig,
      mobileDashboardConfig,
      role: "superadmin",
      username: "ignored",
    });

    expect(updateUserService).toHaveBeenCalledWith({
      password: "Strong1",
      image: "/avatar.png",
      dashboardButtonsEnabled: false,
      dashboardConfig,
      mobileDashboardConfig,
    });
  });
});
