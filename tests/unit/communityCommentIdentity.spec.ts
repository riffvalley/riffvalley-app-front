// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import CommunityCommentsModal from "@/app/components/CommunityCommentsModal.vue";
import CommentItem from "@/modules/community/comments/presentation/components/CommentItem.vue";
import { useAuthStore } from "@/app/dependencies/identity";
import type { DiscComment } from "@/modules/community";

vi.mock("@/components/UserModal.vue", () => ({
  default: {
    name: "UserModal",
    props: ["username", "userId", "avatarSrc"],
    template: '<div class="user-modal">{{ username }}|{{ userId }}|{{ avatarSrc }}</div>',
  },
}));

vi.mock("@/modules/community", () => ({
  createCommentConversationOperations: () => ({}),
  useCommunityRatingStore: () => ({ clear: vi.fn() }),
  CommentConversationModal: {
    name: "CommentConversationModal",
    props: ["discId", "artistName", "albumName", "currentUser", "sessionAvatar", "operations", "feedback"],
    emits: ["close", "open-user", "comment-count-change"],
    template: '<button class="open-user" @click="$emit(\'open-user\', { username: \'listener\', id: \'user-2\', avatar: \'comment-avatar\' })">open</button>',
  },
}));

const comment = (user: DiscComment["user"]): DiscComment => ({
  id: "comment-1",
  comment: "Hello",
  createdAt: "2026-01-01T00:00:00Z",
  user,
  replies: [],
});

const baseProps = {
  discId: "disc-1",
  depth: 0,
  submittingReplyIds: new Set<string>(),
  editingCommentIds: new Set<string>(),
  deletingCommentIds: new Set<string>(),
  submitReply: vi.fn(),
  submitEdit: vi.fn(),
  submitDelete: vi.fn(),
  feedback: { error: vi.fn(), success: vi.fn(), confirm: vi.fn().mockResolvedValue({ isConfirmed: false }) },
};

describe("Community comment identity composition", () => {
  afterEach(() => vi.clearAllMocks());

  it("passes Identity user/avatar into comments and opens UserModal from app composition", async () => {
    setActivePinia(createPinia());
    useAuthStore().$patch({ userId: "active-1", username: "active-user", image: "identity-avatar" });
    const modal = mount(CommunityCommentsModal, { props: { discId: "disc-1", artistName: "Band", albumName: "Record" } });
    const conversation = modal.findComponent({ name: "CommentConversationModal" });

    expect(conversation.props("currentUser")).toEqual({ id: "active-1", username: "active-user" });
    expect(conversation.props("sessionAvatar")).toBe("identity-avatar");
    await modal.find(".open-user").trigger("click");
    expect(modal.find(".user-modal").text()).toBe("listener|user-2|comment-avatar");
    await modal.findComponent({ name: "CommentConversationModal" }).vm.$emit("comment-count-change", 7);
    expect(modal.emitted("comment-count-change")?.[0]).toEqual([7]);
    await modal.findComponent({ name: "UserModal" }).vm.$emit("close");
    expect(modal.find(".user-modal").exists()).toBe(false);
  });

  it("uses comment avatar fields before the active Identity avatar", () => {
    const mountComment = (user: DiscComment["user"]) => mount(CommentItem, {
      props: { ...baseProps, comment: comment(user), currentUser: { id: "user-1", username: "active" }, sessionAvatar: "session-avatar" },
    });
    expect(mountComment({ id: "user-1", username: "active", avatarUrl: "avatar-url", image: "image" }).find("img").attributes("src")).toBe("avatar-url");
    expect(mountComment({ id: "user-1", username: "active", image: "image" }).find("img").attributes("src")).toBe("image");
    expect(mountComment({ id: "user-1", username: "active" }).find("img").attributes("src")).toBe("session-avatar");
  });

  it("opens a user with the displayed avatar and preserves the existing author controls", async () => {
    const wrapper = mount(CommentItem, {
      props: { ...baseProps, comment: comment({ id: "user-2", username: "listener", image: "image" }), currentUser: { id: "user-2", username: "listener" }, sessionAvatar: "session-avatar" },
    });
    await wrapper.get(".comment-item button.font-semibold").trigger("click");
    expect(wrapper.emitted("open-user")?.[0]?.[0]).toEqual({ username: "listener", id: "user-2", avatar: "image" });
    expect(wrapper.text()).toContain("Editar");
    expect(wrapper.text()).toContain("Borrar");
  });

  it("keeps edit and delete controls hidden for comments by another user", () => {
    const wrapper = mount(CommentItem, {
      props: { ...baseProps, comment: comment({ id: "user-2", username: "listener" }), currentUser: { id: "user-1", username: "active" } },
    });
    expect(wrapper.text()).not.toContain("Editar");
    expect(wrapper.text()).not.toContain("Borrar");
  });
});
