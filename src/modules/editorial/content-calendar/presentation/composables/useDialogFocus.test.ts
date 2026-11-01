// @vitest-environment happy-dom
import { defineComponent, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { useDialogFocus } from "./useDialogFocus";

describe("useDialogFocus", () => {
  it("moves focus into an open dialog, traps Tab, and restores focus after close", async () => {
    const Demo = defineComponent({
      setup() {
        const open = ref(false);
        const { dialog } = useDialogFocus(() => open.value);
        return { dialog, open };
      },
      template: `
        <main>
          <button id="trigger" @click="open = true">Abrir</button>
          <button id="close" @click="open = false">Cerrar</button>
          <section v-if="open" ref="dialog" tabindex="-1">
            <button id="first">Primero</button>
            <button id="last">Último</button>
          </section>
        </main>
      `,
    });

    const wrapper = mount(Demo, { attachTo: document.body });
    const trigger = wrapper.get("#trigger").element as HTMLButtonElement;
    trigger.focus();
    await wrapper.get("#trigger").trigger("click");
    await flushPromises();

    const first = wrapper.get("#first").element as HTMLButtonElement;
    const last = wrapper.get("#last").element as HTMLButtonElement;
    expect(document.activeElement).toBe(first);

    last.focus();
    last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(first);

    first.focus();
    first.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true })
    );
    expect(document.activeElement).toBe(last);

    await wrapper.get("#close").trigger("click");
    await flushPromises();
    expect(document.activeElement).toBe(trigger);

    wrapper.unmount();
  });
});
