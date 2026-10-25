import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@services/api/api.ts", () => ({ default: api }));

import { getGlobalActivity, getUsers, postUserService, updateUserService } from "./users";

describe("Identity account HTTP contracts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the administrative list from the existing GET /auth/users contract", async () => {
    const users = [{ id: "u1", username: "person" }];
    api.get.mockResolvedValue({ data: users });

    await expect(getUsers()).resolves.toBe(users);

    expect(api.get).toHaveBeenCalledWith("/auth/users");
  });

  it("forwards the Query cancellation signal without changing the request contract", async () => {
    const controller = new AbortController();
    api.get.mockResolvedValue({ data: [] });

    await getUsers(controller.signal);

    expect(api.get).toHaveBeenCalledWith("/auth/users", { signal: controller.signal });
  });

  it("keeps the global activity endpoint and pagination parameters while forwarding cancellation", async () => {
    const controller = new AbortController();
    api.get.mockResolvedValue({ data: { data: [], totalItems: 0, totalPages: 0, currentPage: 1, limit: 20 } });

    await getGlobalActivity(20, 40, controller.signal);

    expect(api.get).toHaveBeenCalledWith("/auth/activity", {
      params: { limit: 20, offset: 40 },
      signal: controller.signal,
    });
  });

  it("preserves the default global activity request", async () => {
    api.get.mockResolvedValue({ data: { data: [], totalItems: 0, totalPages: 0, currentPage: 1, limit: 20 } });

    await getGlobalActivity();

    expect(api.get).toHaveBeenCalledWith("/auth/activity", { params: { limit: 20, offset: 0 } });
  });

  it("updates the signed-in profile through the existing PATCH /auth contract", async () => {
    api.patch.mockResolvedValue({ data: {} });
    const payload = { password: "Strong1", image: "/avatar/avatar1.png" };

    await updateUserService(payload);

    expect(api.patch).toHaveBeenCalledWith("/auth", payload);
  });

  it("retains registration as the existing POST /auth/register operation", async () => {
    api.post.mockResolvedValue({ data: { id: "u1" } });
    const payload = { email: "person@example.test", username: "person", password: "Strong1" };

    await postUserService(payload);

    expect(api.post).toHaveBeenCalledWith("/auth/register", payload);
  });
});
