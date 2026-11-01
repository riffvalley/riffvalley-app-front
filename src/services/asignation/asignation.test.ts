import { afterEach, describe, expect, it, vi } from "vitest";

const { post, patch } = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));
vi.mock("@services/api/api.ts", () => ({ default: { post, patch } }));

import { postAsignationService, updateAsignationService } from "./asignation";

afterEach(() => vi.clearAllMocks());

describe("assignment origin header", () => {
  it("sends the per-tab origin on creates from Lists", async () => {
    post.mockResolvedValue({ data: { id: "assignment-1" } });
    await postAsignationService({ userId: "user-1", discId: "disc-1", listId: "list-1" }, "tab-id");
    expect(post).toHaveBeenCalledWith(
      "/asignations",
      { userId: "user-1", discId: "disc-1", listId: "list-1" },
      { headers: { "X-Riff-Valley-Client-Id": "tab-id" } }
    );
  });

  it("sends the origin on position PATCHes and leaves unrelated requests unchanged", async () => {
    patch.mockResolvedValue({ data: { id: "assignment-1" } });
    await updateAsignationService("assignment-1", { position: 2 }, "tab-id");
    await updateAsignationService("assignment-1", { done: true });
    expect(patch).toHaveBeenNthCalledWith(
      1,
      "/asignations/assignment-1",
      { position: 2 },
      { headers: { "X-Riff-Valley-Client-Id": "tab-id" } }
    );
    expect(patch).toHaveBeenNthCalledWith(2, "/asignations/assignment-1", { done: true });
  });
});
