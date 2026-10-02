import { afterEach, describe, expect, it, vi } from "vitest";
import { specialListsApi } from "../../src/modules/editorial/lists/infrastructure/specialListsApi";

const { get, post, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), deleteRequest: vi.fn(),
}));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get, post, delete: deleteRequest } }));

afterEach(() => vi.clearAllMocks());

describe("Editorial special lists API", () => {
  it("reads the existing special list endpoint and returns response data unchanged", async () => {
    const data = [{ id: "list-1", name: "Favoritas", specialType: "web" }];
    get.mockResolvedValue({ data });

    await expect(specialListsApi.getSpecialLists()).resolves.toBe(data);
    expect(get).toHaveBeenCalledWith("/lists/special");
  });

  it("creates a special list with the existing endpoint and payload", async () => {
    const payload = { name: "Favoritas", type: "special" as const, specialType: "web" };
    const result = { id: "list-1" };
    post.mockResolvedValue({ data: result });

    await expect(specialListsApi.createSpecialList(payload)).resolves.toBe(result);
    expect(post).toHaveBeenCalledWith("/lists", payload);
  });

  it("deletes through the existing list endpoint", async () => {
    deleteRequest.mockResolvedValue({});

    await expect(specialListsApi.deleteSpecialList("list-1")).resolves.toBeUndefined();
    expect(deleteRequest).toHaveBeenCalledWith("/lists/list-1");
  });

  it("propagates transport errors unchanged", async () => {
    const failure = new Error("request failed");
    get.mockRejectedValueOnce(failure);
    post.mockRejectedValueOnce(failure);
    deleteRequest.mockRejectedValueOnce(failure);

    await expect(specialListsApi.getSpecialLists()).rejects.toBe(failure);
    await expect(specialListsApi.createSpecialList({
      name: "Favoritas", type: "special", specialType: "web",
    })).rejects.toBe(failure);
    await expect(specialListsApi.deleteSpecialList("list-1")).rejects.toBe(failure);
  });
});
