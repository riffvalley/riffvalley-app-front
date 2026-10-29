// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { reactive } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as { authStatus: string; role: string | null } | null,
  },
}));

vi.mock("@/modules/identity/auth", () => ({
  useAuthStore: () => authState.current,
}));
vi.mock("./DiscCalendar.vue", () => ({
  default: {
    name: "EditorialCalendarStub",
    template: '<div data-testid="editorial-calendar"></div>',
  },
}));
vi.mock("./DiscCalendarBaby.vue", () => ({
  default: {
    name: "UserCalendarStub",
    template: '<div data-testid="user-calendar"></div>',
  },
}));

import CalendarRoleView from "./CalendarRoleView.vue";

describe("CalendarRoleView", () => {
  beforeEach(() => {
    authState.current = reactive({ authStatus: "authenticated", role: "user" });
  });

  it.each([
    ["user", "user-calendar"],
    ["collaborator", "user-calendar"],
    ["riffvalley", "editorial-calendar"],
    ["superadmin", "editorial-calendar"],
  ])("selects the expected calendar for role %s", (role, testId) => {
    authState.current!.role = role;
    const wrapper = mount(CalendarRoleView);

    expect(wrapper.find('[data-testid="user-calendar"]').exists()).toBe(
      testId === "user-calendar"
    );
    expect(wrapper.find('[data-testid="editorial-calendar"]').exists()).toBe(
      testId === "editorial-calendar"
    );
    wrapper.unmount();
  });

  it("does not render a calendar while Identity is initializing", async () => {
    authState.current!.authStatus = "initializing";
    authState.current!.role = "superadmin";
    const wrapper = mount(CalendarRoleView);

    expect(wrapper.find('[data-testid="editorial-calendar"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="user-calendar"]').exists()).toBe(false);

    authState.current!.authStatus = "authenticated";
    await flushPromises();

    expect(wrapper.find('[data-testid="editorial-calendar"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("switches the rendered calendar when the authenticated role changes", async () => {
    const wrapper = mount(CalendarRoleView);
    expect(wrapper.find('[data-testid="user-calendar"]').exists()).toBe(true);

    authState.current!.role = "riffvalley";
    await flushPromises();
    expect(wrapper.find('[data-testid="editorial-calendar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="user-calendar"]').exists()).toBe(false);

    authState.current!.role = "collaborator";
    await flushPromises();
    expect(wrapper.find('[data-testid="user-calendar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="editorial-calendar"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
