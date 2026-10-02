// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import CommentConversationModal from "../../../../src/modules/community/comments/presentation/components/CommentConversationModal.vue";
import CommentItem from "../../../../src/modules/community/comments/presentation/components/CommentItem.vue";
import { buildCommentTree, countComments, type FlatDiscComment } from "../../../../src/modules/community/comments/domain/comment";
import { createReplyComment as createCommunityReplyComment } from "../../../../src/modules/community/comments/application/loadDiscConversation";
import type { CommentPort } from "../../../../src/modules/community/comments/application/commentPort";

const { loadConversation, createRootComment, createReplyComment, updateCommunityComment, deleteCommunityComment, confirm, showError, showSuccess } = vi.hoisted(() => ({
  loadConversation: vi.fn(),
  createRootComment: vi.fn(),
  createReplyComment: vi.fn(),
  updateCommunityComment: vi.fn(),
  deleteCommunityComment: vi.fn(),
  confirm: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("@/app/dependencies/communityConversation", () => ({
  communityCommentOperations: {
    load: loadConversation,
    createRoot: createRootComment,
    createReply: createReplyComment,
    update: updateCommunityComment,
    delete: deleteCommunityComment,
  },
  getCommunityCommentIdentity: () => ({ user: { id: "user-1", username: "Ana" }, avatar: "session.png" }),
}));
vi.mock("@services/swal/SwalService", () => ({ default: { confirm, error: showError, success: showSuccess } }));
vi.mock("../../../../src/components/UserModal.vue", () => ({ default: { template: "<div />" } }));

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
const createdReply = (id: string, parentId: string): FlatDiscComment & { replies: [] } => ({ ...comment(id, parentId), replies: [] });

function findButton(wrapper: ReturnType<typeof mount>, label: string, occurrence = 0) {
  const buttons = wrapper.findAll("button").filter((button) => button.text().trim() === label);
  return buttons[occurrence];
}

function findReplyForm(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll("form").find((form) =>
    form.get("input").attributes("placeholder") === "Escribe tu respuesta...",
  );
}

function mountConversation() {
  return mount(CommentConversationModal, { props: {
    discId: "disc-1", artistName: "Banda", albumName: "Disco",
    currentUser: { id: "user-1", username: "Ana" }, sessionAvatar: "session.png",
    operations: {
      load: loadConversation,
      createRoot: createRootComment,
      createReply: createReplyComment,
      update: updateCommunityComment,
      delete: deleteCommunityComment,
    },
    feedback: { confirm, error: showError, success: showSuccess },
  } });
}

describe("Community disc conversation loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirm.mockResolvedValue({ isConfirmed: true });
    deleteCommunityComment.mockResolvedValue(undefined);
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

  it("creates a reply through the comment port with its parent and a normalized tree node", async () => {
    const create = vi.fn().mockResolvedValue(comment("reply", "parent"));
    const port: CommentPort = { listByDisc: vi.fn(), create, update: vi.fn(), delete: vi.fn() };

    const reply = await createCommunityReplyComment(port, "disc-1", "parent", "Respuesta");

    expect(create).toHaveBeenCalledWith("disc-1", "Respuesta", "parent");
    expect(reply).toMatchObject({ id: "reply", parentId: "parent", replies: [] });
  });

  it("loads comments when opened and starts a fresh empty conversation after reopening", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("root")]))
      .mockResolvedValueOnce([]);

    const first = mountConversation();
    await flushPromises();
    expect(first.text()).toContain("1 comentario");
    expect(first.findAll(".comment-item")).toHaveLength(1);
    expect(loadConversation).toHaveBeenNthCalledWith(1, "disc-1");
    first.unmount();

    const reopened = mountConversation();
    await flushPromises();
    expect(reopened.text()).toContain("0 comentarios");
    expect(reopened.findAll(".comment-item")).toHaveLength(0);
    expect(loadConversation).toHaveBeenCalledTimes(2);
    reopened.unmount();
  });

  it("shows the existing loading error and leaves the conversation empty on failure", async () => {
    loadConversation.mockRejectedValueOnce(new Error("offline"));
    const wrapper = mountConversation();

    await flushPromises();

    expect(showError).toHaveBeenCalledWith("Error al cargar los comentarios.");
    expect(wrapper.text()).toContain("0 comentarios");
    expect(wrapper.text()).toContain("Sé el primero en comentar");
    wrapper.unmount();
  });

  it("adds a confirmed root after success and preserves the session avatar integration", async () => {
    loadConversation.mockResolvedValueOnce([]);
    createRootComment.mockResolvedValueOnce({ ...createdComment("created"), comment: "Hola", user: { id: "user-1", username: "Ana", image: null, avatarUrl: null } });
    const wrapper = mountConversation();
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

  it("emits the tree summary to the card after loading and confirmed mutations, keeping tombstones counted", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("root"), comment("deleted")]));
    createRootComment.mockResolvedValueOnce(createdComment("new-root"));
    createReplyComment.mockResolvedValueOnce(createdReply("reply", "root"));
    updateCommunityComment.mockResolvedValueOnce({ id: "root", comment: "Editado", editedAt: "2026-09-30T12:01:00.000Z" });
    const wrapper = mountConversation();
    await flushPromises();
    expect(wrapper.emitted("comment-count-change")?.[0]).toEqual([2]);

    await wrapper.get("input").setValue("Otro raíz");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.emitted("comment-count-change")?.at(-1)).toEqual([3]);

    await findButton(wrapper, "Responder").trigger("click");
    const replyForm = findReplyForm(wrapper)!;
    await replyForm.get("input").setValue("Respuesta");
    await replyForm.trigger("submit");
    await flushPromises();
    expect(wrapper.emitted("comment-count-change")?.at(-1)).toEqual([4]);

    const root = wrapper.get('[data-comment-id="root"]');
    await findButton(root, "Editar").trigger("click");
    await root.get("input").setValue("Editado");
    await findButton(root, "Guardar").trigger("click");
    await flushPromises();
    expect(wrapper.emitted("comment-count-change")?.at(-1)).toEqual([4]);

    await findButton(root, "Borrar").trigger("click");
    await flushPromises();
    expect(wrapper.emitted("comment-count-change")?.at(-1)).toEqual([4]);
    expect(root.text()).toContain("Comentario eliminado.");
    expect(wrapper.text()).toContain("4 comentarios");
    wrapper.unmount();
  });

  it("keeps confirmed state after a failed create and allows retry", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("confirmed")]));
    createRootComment.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(createdComment("created"));
    const wrapper = mountConversation();
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
    const wrapper = mountConversation();
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

  it("adds a confirmed reply exactly once beneath its parent and keeps the session avatar", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("first"), comment("target")]));
    createReplyComment.mockResolvedValueOnce(createdReply("reply", "target"));
    const wrapper = mountConversation();
    await flushPromises();

    await findButton(wrapper, "Responder", 1).trigger("click");
    const replyForm = findReplyForm(wrapper)!;
    await replyForm.get("input").setValue("Respuesta");
    await replyForm.trigger("submit");
    await flushPromises();

    expect(createReplyComment).toHaveBeenCalledWith("disc-1", "target", "Respuesta");
    expect(wrapper.get('[data-comment-id="target"] .comment-replies [data-comment-id="reply"]').exists()).toBe(true);
    expect(wrapper.get('[data-comment-id="target"] .comment-replies [data-comment-id="reply"] img').attributes("src")).toBe("session.png");
    expect(wrapper.find('[data-comment-id="first"] .comment-replies').exists()).toBe(false);
    expect(wrapper.text()).toContain("3 comentarios");
    expect(wrapper.findComponent(CommentItem).exists()).toBe(true);
    expect(wrapper.findAll("form")).toHaveLength(1);
    wrapper.unmount();
  });

  it("preserves the reply tree and draft after an error, then allows retry", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("parent")]));
    createReplyComment.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(createdReply("reply", "parent"));
    const wrapper = mountConversation();
    await flushPromises();
    await findButton(wrapper, "Responder").trigger("click");
    const replyForm = findReplyForm(wrapper)!;
    await replyForm.get("input").setValue("Pendiente");
    await replyForm.trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("1 comentario");
    expect(wrapper.find('[data-comment-id="parent"] .comment-replies').exists()).toBe(false);
    expect(replyForm.get("input").element.value).toBe("Pendiente");
    expect(showError).toHaveBeenCalledWith("Error al enviar la respuesta.");

    await replyForm.trigger("submit");
    await flushPromises();
    expect(createReplyComment).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-comment-id="parent"] .comment-replies [data-comment-id="reply"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("2 comentarios");
    wrapper.unmount();
  });

  it("coordinates concurrent submits for the same comment", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("parent")]));
    let resolveCreate: (value: FlatDiscComment) => void = () => {};
    createReplyComment.mockReturnValueOnce(new Promise((resolve) => { resolveCreate = resolve; }));
    const wrapper = mountConversation();
    await flushPromises();
    await findButton(wrapper, "Responder").trigger("click");
    const replyForm = findReplyForm(wrapper)!;
    await replyForm.get("input").setValue("Una vez");
    const firstSubmit = replyForm.trigger("submit");
    await flushPromises();

    expect(replyForm.get("input").attributes("disabled")).toBeDefined();
    await replyForm.trigger("submit");
    expect(createReplyComment).toHaveBeenCalledTimes(1);
    resolveCreate(createdReply("reply", "parent"));
    await firstSubmit;
    await flushPromises();
    expect(wrapper.get('[data-comment-id="parent"] .comment-replies [data-comment-id="reply"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("updates the selected node only after success and preserves children and position", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("before"), comment("target"), comment("after"), comment("child", "target")]));
    updateCommunityComment.mockResolvedValueOnce({ id: "target", comment: "Editado confirmado", editedAt: "2026-09-30T12:01:00.000Z" });
    const wrapper = mountConversation();
    await flushPromises();
    const target = wrapper.get('[data-comment-id="target"]');
    await findButton(target, "Editar").trigger("click");
    await target.get("input").setValue("Editado confirmado");
    await findButton(target, "Guardar").trigger("click");
    await flushPromises();
    expect(updateCommunityComment).toHaveBeenCalledWith("target", "Editado confirmado");
    expect(wrapper.findAll(".comment-item").map((node) => node.attributes("data-comment-id"))).toEqual(["before", "target", "child", "after"]);
    expect(target.get(".comment-replies [data-comment-id='child']").exists()).toBe(true);
    expect(target.text()).toContain("Editado confirmado");
    wrapper.unmount();
  });

  it("keeps confirmed text and edit draft after failure, then allows retry", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("target")]));
    updateCommunityComment.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ id: "target", comment: "Reintento", editedAt: "2026-09-30T12:01:00.000Z" });
    const wrapper = mountConversation();
    await flushPromises();
    const target = wrapper.get('[data-comment-id="target"]');
    await findButton(target, "Editar").trigger("click");
    await target.get("input").setValue("Reintento");
    await findButton(target, "Guardar").trigger("click");
    await flushPromises();
    expect(wrapper.findAllComponents(CommentItem).find((item) => item.props("comment").id === "target")?.props("comment").comment).toBe("Comentario target");
    expect(target.get("input").element.value).toBe("Reintento");
    expect(showError).toHaveBeenCalledWith("Error al actualizar el comentario.");
    await findButton(target, "Guardar").trigger("click");
    await flushPromises();
    expect(updateCommunityComment).toHaveBeenCalledTimes(2);
    expect(target.text()).toContain("Reintento");
    wrapper.unmount();
  });

  it("coordinates double submissions per comment", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("target")]));
    let resolveUpdate: (value: { id: string; comment: string; editedAt: string }) => void = () => {};
    updateCommunityComment.mockReturnValueOnce(new Promise((resolve) => { resolveUpdate = resolve; }));
    const wrapper = mountConversation();
    await flushPromises();
    const target = wrapper.get('[data-comment-id="target"]');
    await findButton(target, "Editar").trigger("click");
    await target.get("input").setValue("Una edición");
    const first = findButton(target, "Guardar").trigger("click");
    await flushPromises();
    expect(target.findAll("button").find((button) => button.text().trim() === "Guardar")?.attributes("disabled")).toBeDefined();
    await findButton(target, "Guardar").trigger("click");
    expect(updateCommunityComment).toHaveBeenCalledTimes(1);
    resolveUpdate({ id: "target", comment: "Una edición", editedAt: "2026-09-30T12:01:00.000Z" });
    await first;
    await flushPromises();
    expect(target.text()).toContain("Una edición");
    wrapper.unmount();
  });

  it("cancels editing without writing or changing the tree", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("target"), comment("child", "target")]));
    const wrapper = mountConversation();
    await flushPromises();
    const target = wrapper.get('[data-comment-id="target"]');
    await findButton(target, "Editar").trigger("click");
    await target.get("input").setValue("Cancelado");
    await findButton(target, "Cancelar").trigger("click");
    expect(updateCommunityComment).not.toHaveBeenCalled();
    expect(target.text()).toContain("Comentario target");
    expect(target.get(".comment-replies [data-comment-id='child']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("deletes through Community after confirmation and keeps the node, children, position, and modal count", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([
      comment("before"), comment("target"), { ...comment("child", "target"), user: { id: "user-2", username: "Pablo" } }, comment("after"),
    ]));
    const wrapper = mountConversation();
    await flushPromises();

    await findButton(wrapper.get('[data-comment-id="target"]'), "Borrar").trigger("click");
    await flushPromises();

    expect(confirm).toHaveBeenCalledWith("¿Borrar comentario?", "Esta acción no se puede deshacer.", "Sí, borrar", "Cancelar");
    expect(deleteCommunityComment).toHaveBeenCalledTimes(1);
    expect(deleteCommunityComment).toHaveBeenCalledWith("target");
    expect(wrapper.findAll(".comment-item").map((node) => node.attributes("data-comment-id")))
      .toEqual(["before", "target", "child", "after"]);
    const deleted = wrapper.get('[data-comment-id="target"]');
    expect(deleted.text()).toContain("Comentario eliminado.");
    expect(deleted.text()).not.toContain("Ana");
    expect(deleted.get(".comment-item > .flex").findAll("button")).toHaveLength(0);
    expect(deleted.get(".comment-replies [data-comment-id='child']").exists()).toBe(true);
    expect(wrapper.text()).toContain("4 comentarios");
    expect(showSuccess).toHaveBeenCalledWith("Comentario borrado");
    wrapper.unmount();
  });

  it("keeps the confirmed tree intact on delete failure and allows retry", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("target"), comment("child", "target")]));
    deleteCommunityComment.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    const wrapper = mountConversation();
    await flushPromises();
    const target = wrapper.get('[data-comment-id="target"]');

    await findButton(target, "Borrar").trigger("click");
    await flushPromises();
    expect(target.text()).toContain("Comentario target");
    expect(target.get(".comment-replies [data-comment-id='child']").exists()).toBe(true);
    expect(wrapper.text()).toContain("2 comentarios");
    expect(showError).toHaveBeenCalledWith("Error al borrar el comentario.");

    await findButton(target, "Borrar").trigger("click");
    await flushPromises();
    expect(deleteCommunityComment).toHaveBeenCalledTimes(2);
    expect(target.text()).toContain("Comentario eliminado.");
    expect(target.get(".comment-replies [data-comment-id='child']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("does not write or change the conversation when delete confirmation is cancelled", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("target"), comment("child", "target")]));
    confirm.mockResolvedValueOnce({ isConfirmed: false });
    const wrapper = mountConversation();
    await flushPromises();
    const target = wrapper.get('[data-comment-id="target"]');
    const before = wrapper.text();

    await findButton(target, "Borrar").trigger("click");
    await flushPromises();

    expect(deleteCommunityComment).not.toHaveBeenCalled();
    expect(wrapper.text()).toBe(before);
    expect(target.get(".comment-replies [data-comment-id='child']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("coordinates repeated delete clicks while confirmation and backend request are pending", async () => {
    loadConversation.mockResolvedValueOnce(buildCommentTree([comment("target")]));
    let resolveConfirmation: (value: { isConfirmed: boolean }) => void = () => {};
    confirm.mockReturnValueOnce(new Promise((resolve) => { resolveConfirmation = resolve; }));
    let resolveDelete: () => void = () => {};
    deleteCommunityComment.mockReturnValueOnce(new Promise<void>((resolve) => { resolveDelete = resolve; }));
    const wrapper = mountConversation();
    await flushPromises();
    const target = wrapper.get('[data-comment-id="target"]');
    const firstClick = findButton(target, "Borrar").trigger("click");
    await flushPromises();
    expect(findButton(target, "Borrar").attributes("disabled")).toBeDefined();
    await findButton(target, "Borrar").trigger("click");
    expect(confirm).toHaveBeenCalledTimes(1);

    resolveConfirmation({ isConfirmed: true });
    await flushPromises();
    expect(deleteCommunityComment).toHaveBeenCalledTimes(1);
    await findButton(target, "Borrar").trigger("click");
    expect(deleteCommunityComment).toHaveBeenCalledTimes(1);
    resolveDelete();
    await firstClick;
    await flushPromises();
    expect(target.text()).toContain("Comentario eliminado.");
    wrapper.unmount();
  });
});
