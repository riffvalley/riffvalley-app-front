<template>
  <div
    class="group bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden"
    @click="$emit('open', list.id)">

    <div class="p-4 flex-1 flex flex-col">
      <!-- Status + flecha -->
      <div class="flex items-center justify-between mb-3">
        <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
          :class="statusClass">
          {{ statusLabel }}
        </span>
        <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-gray-300 dark:text-gray-600 group-hover:text-rv-purple transition-colors"></i>
      </div>

      <!-- Título -->
      <h3 class="font-bold text-sm leading-snug text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-rv-purple dark:group-hover:text-rv-pink transition-colors">
        {{ list.name }}
      </h3>

      <div class="mt-auto space-y-2">
        <!-- Fechas -->
        <div class="space-y-1 pt-2 border-t border-gray-100 dark:border-white/5">
          <div class="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <i class="fa-regular fa-calendar text-[10px] text-gray-400"></i>
            <span>{{ formatDate(list.releaseDate || list.listDate) }}</span>
          </div>
          <div v-if="list.closeDate" class="flex items-center justify-center gap-1.5 text-xs"
            :class="closed ? 'text-gray-400 dark:text-gray-500' : 'text-red-500 dark:text-red-400 font-medium'">
            <i class="fa-regular fa-clock text-[10px]"></i>
            <span>{{ formatDate(list.closeDate) }}</span>
          </div>
        </div>

        <!-- Avatares -->
        <div v-if="assignees.length > 0" class="flex items-center gap-1.5 pt-1">
          <div class="flex -space-x-1.5">
            <img v-for="(user, index) in assignees.slice(0, 5)"
              :key="user.id" :src="user.image || '/avatar/avatar37.png'"
              :alt="user.username" :title="user.username"
              class="w-5 h-5 rounded-full border-2 border-white dark:border-rv-darkCard object-cover"
              :style="{ zIndex: 5 - index }" />
          </div>
          <span v-if="assignees.length > 5" class="text-[10px] text-gray-400 font-medium">
            +{{ assignees.length - 5 }}
          </span>
        </div>
      </div>
    </div>

    <!-- Barra inferior animada -->
    <div class="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-rv-purple to-rv-pink transition-all duration-500"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  list: any;
  closed?: boolean;
}>();

defineEmits<{ open: [id: string] }>();

const STATUS_CLASSES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  assigned: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  published: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Nueva',
  assigned: 'Asignada',
  published: 'Publicada',
};

const statusClass = computed(
  () => STATUS_CLASSES[props.list.status] || 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
);
const statusLabel = computed(() => STATUS_LABELS[props.list.status] || props.list.status);

const assignees = computed(() => {
  const unique = new Map();
  (props.list.asignations || []).forEach((a: any) => {
    if (a.user && !unique.has(a.user.id)) unique.set(a.user.id, a.user);
  });
  return Array.from(unique.values());
});

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long'
  });
}
</script>
