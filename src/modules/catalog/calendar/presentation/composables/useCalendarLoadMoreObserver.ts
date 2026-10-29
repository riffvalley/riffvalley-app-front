import { onMounted, onUnmounted, type Ref } from "vue";

export function useCalendarLoadMoreObserver(
  target: Ref<HTMLElement | null>,
  onIntersect: () => void
) {
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) onIntersect();
    });

    if (target.value) observer.observe(target.value);
  });

  onUnmounted(() => observer?.disconnect());

  const pause = () => {
    if (target.value) observer?.unobserve(target.value);
  };

  const resume = () => {
    if (target.value) observer?.observe(target.value);
  };

  return { pause, resume };
}
