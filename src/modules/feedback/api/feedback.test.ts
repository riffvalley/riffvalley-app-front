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
    get.mockResolvedValue({ data: [] });
    post.mockResolvedValue({ data: { id: "feedback-1" } });
    patch.mockResolvedValue({ data: { id: "feedback-1" } });
    remove.mockResolvedValue({ data: undefined });
  });

  it("creates using the existing endpoint and payload", async () => {
    const dto = { title: "Title", description: "Description", type: "bug" as const };
    await createFeedback(dto);
    expect(post).toHaveBeenCalledWith("/suggestions", dto);
  });

  it("loads own and admin lists with their existing paths and passes cancellation", async () => {
    const signal = new AbortController().signal;
    await getMyFeedback(signal);
    await getFeedback({ type: "bug", status: "rejected" }, signal);
    expect(get).toHaveBeenNthCalledWith(1, "/suggestions/my", { signal });
    expect(get).toHaveBeenNthCalledWith(2, "/suggestions", { params: { type: "bug", status: "rejected" }, signal });
  });

  it("preserves all update and status transition methods and payloads", async () => {
    await updateFeedback("entry-1", { priority: "high" });
    await reopenFeedback("entry-2");
    await rejectFeedback("entry-3", { rejectionReason: "Duplicate" });
    await completeFeedback("entry-4", { versionItemId: "version-item-1" });
    await completeFeedback("entry-5", { versionItemId: undefined });
    expect(patch).toHaveBeenNthCalledWith(1, "/suggestions/entry-1", { priority: "high" });
    expect(patch).toHaveBeenNthCalledWith(2, "/suggestions/entry-2/progress");
    expect(patch).toHaveBeenNthCalledWith(3, "/suggestions/entry-3/reject", { rejectionReason: "Duplicate" });
    expect(patch).toHaveBeenNthCalledWith(4, "/suggestions/entry-4/done", { versionItemId: "version-item-1" });
    expect(patch).toHaveBeenNthCalledWith(5, "/suggestions/entry-5/done", { versionItemId: undefined });
  });

  it("deletes by the existing endpoint and propagates transport errors", async () => {
    await deleteFeedback("entry-6");
    expect(remove).toHaveBeenCalledWith("/suggestions/entry-6");
    const failure = new Error("offline");
    get.mockRejectedValueOnce(failure);
    await expect(getFeedback()).rejects.toBe(failure);
  });
});
