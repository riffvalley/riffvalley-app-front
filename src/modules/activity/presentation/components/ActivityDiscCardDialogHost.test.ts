// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, h, inject, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { discCardDialogKey } from "@/composables/discCardDialog";

vi.mock("./ActivityDiscCardDialog.vue", async () => {
  const { defineComponent: define, h: render } = await import("vue");
  return {
    default: define({
      props: { discId: { type: String, required: true } },
      emits: ["close", "updated"],
      setup(props, { emit }) {
        return () => render("div", { "data-test": "disc-card", "data-id": props.discId }, [
          render("button", { "data-test": "update", onClick: () => emit("updated") }, "Votar"),
          render("button", { "data-test": "close", onClick: () => emit("close") }, "Cerrar"),
        ]);
      },
    }),
  };
});
import ActivityDiscCardDialogHost from "./ActivityDiscCardDialogHost.vue";

const Consumer = defineComponent({
  props: { onClose: { type: Function, required: true } },
  setup(props) {
    const opener = inject(discCardDialogKey)!;
    return () => h("button", { "data-test": "open", "data-open": String(opener.isOpen.value), onClick: () => opener.open("disc-1", { onClose: props.onClose as (changed: boolean) => void }) }, "Abrir");
  },
});

afterEach(() => { document.body.innerHTML = ""; });

describe("ActivityDiscCardDialogHost", () => {
  it("provides the disc card to its descendants, above other modals, and reports changes on close", async () => {
    const onClose = vi.fn();
    const wrapper = mount(ActivityDiscCardDialogHost, { slots: { default: () => h(Consumer, { onClose }) }, attachTo: document.body });
    expect(document.body.querySelector("[data-test=disc-card]")).toBeNull();

    await wrapper.get("[data-test=open]").trigger("click");
    await nextTick();
    const card = document.body.querySelector<HTMLElement>("[data-test=disc-card]")!;
    expect(card.getAttribute("data-id")).toBe("disc-1");
    expect(card.parentElement?.className).toContain("z-[100]");
    expect(wrapper.get("[data-test=open]").attributes("data-open")).toBe("true");

    document.body.querySelector<HTMLButtonElement>("[data-test=update]")!.click();
    document.body.querySelector<HTMLButtonElement>("[data-test=close]")!.click();
    await nextTick();
    expect(document.body.querySelector("[data-test=disc-card]")).toBeNull();
    expect(onClose).toHaveBeenCalledWith(true);

    await wrapper.get("[data-test=open]").trigger("click");
    await nextTick();
    document.body.querySelector<HTMLButtonElement>("[data-test=close]")!.click();
    expect(onClose).toHaveBeenLastCalledWith(false);
    wrapper.unmount();
  });
});
