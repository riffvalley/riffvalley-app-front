<script setup lang="ts">
import { computed } from "vue";
import {
  dashboardWidgetRegistry,
  type DashboardModule,
  type DashboardWidgetId,
} from "@/app/dashboardWidgetRegistry";

const props = defineProps<{
  modules: readonly DashboardModule[];
}>();

const slots = defineSlots<{
  [Id in DashboardWidgetId]?: () => unknown;
}>();

const definitions = new Map(dashboardWidgetRegistry.map((widget) => [widget.id, widget]));

const visibleWidgets = computed(() =>
  props.modules.filter(
    (module) =>
      module.enabled &&
      definitions.has(module.id as DashboardWidgetId) &&
      Boolean(slots[module.id as DashboardWidgetId]),
  ),
);
</script>

<template>
  <div class="flex flex-wrap gap-6" data-test="dashboard-widget-grid">
    <div
      v-for="module in visibleWidgets"
      :key="module.id"
      :class="
        definitions.get(module.id)?.size === 'full'
          ? 'w-full'
          : 'w-full lg:w-[calc(50%-12px)] min-w-0 flex flex-col'
      "
      :data-widget-id="module.id"
    >
      <slot :name="module.id" />
    </div>
  </div>
</template>
