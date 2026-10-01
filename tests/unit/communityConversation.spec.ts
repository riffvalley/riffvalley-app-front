// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ComentsModal from "../../src/components/ComentsModal.vue";
import { buildCommentTree, countComments } from "../../src/modules/community";
import type { FlatDiscComment } from "../../src/modules/community";

const { loadConversation, showError } = vi.hoisted(() => ({
  loadConversation: vi.fn(),
  showError: vi.fn(),
}));

vi.mock("@/app/dependencies/communityConversation", () => ({
  loadCommunityConversation: loadConversation,
  getCommunityCommentIdentity: () => ({ user: { id: "user-1", username: "Ana" }, avatar: "session.png" }),
}));
vi.mock("@services/comments/comments", () => ({ postcommentService: vi.fn() }));
vi.mock("@services/swal/SwalService", () => ({ default: { error: showError, success: vi.fn() } }));
vi.mock("../../src/components/CommentItem.vue", () => ({ default: { template: "<div class='comment-item' />" } }));
vi.mock("../../src/components/UserModal.vue", () => ({ default: { template: "<div />" } }));

const comment = (id: string, parentId?: string): FlatDiscComment => ({
  id,
  parentId,
  comment: `Comentario ${id}`,
  createdAt: "2026-09-30T12:00:00.000Z",
  editedAt: null,
  isDeleted: id === "deleted",
  user: { id: "user-1", username: "Ana", image: null, avatarUrl: null },
});

describe("Community disc conversation loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves order, parent/child hierarchy, deleted nodes, and derives the recursive count", () => {
    const tree = buildCommentTree([
      comment("reply-2", "root"),
      comment("orphan", "missing-parent"),
      comment("root"),
      comment("deleted", "reply-2"),
      comment("reply-1", "root"),
    ]);

    expect(tree.map(({ id }) => id)).toEqual(["orphan", "root"]);
    expect(tree[1].replies.map(({ id }) => id)).toEqual(["reply-2", "reply-1"]);
    expect(tree[1].replies[0].replies[0]).toMatchObject({ id: "deleted", isDeleted: true });
    expect(countComments(tree)).toBe(5);
  });

  it("loads comments when opened and starts a fresh empty conversation after reopening", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("root")]))
      .mockResolvedValueOnce([]);

    const first = mount(ComentsModal, { props: { discId: "disc-1", artistName: "Banda", albumName: "Disco" } });
    await flushPromises();
    expect(first.text()).toContain("1 comentario");
    expect(first.findAll(".comment-item")).toHaveLength(1);
    expect(loadConversation).toHaveBeenNthCalledWith(1, "disc-1");
    first.unmount();

    const reopened = mount(ComentsModal, { props: { discId: "disc-1", artistName: "Banda", albumName: "Disco" } });
    await flushPromises();
    expect(reopened.text()).toContain("0 comentarios");
    expect(reopened.findAll(".comment-item")).toHaveLength(0);
    expect(loadConversation).toHaveBeenCalledTimes(2);
    reopened.unmount();
  });

  it("shows the existing loading error and leaves the conversation empty on failure", async () => {
    loadConversation.mockRejectedValueOnce(new Error("offline"));
    const wrapper = mount(ComentsModal, { props: { discId: "disc-1", artistName: "Banda", albumName: "Disco" } });

    await flushPromises();

    expect(showError).toHaveBeenCalledWith("Error al cargar los comentarios.");
    expect(wrapper.text()).toContain("0 comentarios");
    expect(wrapper.text()).toContain("Sé el primero en comentar");
    wrapper.unmount();
  });
});
