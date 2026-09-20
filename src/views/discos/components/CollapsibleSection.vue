<template>
  <section>
    <button type="button"
      class="w-full flex items-center gap-2 text-left rounded-xl p-0 py-1 bg-transparent hover:bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-rv-purple/40"
      :class="open ? 'mb-4' : ''"
      :aria-expanded="open"
      @click="open = !open">
      <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" :class="iconWrapClass">
        <i class="text-sm" :class="[icon, iconClass]"></i>
      </div>
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">{{ title }}</h2>
      <span v-if="count !== undefined && count > 0"
        class="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
        {{ count }}
      </span>
      <i class="fa-solid fa-chevron-down ml-auto text-xs text-gray-400 transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"></i>
    </button>

    <div v-show="open">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  icon: string;
  count?: number;
  iconWrapClass?: string;
  iconClass?: string;
}>(), {
  iconWrapClass: 'bg-gray-100 dark:bg-rv-darkSurface',
  iconClass: 'text-gray-500 dark:text-gray-400',
});

// Colapsado por defecto; el usuario lo abre cuando lo necesita.
const open = defineModel<boolean>('open', { default: false });
</script>
