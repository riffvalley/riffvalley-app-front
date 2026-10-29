export function formatCalendarDate(dateString: string): string {
  const date = new Date(dateString);
  const formattedDate = date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedWeekday = date.toLocaleDateString("es-ES", {
    weekday: "long",
  });

  return `${formattedDate}, ${formattedWeekday}`;
}

export function toggleCalendarGroup(
  groupState: Record<number, boolean>,
  index: number
): void {
  groupState[index] = !groupState[index];
}

export function scrollCalendarToTop(scrollSentinel: HTMLElement | null): void {
  let element: Element | null = scrollSentinel?.parentElement ?? null;
  while (element) {
    if (element.scrollTop > 0) {
      element.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (element === document.documentElement) break;
    element = element.parentElement;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
