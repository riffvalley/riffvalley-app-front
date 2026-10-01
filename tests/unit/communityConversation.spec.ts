// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ComentsModal from "../../src/components/ComentsModal.vue";
import { buildCommentTree, countComments } from "../../src/modules/community";
import type { FlatDiscComment } from "../../src/modules/community";

const { loadConversation, createRootComment, showError } = vi.hoisted(() => ({
  loadConversation: vi.fn(),
  createRootComment: vi.fn(),
  showError: vi.fn(),
}));

vi.mock("@/app/dependencies/communityConversation", () => ({
  loadCommunityConversation: loadConversation,
  createCommunityRootComment: createRootComment,
  getCommunityCommentIdentity: () => ({ user: { id: "user-1", username: "Ana" }, avatar: "session.png" }),
}));
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

const createdComment = (id: string): FlatDiscComment & { replies: [] } => ({ ...comment(id), replies: [] });

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

  it("adds a confirmed root after success and preserves the session avatar integration", async () => {
    loadConversation.mockResolvedValueOnce([]);
    createRootComment.mockResolvedValueOnce({ ...createdComment("created"), comment: "Hola", user: { id: "user-1", username: "Ana", image: null, avatarUrl: null } });
    const wrapper = mount(ComentsModal, { props: { discId: "disc-1", artistName: "Banda", albumName: "Disco" } });
    await flushPromises();
    await wrapper.get("input").setValue("Hola");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(createRootComment).toHaveBeenCalledWith("disc-1", "Hola");
    expect(wrapper.text()).toContain("1 comentario");
    expect(wrapper.findAll(".comment-item")).toHaveLength(1);
    expect(wrapper.get("input").element.value).toBe("");
    wrapper.unmount();
  });

  it("keeps confirmed state after a failed create and allows retry", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("confirmed")]));
    createRootComment.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(createdComment("created"));
    const wrapper = mount(ComentsModal, { props: { discId: "disc-1", artistName: "Banda", albumName: "Disco" } });
    await flushPromises();
    await wrapper.get("input").setValue("Nuevo");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("1 comentario");
    expect(wrapper.findAll(".comment-item")).toHaveLength(1);
    expect(wrapper.get("input").element.value).toBe("Nuevo");
    expect(showError).toHaveBeenCalledWith("Error al enviar el comentario.");

    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(createRootComment).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("2 comentarios");
    wrapper.unmount();
  });

  it("locks the form during a pending request and submits only once", async () => {
    loadConversation.mockResolvedValueOnce([]);
    let resolveCreate: (value: FlatDiscComment) => void = () => {};
    createRootComment.mockReturnValueOnce(new Promise((resolve) => { resolveCreate = resolve; }));
    const wrapper = mount(ComentsModal, { props: { discId: "disc-1", artistName: "Banda", albumName: "Disco" } });
    await flushPromises();
    await wrapper.get("input").setValue("Único");
    const firstSubmit = wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.get("button[type=submit]").attributes("disabled")).toBeDefined();
    await wrapper.get("form").trigger("submit");
    expect(createRootComment).toHaveBeenCalledTimes(1);
    resolveCreate(createdComment("only"));
    await firstSubmit;
    await flushPromises();
    expect(wrapper.findAll(".comment-item")).toHaveLength(1);
    wrapper.unmount();
  });
});
