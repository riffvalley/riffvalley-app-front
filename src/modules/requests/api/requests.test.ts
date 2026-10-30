import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, patch, remove } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), remove: vi.fn(),
}));
vi.mock("@services/api/api", () => ({ default: { get, post, patch, delete: remove } }));

import { approveRequest, createRequest, getAllRequests, getMyRequests, rejectRequest, reopenRequest, updateRequest } from "./requests";

describe("Requests API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: [] });
    post.mockResolvedValue({ data: { id: "request-1" } });
    patch.mockResolvedValue({ data: { id: "request-1" } });
    remove.mockResolvedValue({ data: { id: "request-1" } });
  });

  it("creates with the existing payload and route", async () => {
    const dto = { discName: "Release", artistName: "Artist", releaseDate: "2026-01-01", ep: true };
    await createRequest(dto);
    expect(post).toHaveBeenCalledWith("/requests", dto);
  });

  it("loads own and administrative requests with cancellation", async () => {
    const signal = new AbortController().signal;
    await getMyRequests(signal);
    await getAllRequests(signal);
    expect(get).toHaveBeenNthCalledWith(1, "/requests/my", { signal });
    expect(get).toHaveBeenNthCalledWith(2, "/requests", { signal });
  });

  it("updates with PATCH and the supplied payload", async () => {
    const dto = { genreId: null, countryId: "country-1", adminNotes: "Corrected" };
    await updateRequest("request-1", dto);
    expect(patch).toHaveBeenCalledWith("/requests/request-1", dto);
  });

  it("approves with POST and no body", async () => {
    await approveRequest("request-1");
    expect(post).toHaveBeenCalledWith("/requests/request-1/approve");
  });

  it("reopens with POST and returns the response", async () => {
    const response = { data: { id: "request-1", status: "pending" } };
    post.mockResolvedValueOnce(response);
    await expect(reopenRequest("request-1")).resolves.toBe(response.data);
    expect(post).toHaveBeenCalledWith("/requests/request-1/reopen");
  });

  it("rejects with DELETE and the existing adminNotes body", async () => {
    await rejectRequest("request-1", "Duplicate");
    expect(remove).toHaveBeenCalledWith("/requests/request-1", { data: { adminNotes: "Duplicate" } });
  });

  it("propagates transport errors", async () => {
    const error = new Error("offline");
    get.mockRejectedValueOnce(error);
    await expect(getMyRequests()).rejects.toBe(error);
  });
});
