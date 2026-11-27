// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { lockPageScroll, usePageScrollLock } from "./usePageScrollLock";

const html = () => document.documentElement.style;
const body = () => document.body.style;

describe("usePageScrollLock", () => {
  afterEach(() => {
    html().overflow = "";
    body().overflow = "";
    html().paddingRight = "";
  });

  it("locks html and body and restores the previous values", () => {
    body().overflow = "clip";
    const release = lockPageScroll();
    expect(html().overflow).toBe("hidden");
    expect(body().overflow).toBe("hidden");
    release();
    release();
    expect(html().overflow).toBe("");
    expect(body().overflow).toBe("clip");
  });

  it("keeps the page locked until the last stacked modal closes", () => {
    const first = lockPageScroll();
    const second = lockPageScroll();
    first();
    expect(html().overflow).toBe("hidden");
    second();
    expect(html().overflow).toBe("");
  });

  it("follows a reactive flag and releases on unmount", async () => {
    const open = ref(false);
    const wrapper = mount(
      defineComponent({
        setup() {
          usePageScrollLock(open);
          return () => h("div");
        },
      }),
    );
    expect(html().overflow).toBe("");
    open.value = true;
    await wrapper.vm.$nextTick();
    expect(html().overflow).toBe("hidden");
    wrapper.unmount();
    expect(html().overflow).toBe("");
  });
});
