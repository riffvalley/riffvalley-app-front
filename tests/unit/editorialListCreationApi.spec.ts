import { afterEach, describe, expect, it, vi } from "vitest";
import { listCreationApi } from "../../src/modules/editorial/lists/infrastructure/listCreationApi";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { post } }));

afterEach(() => vi.clearAllMocks());

describe("Editorial list creation API", () => {
  it("posts the existing payload to the lists endpoint and returns response data", async () => {
    const payload = {
      name: "Lista semanal", type: "week", listDate: "2026-10-02T00:00:00.000Z",
      releaseDate: null, status: "new" as const,
    };
    const result = { id: "list-1" };
    post.mockResolvedValue({ data: result });

    await expect(listCreationApi.createList(payload)).resolves.toBe(result);
    expect(post).toHaveBeenCalledWith("/lists", payload);
  });

  it("propagates the HTTP error unchanged", async () => {
    const failure = new Error("create failed");
    post.mockRejectedValue(failure);

    await expect(listCreationApi.createList({
      name: "Lista mensual", type: "month", listDate: null, releaseDate: null, status: "new",
    })).rejects.toBe(failure);
  });
});
