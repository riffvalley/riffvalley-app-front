// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCalendarLoadMoreObserver } from "./useCalendarLoadMoreObserver";

type ObserverInstance = {
  callback: IntersectionObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

const observers: ObserverInstance[] = [];

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(public callback: IntersectionObserverCallback) {
    observers.push(this);
  }
}

describe("useCalendarLoadMoreObserver", () => {
  afterEach(() => {
    observers.length = 0;
    vi.unstubAllGlobals();
  });

  it("observes, pauses, resumes, handles intersections and disconnects on unmount", async () => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    const onIntersect = vi.fn();
    const Host = defineComponent({
      setup() {
        const target = ref<HTMLElement | null>(null);
        const controls = useCalendarLoadMoreObserver(target, onIntersect);
        return { target, ...controls };
      },
      template:
        '<div><div ref="target"></div><button @click="pause"></button><button @click="resume"></button></div>',
    });
    const wrapper = mount(Host);
    const observer = observers[0];
    const target = wrapper.findAll("div")[1].element;

    expect(observer.observe).toHaveBeenCalledWith(target);
    observer.callback([{ isIntersecting: true } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
    observer.callback([{ isIntersecting: false } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
    expect(onIntersect).toHaveBeenCalledTimes(1);

    await wrapper.get("button").trigger("click");
    expect(observer.unobserve).toHaveBeenCalledWith(target);
    await wrapper.findAll("button")[1].trigger("click");
    expect(observer.observe).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });
});
