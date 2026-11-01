import {
  inject,
  onBeforeUnmount,
  provide,
  shallowRef,
  watch,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from "vue";
import type { Reunion } from "../../types/reunions";

const visibleReunionsKey: InjectionKey<Ref<Reunion[]>> = Symbol("visible-reunions");

export function provideVisibleReunions(): Ref<Reunion[]> {
  const visibleReunions = shallowRef<Reunion[]>([]);
  provide(visibleReunionsKey, visibleReunions);
  return visibleReunions;
}

export function reportVisibleReunions(reunions: ComputedRef<Reunion[]>): void {
  const visibleReunions = inject(visibleReunionsKey, null);
  if (!visibleReunions) return;
  watch(
    reunions,
    (value) => {
      visibleReunions.value = value;
    },
    { immediate: true, flush: "sync" }
  );
  onBeforeUnmount(() => {
    visibleReunions.value = [];
  });
}
