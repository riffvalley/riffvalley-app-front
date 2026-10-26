// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const { sendAccessRequest } = vi.hoisted(() => ({ sendAccessRequest: vi.fn() }));

vi.mock("@/modules/identity/auth/login/api/accessRequest", () => ({ sendAccessRequest }));

import AccessRequestModal from "./AccessRequestModal.vue";

describe("AccessRequestModal", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows the server message from an Axios failure and clears the loading state", async () => {
    sendAccessRequest.mockRejectedValue(
      Object.assign(new Error("Request failed"), {
        isAxiosError: true,
        response: { data: { message: "No se pudo crear la solicitud" } },
      })
    );
    const wrapper = mount(AccessRequestModal, { attachTo: document.body });
    const email = document.body.querySelector<HTMLInputElement>('input[type="email"]');
    const alias = document.body.querySelector<HTMLInputElement>('input[type="text"]');
    const form = document.body.querySelector("form");
    if (!email || !alias || !form) throw new Error("Missing access request form controls");

    email.value = "user@example.test";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    alias.value = "user";
    alias.dispatchEvent(new Event("input", { bubbles: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(sendAccessRequest).toHaveBeenCalledWith({ email: "user@example.test", alias: "user" });
    expect(document.body.textContent).toContain("No se pudo crear la solicitud");
    expect(document.body.querySelector('button[type="submit"]')?.hasAttribute("disabled")).toBe(
      false
    );
    wrapper.unmount();
  });
});
