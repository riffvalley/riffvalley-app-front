import { nextTick, onBeforeUnmount, ref, watch } from "vue";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(isOpen: () => boolean) {
  const dialog = ref<HTMLElement | null>(null);
  let previouslyFocusedElement: HTMLElement | null = null;

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Tab" || !dialog.value) return;

    const focusableElements = Array.from(
      dialog.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
    const first = focusableElements[0];
    const last = focusableElements.at(-1);

    if (!first || !last) {
      event.preventDefault();
      dialog.value.focus();
    } else if (
      event.shiftKey &&
      (document.activeElement === first || !dialog.value.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !dialog.value.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  watch(
    isOpen,
    async (open) => {
      const currentDialog = dialog.value;
      if (open) {
        previouslyFocusedElement =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        await nextTick();
        const activeDialog = dialog.value;
        activeDialog?.addEventListener("keydown", handleKeydown);
        (
          activeDialog?.querySelector<HTMLElement>("[data-initial-focus]") ??
          activeDialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
          activeDialog
        )?.focus();
        return;
      }

      currentDialog?.removeEventListener("keydown", handleKeydown);
      await nextTick();
      previouslyFocusedElement?.focus();
      previouslyFocusedElement = null;
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    dialog.value?.removeEventListener("keydown", handleKeydown);
    previouslyFocusedElement?.focus();
  });

  return { dialog };
}
