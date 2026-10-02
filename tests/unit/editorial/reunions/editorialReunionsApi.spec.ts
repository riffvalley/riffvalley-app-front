import { afterEach, describe, expect, it, vi } from "vitest";
import { reunionsApi } from "../../../../src/modules/editorial/reunions/infrastructure/reunionsApi";

const { get, post, patch, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  deleteRequest: vi.fn(),
}));
vi.mock("@/shared/infrastructure/http/client", () => ({
  default: { get, post, patch, delete: deleteRequest },
}));

afterEach(() => vi.clearAllMocks());

describe("Editorial meetings API", () => {
  it("reads and normalizes the legacy meeting list while retaining pagination defaults", async () => {
    const backendMeeting = {
      id: "meeting-1", titulo: "Asamblea", fecha: "2026-10-02", points: [],
      createdAt: "created", updatedAt: "updated",
    };
    get.mockResolvedValueOnce({ data: [backendMeeting] });
    get.mockResolvedValueOnce({ data: { unexpected: true } });

    await expect(reunionsApi.getReunions()).resolves.toEqual([{
      ...backendMeeting, title: "Asamblea", date: "2026-10-02",
    }]);
    expect(get).toHaveBeenNthCalledWith(1, "/reunions", { params: { limit: 1000, offset: 0 } });

    await expect(reunionsApi.getReunions(20, 5)).resolves.toEqual([]);
    expect(get).toHaveBeenNthCalledWith(2, "/reunions", { params: { limit: 20, offset: 5 } });
  });

  it("reads a meeting detail and applies the existing Spanish field aliases", async () => {
    const detail = {
      id: "meeting-1", titulo: "Asamblea", fecha: "2026-10-02", points: [],
      createdAt: "created", updatedAt: "updated",
    };
    get.mockResolvedValue({ data: detail });

    await expect(reunionsApi.getReunionDetails("meeting-1")).resolves.toEqual({
      ...detail, title: "Asamblea", date: "2026-10-02",
    });
    expect(get).toHaveBeenCalledWith("/reunions/meeting-1");
  });

  it("keeps the meeting update payload and response behavior unchanged", async () => {
    const update = { title: "Asamblea nueva", date: "2026-10-03T18:00" };
    patch.mockResolvedValue({ data: { ignored: true } });

    await expect(reunionsApi.updateReunion("meeting-1", update)).resolves.toBeUndefined();
    expect(patch).toHaveBeenCalledWith("/reunions/meeting-1", {
      ...update, titulo: update.title, fecha: update.date,
    });
  });

  it("keeps point endpoints, payloads and the create response", async () => {
    const point = { id: "point-1", titulo: "Acta", content: "Texto", done: false };
    const create = { titulo: "Acta", content: "Texto", reunionId: "meeting-1" };
    const update = { done: true };
    post.mockResolvedValue({ data: point });
    patch.mockResolvedValue({ data: { ignored: true } });

    await expect(reunionsApi.createReunionPoint(create)).resolves.toBe(point);
    expect(post).toHaveBeenCalledWith("/points", create);
    await expect(reunionsApi.updateReunionPoint("point-1", update)).resolves.toBeUndefined();
    expect(patch).toHaveBeenCalledWith("/points/point-1", update);
  });

  it("deletes meetings and points through their existing endpoints", async () => {
    deleteRequest.mockResolvedValue({ data: undefined });

    await reunionsApi.deleteReunion("meeting-1");
    await reunionsApi.deleteReunionPoint("point-1");

    expect(deleteRequest).toHaveBeenNthCalledWith(1, "/reunions/meeting-1");
    expect(deleteRequest).toHaveBeenNthCalledWith(2, "/points/point-1");
  });

  it("propagates request errors unchanged for every operation", async () => {
    const failure = new Error("request failed");
    get.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);
    post.mockRejectedValueOnce(failure);
    patch.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);
    deleteRequest.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);

    await expect(reunionsApi.getReunions()).rejects.toBe(failure);
    await expect(reunionsApi.getReunionDetails("meeting-1")).rejects.toBe(failure);
    await expect(reunionsApi.createReunionPoint({ titulo: "A", content: "B", reunionId: "meeting-1" })).rejects.toBe(failure);
    await expect(reunionsApi.updateReunion("meeting-1", { title: "A", date: "B" })).rejects.toBe(failure);
    await expect(reunionsApi.updateReunionPoint("point-1", { done: true })).rejects.toBe(failure);
    await expect(reunionsApi.deleteReunion("meeting-1")).rejects.toBe(failure);
    await expect(reunionsApi.deleteReunionPoint("point-1")).rejects.toBe(failure);
  });
});
