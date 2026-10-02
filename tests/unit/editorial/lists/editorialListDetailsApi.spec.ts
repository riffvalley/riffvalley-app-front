import { afterEach, describe, expect, it, vi } from "vitest";
import { listDetailsApi } from "../../../../src/modules/editorial/lists/infrastructure/listDetailsApi";

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get, patch } }));

afterEach(() => vi.clearAllMocks());

describe("Editorial list details API", () => {
  it("reads details from the existing endpoint and returns response data", async () => {
    const details = {
      id: "list-1", name: "Lista semanal", type: "week", status: "new",
      listDate: "2026-10-02", releaseDate: null, asignations: [],
    };
    get.mockResolvedValue({ data: details });

    await expect(listDetailsApi.getListDetails("list-1")).resolves.toBe(details);
    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith("/lists/list-1");
  });

  it("updates the existing endpoint with the unchanged payload and returns response data", async () => {
    const payload = {
      name: "Lista actualizada", type: "week", listDate: null,
      releaseDate: "2026-10-09", status: "assigned",
    };
    const result = { updated: true };
    patch.mockResolvedValue({ data: result });

    await expect(listDetailsApi.updateList("list-1", payload)).resolves.toBe(result);
    expect(patch).toHaveBeenCalledOnce();
    expect(patch).toHaveBeenCalledWith("/lists/list-1", payload);
  });

  it("propagates HTTP errors unchanged for both operations", async () => {
    const failure = new Error("request failed");
    get.mockRejectedValueOnce(failure);
    patch.mockRejectedValueOnce(failure);

    await expect(listDetailsApi.getListDetails("list-1")).rejects.toBe(failure);
    await expect(listDetailsApi.updateList("list-1", {
      name: "Lista", type: "week", listDate: null, releaseDate: null, status: "new",
    })).rejects.toBe(failure);
  });
});
