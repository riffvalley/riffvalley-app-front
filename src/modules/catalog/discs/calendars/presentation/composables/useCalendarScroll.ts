import { onMounted, onUnmounted, ref, shallowRef } from "vue";

export function useCalendarScroll(fetchNext: () => Promise<unknown>) {
  const loadMore = ref<HTMLDivElement | null>(null);
  const scrollSentinel = ref<HTMLElement | null>(null);
  const showScrollTop = shallowRef(false);
  let pageObserver: IntersectionObserver | undefined;
  let sentinelObserver: IntersectionObserver | undefined;
  onMounted(() => {
    pageObserver = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) void fetchNext(); });
    if (loadMore.value) pageObserver.observe(loadMore.value);
    sentinelObserver = new IntersectionObserver(([entry]) => { showScrollTop.value = !entry.isIntersecting; }, { threshold: 0 });
    if (scrollSentinel.value) sentinelObserver.observe(scrollSentinel.value);
  });
  onUnmounted(() => { pageObserver?.disconnect(); sentinelObserver?.disconnect(); });
  function scrollToTop() {
    let element: Element | null = scrollSentinel.value?.parentElement ?? null;
    while (element) {
      if (element.scrollTop > 0) { element.scrollTo({ top: 0, behavior: "smooth" }); return; }
      if (element === document.documentElement) break;
      element = element.parentElement;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return { loadMore, scrollSentinel, showScrollTop, scrollToTop };
}
