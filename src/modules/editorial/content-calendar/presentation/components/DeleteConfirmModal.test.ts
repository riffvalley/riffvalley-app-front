// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import DeleteConfirmModal from "./DeleteConfirmModal.vue";
import type { ContentType } from "@services/contents/contents";

const cases: Array<[ContentType, string, string]> = [
  ["article", "¿Eliminar del calendario?", "el artículo seguirá existiendo."],
  ["photos", "¿Eliminar fotografías?", "incluidas sus notas y fechas."],
  ["riff_valley_playlist", "¿Eliminar del calendario?", "la playlist seguirá existiendo."],
  ["radar", "¿Eliminar Radar?", "Los discos originales no se eliminarán."],
  ["best", "¿Eliminar Best?", "Los discos originales no se eliminarán."],
  [
    "video",
    "¿Eliminar del calendario?",
    "se conservarán el vídeo, su lista y las asignaciones asociadas.",
  ],
  ["reunion", "¿Eliminar reunión?", "la reunión y todos sus puntos"],
];

function mountModal(contentType: ContentType, pending = false) {
  return mount(DeleteConfirmModal, {
    props: { show: true, contentName: "Contenido de prueba", contentType, pending },
  });
}

describe("DeleteConfirmModal", () => {
  it.each(cases)("presents approved consequences for %s", (contentType, title, message) => {
    const wrapper = mountModal(contentType);
    const dialog = wrapper.get('[role="alertdialog"]');

    expect(wrapper.get("#delete-confirm-title").text()).toBe(title);
    expect(wrapper.get("#delete-confirm-description").text()).toContain("Contenido de prueba");
    expect(wrapper.get("#delete-confirm-description").text()).toContain(message);
    expect(dialog.attributes("aria-modal")).toBe("true");
    expect(dialog.attributes("aria-labelledby")).toBe("delete-confirm-title");
    expect(dialog.attributes("aria-describedby")).toBe("delete-confirm-description");
    expect(wrapper.findAll("button")).toHaveLength(2);
    wrapper.unmount();
  });

  it("emits explicit confirm and cancel actions", async () => {
    const wrapper = mountModal("article");
    await wrapper.get("button:last-child").trigger("click");
    await wrapper.get("button:first-child").trigger("click");

    expect(wrapper.emitted("confirm")).toHaveLength(1);
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("allows Escape to cancel but does not dismiss a pending deletion", async () => {
    const wrapper = mountModal("article");
    await flushPromises();
    await wrapper.get('[role="alertdialog"]').trigger("keydown", { key: "Escape" });
    expect(wrapper.emitted("cancel")).toHaveLength(1);

    const pendingWrapper = mountModal("article", true);
    await flushPromises();
    await pendingWrapper.get('[role="alertdialog"]').trigger("keydown", { key: "Escape" });
    expect(pendingWrapper.emitted("cancel")).toBeUndefined();
  });

  it("disables both actions and ignores duplicate confirmation while pending", async () => {
    const wrapper = mountModal("photos", true);
    const buttons = wrapper.findAll("button");
    await buttons[1].trigger("click");
    await buttons[0].trigger("click");

    expect(buttons.every((button) => (button.element as HTMLButtonElement).disabled)).toBe(true);
    expect(buttons[1].text()).toContain("Eliminando…");
    expect(wrapper.emitted("confirm")).toBeUndefined();
    expect(wrapper.emitted("cancel")).toBeUndefined();
  });

  it("announces operation errors in the dialog", () => {
    const wrapper = mount(DeleteConfirmModal, {
      props: {
        show: true,
        contentName: "Radar semanal",
        contentType: "radar",
        errorMessage: "No se pudo eliminar el contenido.",
      },
    });

    expect(wrapper.get('[role="alert"]').text()).toBe("No se pudo eliminar el contenido.");
  });
});
