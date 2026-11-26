// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TopDiscsRankingInfo from "./TopDiscsRankingInfo.vue";

describe("TopDiscsRankingInfo", () => {
  it("toggles an explanation of the weighted order and closes on Escape or outside click", async () => {
    const wrapper = mount(TopDiscsRankingInfo, {
      attachTo: document.body,
      global: { stubs: { "font-awesome-icon": true } },
    });
    const button = wrapper.get('[data-testid="ranking-info-button"]');

    expect(button.attributes("aria-expanded")).toBe("false");
    expect(wrapper.find('[data-testid="ranking-info"]').exists()).toBe(false);

    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("true");
    expect(wrapper.get('[data-testid="ranking-info"]').text()).toContain("número de votos");

    await button.trigger("keydown", { key: "Escape" });
    expect(button.attributes("aria-expanded")).toBe("false");

    await button.trigger("click");
    document.body.click();
    await wrapper.vm.$nextTick();
    expect(button.attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
  });
});
