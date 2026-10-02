import { afterEach, describe, expect, it, vi } from "vitest";
import { listWordPressPublicationApi } from "../../../../src/modules/editorial/lists/infrastructure/listWordPressPublicationApi";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { post } }));

afterEach(() => vi.clearAllMocks());

describe("Editorial list WordPress publication API", () => {
  it("publishes weekly radar posts through the unchanged endpoint, body and position parameter", async () => {
    const result = { created: 1, posts: [{ position: 2, wpPostId: 20, link: "https://wp.test/2", title: "Radar 2" }] };
    post.mockResolvedValue({ data: result });

    await expect(listWordPressPublicationApi.publishRadarPosts("list-1", 2)).resolves.toBe(result);
    expect(post).toHaveBeenCalledWith("/lists/list-1/wp-posts", {}, { params: { position: 2 } });
  });

  it("omits position params when the current service would omit them", async () => {
    post.mockResolvedValue({ data: { created: 0, posts: [] } });

    await listWordPressPublicationApi.publishRadarPosts("list-1", 0);
    expect(post).toHaveBeenCalledWith("/lists/list-1/wp-posts", {}, { params: undefined });
  });

  it("publishes the best-disc list through its dedicated endpoint", async () => {
    const result = { wpPostId: 31, link: "https://wp.test/31", title: "Mejores discos", added: 3 };
    post.mockResolvedValue({ data: result });

    await expect(listWordPressPublicationApi.publishBestDiscsList("list-3")).resolves.toBe(result);
    expect(post).toHaveBeenCalledWith("/lists/list-3/wp-best-post");
  });

  it("propagates both endpoint errors unchanged", async () => {
    const failure = new Error("WordPress unavailable");
    post.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);

    await expect(listWordPressPublicationApi.publishRadarPosts("list-1", 1)).rejects.toBe(failure);
    await expect(listWordPressPublicationApi.publishBestDiscsList("list-3")).rejects.toBe(failure);
  });
});
