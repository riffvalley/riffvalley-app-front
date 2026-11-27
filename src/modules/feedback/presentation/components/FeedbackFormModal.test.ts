// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import FeedbackFormModal from "./FeedbackFormModal.vue";

function modalElement(selector: string): HTMLElement {
  const element = document.body.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Expected element ${selector} in the document`);
  return element;
}

async function enterValue(selector: string, value: string) {
  const element = modalElement(selector) as
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  element.value = value;
  element.dispatchEvent(
    new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true })
  );
  await nextTick();
}

function submitForm() {
  modalElement("[role=dialog] form").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );
}

describe("FeedbackFormModal", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.restoreAllMocks();
  });

  it("starts with suggestion and no category, and changes copy while preserving the draft", async () => {
    wrapper = mount(FeedbackFormModal, {
      attachTo: document.body,
      props: { open: true, submitting: false, errorMessage: "" },
    });
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(modalElement("#feedback-form-type-suggestion"))
    );

    const category = modalElement("#feedback-form-category") as HTMLSelectElement;
    expect(category.value).toBe("");
    expect([...category.options].map((option) => option.value)).not.toContain("uncategorized");
    expect((modalElement("#feedback-form-type-suggestion") as HTMLInputElement).type).toBe("radio");
    expect(
      (modalElement("#feedback-form-type-suggestion") as HTMLInputElement).classList.contains(
        "sr-only"
      )
    ).toBe(true);
    expect(
      modalElement(
        'label[for="feedback-form-type-suggestion"] .feedback-type-card'
      ).classList.contains("border-rv-blue")
    ).toBe(true);
    expect(
      modalElement('label[for="feedback-form-type-bug"] .feedback-type-card').classList.contains(
        "bg-gray-50"
      )
    ).toBe(true);
    expect((modalElement("#feedback-form-title-input") as HTMLInputElement).placeholder).toBe(
      "¿Qué te gustaría mejorar?"
    );
    expect((modalElement("#feedback-form-description") as HTMLTextAreaElement).placeholder).toBe(
      "Explica qué añadirías o cambiarías"
    );
    expect(modalElement("#feedback-form-description-help").textContent).toContain(
      "Cuéntanos cómo podríamos mejorar la aplicación"
    );
    expect(modalElement("#feedback-form-description-help").classList.contains("bg-blue-50")).toBe(
      true
    );
    expect(
      modalElement("#feedback-form-title")
        .previousElementSibling?.querySelector("i")
        ?.classList.contains("fa-lightbulb")
    ).toBe(true);
    expect(modalElement("[role=dialog] button[type=submit]").classList.contains("bg-rv-blue")).toBe(
      true
    );

    await enterValue("#feedback-form-category", "events");
    await enterValue("#feedback-form-title-input", "A festival filter");
    await enterValue("#feedback-form-description", "Add a festival filter");
    modalElement('label[for="feedback-form-type-bug"] .feedback-type-card').click();
    await nextTick();
    expect((modalElement("#feedback-form-type-bug") as HTMLInputElement).checked).toBe(true);

    expect((modalElement("#feedback-form-title-input") as HTMLInputElement).placeholder).toBe(
      "¿Qué está fallando?"
    );
    expect((modalElement("#feedback-form-description") as HTMLTextAreaElement).placeholder).toBe(
      "Explica qué estabas haciendo y qué ha ocurrido"
    );
    expect(modalElement("#feedback-form-description-help").textContent).toContain(
      "Indica, si es posible, los pasos para reproducir el error"
    );
    expect(modalElement("[role=dialog] button[type=submit]").textContent).toContain(
      "Comunicar bug"
    );
    expect(
      modalElement('label[for="feedback-form-type-bug"] .feedback-type-card').classList.contains(
        "border-red-500"
      )
    ).toBe(true);
    expect(
      modalElement(
        'label[for="feedback-form-type-suggestion"] .feedback-type-card'
      ).classList.contains("bg-gray-50")
    ).toBe(true);
    expect(modalElement("#feedback-form-description-help").classList.contains("bg-red-50")).toBe(
      true
    );
    expect(
      modalElement("#feedback-form-title")
        .previousElementSibling?.querySelector("i")
        ?.classList.contains("fa-bug")
    ).toBe(true);
    expect(modalElement("[role=dialog] button[type=submit]").classList.contains("bg-red-600")).toBe(
      true
    );
    expect(category.value).toBe("events");
    expect((modalElement("#feedback-form-title-input") as HTMLInputElement).value).toBe(
      "A festival filter"
    );
    expect((modalElement("#feedback-form-description") as HTMLTextAreaElement).value).toBe(
      "Add a festival filter"
    );

    modalElement('label[for="feedback-form-type-suggestion"] .feedback-type-card').click();
    await nextTick();
    expect((modalElement("#feedback-form-type-suggestion") as HTMLInputElement).checked).toBe(true);
    expect(modalElement("[role=dialog] button[type=submit]").textContent).toContain(
      "Enviar sugerencia"
    );
    expect((modalElement("#feedback-form-title-input") as HTMLInputElement).value).toBe(
      "A festival filter"
    );
  });

  it("requires type, category, title, and description before emitting", async () => {
    wrapper = mount(FeedbackFormModal, {
      attachTo: document.body,
      props: { open: true, submitting: false, errorMessage: "" },
    });
    await vi.waitFor(() => expect(document.body.querySelector("[role=dialog]")).not.toBeNull());

    submitForm();
    expect(wrapper.emitted("submit")).toBeUndefined();

    await enterValue("#feedback-form-category", "albums");
    await enterValue("#feedback-form-title-input", "   ");
    await enterValue("#feedback-form-description", "Description");
    submitForm();
    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("emits the complete categorized payload for suggestions and bugs", async () => {
    const payloads = [
      {
        type: "suggestion" as const,
        category: "artists" as const,
        submitLabel: "Enviar sugerencia",
      },
      { type: "bug" as const, category: "votes" as const, submitLabel: "Comunicar bug" },
    ];

    for (const [index, payload] of payloads.entries()) {
      wrapper = mount(FeedbackFormModal, {
        attachTo: document.body,
        props: { open: true, submitting: false, errorMessage: "" },
      });
      await vi.waitFor(() => expect(document.body.querySelector("[role=dialog]")).not.toBeNull());
      if (payload.type === "bug") {
        modalElement('label[for="feedback-form-type-bug"] .feedback-type-card').click();
        await nextTick();
      }
      await enterValue("#feedback-form-category", payload.category);
      await enterValue("#feedback-form-title-input", `Title ${index}`);
      await enterValue("#feedback-form-description", `Description ${index}`);
      expect(modalElement("[role=dialog] button[type=submit]").textContent).toContain(
        payload.submitLabel
      );

      submitForm();
      expect(wrapper.emitted("submit")?.[0]).toEqual([
        {
          title: `Title ${index}`,
          description: `Description ${index}`,
          type: payload.type,
          category: payload.category,
        },
      ]);
      wrapper.unmount();
      wrapper = undefined;
    }
  });

  it("prevents repeated submission while a request is pending", async () => {
    wrapper = mount(FeedbackFormModal, {
      attachTo: document.body,
      props: { open: true, submitting: false, errorMessage: "" },
    });
    await vi.waitFor(() => expect(document.body.querySelector("[role=dialog]")).not.toBeNull());
    await enterValue("#feedback-form-category", "home");
    await enterValue("#feedback-form-title-input", "Title");
    await enterValue("#feedback-form-description", "Description");

    submitForm();
    submitForm();
    await nextTick();
    expect(wrapper.emitted("submit")).toHaveLength(1);
    expect((modalElement("[role=dialog] button[type=submit]") as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it("traps keyboard focus and emits close on Escape", async () => {
    wrapper = mount(FeedbackFormModal, {
      attachTo: document.body,
      props: { open: true, submitting: false, errorMessage: "" },
    });
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(modalElement("#feedback-form-type-suggestion"))
    );

    const dialog = modalElement("[role=dialog]");
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])"
      ),
    ];
    focusable.at(-1)?.focus();
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    dialog.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(focusable[0]);

    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});
