import { onMounted, onUnmounted, ref } from "vue";

// Mismo corte que el breakpoint `sm` de Tailwind (640px), usado también en
// DashboardBuilder.vue para decidir qué editor mostrar.
const MOBILE_QUERY = "(max-width: 639px)";

export function useIsMobileViewport() {
  const isMobile = ref(
    typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false
  );

  let mql: MediaQueryList | null = null;
  const handleChange = (e: MediaQueryListEvent) => {
    isMobile.value = e.matches;
  };

  onMounted(() => {
    mql = window.matchMedia(MOBILE_QUERY);
    isMobile.value = mql.matches;
    mql.addEventListener("change", handleChange);
  });

  onUnmounted(() => {
    mql?.removeEventListener("change", handleChange);
  });

  return isMobile;
}
