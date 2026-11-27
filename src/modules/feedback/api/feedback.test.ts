import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, patch, remove } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), remove: vi.fn(),
}));
vi.mock("@services/api/api", () => ({ default: { get, post, patch, delete: remove } }));

import {
  completeFeedback,
  createFeedback,
  deleteFeedback,
  getFeedback,
  getMyFeedback,
  rejectFeedback,
  reopenFeedback,
  updateFeedback,
} from "./feedback";

describe("Feedback API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: { data: [], counts: { in_progress: 0, done: 0, rejected: 0 } } });
    post.mockResolvedValue({ data: { id: "feedback-1" } });
    patch.mockResolvedValue({ data: { id: "feedback-1" } });
    remove.mockResolvedValue({ data: undefined });
  });

  it("creates using the existing endpoint and payload", async () => {
    const dto = { title: "Title", description: "Description", type: "bug" as const };
    await createFeedback(dto);
    expect(post).toHaveBeenCalledWith("/suggestions", dto);
  });

  it("supports a catalog category on creation without changing legacy payloads", async () => {
    const dto = { title: "Festival filter", description: "Add event filter", type: "suggestion" as const, category: "events" as const };
    await createFeedback(dto);
    expect(post).toHaveBeenCalledWith("/suggestions", dto);
    expect(post).not.toHaveBeenCalledWith("/suggestions", expect.objectContaining({ category: null }));
  });

  it("loads own and admin lists with their existing paths and passes cancellation", async () => {
    const signal = new AbortController().signal;
    await getMyFeedback({}, signal);
    const response = {
      data: [
        {
          id: "entry-1",
          title: "Bug",
          description: "Details",
          type: "bug",
          category: null,
          status: "rejected",
          priority: "high",
          rejectionReason: "Duplicate",
          userId: "user-1",
          user: { id: "user-1", username: "Member", image: null },
          versionItemId: null,
          versionItem: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      counts: { in_progress: 3, done: 2, rejected: 1 },
    };
    get.mockResolvedValueOnce({ data: response });
    await expect(getFeedback({ type: "bug", status: "rejected" }, signal)).resolves.toEqual(response);
    expect(get).toHaveBeenNthCalledWith(1, "/suggestions/my", { params: {}, signal });
    expect(get).toHaveBeenNthCalledWith(2, "/suggestions", { params: { type: "bug", status: "rejected" }, signal });
  });

  it("preserves an empty administrative list and its zero counts", async () => {
    const response = { data: [], counts: { in_progress: 0, done: 0, rejected: 0 } };
    get.mockResolvedValueOnce({ data: response });
    await expect(getFeedback()).resolves.toEqual(response);
  });

  it("passes category with existing type and status filters on both endpoints", async () => {
    const signal = new AbortController().signal;
    await getFeedback({ type: "bug", status: "rejected", category: "uncategorized" }, signal);
    await getMyFeedback({ type: "suggestion", status: "done", category: "other" }, signal);
    expect(get).toHaveBeenNthCalledWith(1, "/suggestions", {
      params: { type: "bug", status: "rejected", category: "uncategorized" }, signal,
    });
    expect(get).toHaveBeenNthCalledWith(2, "/suggestions/my", {
      params: { type: "suggestion", status: "done", category: "other" }, signal,
    });
  });

  it("preserves all update and status transition methods and payloads", async () => {
    await updateFeedback("entry-1", { priority: "high" });
    await updateFeedback("entry-1", { category: "rankings" });
    await updateFeedback("entry-1", { category: null });
    await reopenFeedback("entry-2");
    await rejectFeedback("entry-3", { rejectionReason: "Duplicate" });
    await completeFeedback("entry-4", { versionItemId: "version-item-1" });
    await completeFeedback("entry-5", { versionItemId: undefined });
    expect(patch).toHaveBeenNthCalledWith(1, "/suggestions/entry-1", { priority: "high" });
    expect(patch).toHaveBeenNthCalledWith(2, "/suggestions/entry-1", { category: "rankings" });
    expect(patch).toHaveBeenNthCalledWith(3, "/suggestions/entry-1", { category: null });
    expect(patch).toHaveBeenNthCalledWith(4, "/suggestions/entry-2/progress");
    expect(patch).toHaveBeenNthCalledWith(5, "/suggestions/entry-3/reject", { rejectionReason: "Duplicate" });
    expect(patch).toHaveBeenNthCalledWith(6, "/suggestions/entry-4/done", { versionItemId: "version-item-1" });
    expect(patch).toHaveBeenNthCalledWith(7, "/suggestions/entry-5/done", { versionItemId: undefined });
  });

  it("deletes by the existing endpoint and propagates transport errors", async () => {
    await deleteFeedback("entry-6");
    expect(remove).toHaveBeenCalledWith("/suggestions/entry-6");
    const failure = new Error("offline");
    get.mockRejectedValueOnce(failure);
    await expect(getFeedback()).rejects.toBe(failure);
  });
});
