// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  push: vi.fn(),
}));

vi.mock("./api/passwordRecovery", () => ({ requestPasswordReset: mocks.requestPasswordReset }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: mocks.push }) }));

import ForgotPasswordView from "./ForgotPasswordView.vue";

describe("ForgotPasswordView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => vi.restoreAllMocks());

  it("validates email natively and shows a neutral confirmation after 202", async () => {
    mocks.requestPasswordReset.mockResolvedValue(undefined);
    const wrapper = mount(ForgotPasswordView);
    const input = wrapper.get("#forgot-password-email");
    expect(input.attributes("type")).toBe("email");
    expect(input.attributes("required")).toBeDefined();

    await input.setValue("  mara@example.com  ");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(mocks.requestPasswordReset).toHaveBeenCalledWith("mara@example.com");
    expect(wrapper.get('[role="status"]').text()).toContain("Si la cuenta existe");
    expect(wrapper.text()).not.toContain("mara@example.com");
    wrapper.unmount();
  });

  it("prevents duplicate requests while a submission is in progress", async () => {
    let resolveRequest!: () => void;
    mocks.requestPasswordReset.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRequest = resolve;
      })
    );
    const wrapper = mount(ForgotPasswordView);
    await wrapper.get("#forgot-password-email").setValue("mara@example.com");
    const form = wrapper.get("form");

    await form.trigger("submit");
    await form.trigger("submit");

    expect(mocks.requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined();
    resolveRequest();
    await flushPromises();
    wrapper.unmount();
  });

  it.each([
    [{ response: { status: 429 } }, "demasiadas solicitudes"],
    [{ response: { status: 503 } }, "no está disponible temporalmente"],
    [new TypeError("offline"), "Comprueba tu conexión"],
  ])("shows a safe error for request failures", async (failure, message) => {
    mocks.requestPasswordReset.mockRejectedValue(failure);
    const wrapper = mount(ForgotPasswordView);
    await wrapper.get("#forgot-password-email").setValue("mara@example.com");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain(message);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
