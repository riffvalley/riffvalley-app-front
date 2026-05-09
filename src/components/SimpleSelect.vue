<template>

  <div class="ss-wrapper" ref="wrap" v-bind="attrs">

    <button type="button" class="ss-trigger" @click="toggle" ref="trigger">
      <span class="ss-left">
<span
  class="ss-text"
  :class="{
    'text-gray-400 font-normal': isPlaceholder,
    'text-rv-navy font-semibold': !isPlaceholder
  }"
>
  {{ currentLabel }}
</span>


        <span v-if="currentIcon" class="ss-inline-icon" aria-hidden="true">
          <svg v-if="currentIcon === 'up'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          <svg v-else-if="currentIcon === 'down'" viewBox="0 0 24 24" width="14" height="14" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </span>

      <i class="fas fa-chevron-down ss-icon"></i>
    </button>

    <div v-if="open" class="ss-menu" ref="menu" :style="menuStyle" @keydown.esc.prevent.stop="close">
      <div v-if="groupLabel" class="ss-group">{{ groupLabel }}</div>
      <ul class="ss-list" ref="list">
        <li v-for="opt in options" :key="opt.value" :class="['ss-item', { active: opt.value === internalValue }]"
          @click="select(opt.value)">
          <span class="ss-item-content">
            <span class="ss-label">{{ opt.label }}</span>
            <span v-if="opt.icon" class="ss-inline-icon" aria-hidden="true">
              <svg v-if="opt.icon === 'up'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              <svg v-else-if="opt.icon === 'down'" viewBox="0 0 24 24" width="14" height="14" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed, nextTick, useAttrs } from 'vue';

type Opt = { value: string | number; label: string };

defineOptions({ inheritAttrs: false });
const attrs = useAttrs();

const props = defineProps<{
  modelValue: string | number | null;
  options: Opt[];
  placeholder?: string;
  groupLabel?: string;
}>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string | number | null): void }>();

const open = ref(false);
const internalValue = ref<string | number | null>(props.modelValue ?? null);
watch(() => props.modelValue, v => (internalValue.value = v));

const isPlaceholder = computed(() =>
  internalValue.value === null || internalValue.value === undefined || internalValue.value === ''
);
const currentLabel = computed(() => {
  const found = props.options.find(o => o.value === internalValue.value);
  return found ? found.label : (props.placeholder ?? '');
});

const currentIcon = computed(() => {
  const found = props.options.find(o => o.value === internalValue.value);
  return found?.icon as ('up' | 'down' | undefined);
});


const wrap = ref<HTMLElement | null>(null);
const trigger = ref<HTMLElement | null>(null);
const menu = ref<HTMLElement | null>(null);
const menuStyle = ref<Record<string, string>>({});

function positionMenu() {
  const r = trigger.value?.getBoundingClientRect();
  if (!r) return;
  menuStyle.value = {
    position: 'fixed',
    left: `${r.left}px`,
    top: `${r.bottom + 6}px`,
    width: `${r.width}px`
  };
}
function toggle() { open.value = !open.value; if (open.value) nextTick(positionMenu); }
function close() { open.value = false; }
function onWindowMove() { if (open.value) positionMenu(); }
function onOutside(e: MouseEvent) {
  if (!open.value) return;
  const els = [wrap.value, menu.value];
  if (!els.some(el => el && el.contains(e.target as Node))) close();
}
function select(v: string | number) {
  emit('update:modelValue', v);
  internalValue.value = v;
  close();
}

onMounted(() => {
  window.addEventListener('resize', onWindowMove);
  window.addEventListener('scroll', onWindowMove, true);
  document.addEventListener('click', onOutside, true);
});
onUnmounted(() => {
  window.removeEventListener('resize', onWindowMove);
  window.removeEventListener('scroll', onWindowMove, true);
  document.removeEventListener('click', onOutside, true);
});
</script>

<style scoped>
.ss-wrapper {
  position: relative;
}

.ss-trigger {
  width: 100%;
  height: 2.25rem;
  line-height: 2.5rem;
  border-radius: 9999px;
  border: 1px solid rgb(229 231 235);
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08), 0 1px 2px rgba(0, 0, 0, .06);
  padding: 0 1.5rem;
  padding-right: .75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;

  /* ✅ importantísimo: nada de outlines azules */
  outline: none;
}

.ss-text {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}


.ss-icon {
  margin-left: .5rem;
  margin-right: .25rem;
  color: var(--rv-navy, #11274a);
  font-size: .975rem;
  flex: 0 0 auto;
}

/* Dropdown */
.ss-menu {
  z-index: 100000;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: .5rem;
  overflow: hidden;
}

.ss-group {
  padding: .5rem .75rem;
  font-size: .875rem;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
  background: #f3f4f6;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.ss-list {
  max-height: 240px;
  overflow: auto;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ss-item {
  padding: .5rem .75rem;
  cursor: pointer;
  color: #111827;
}

.ss-item:hover {
  background: #f3f4f6;
}

.ss-item.active {
  background-color: var(--rv-navy, #11274a) !important;
  color: #ffffff !important;
  font-weight: 700;
}


.ss-menu {
  text-align: left;
}

.ss-group {
  text-align: left;
}

.ss-list {
  text-align: left;
}

.ss-item {
  display: block;
  width: 100%;
  text-align: left;
}

.ss-left {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
}

.ss-text {
  flex: 0 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.ss-inline-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: .25rem;
  color: #111827;
}

.ss-inline-icon svg {
  width: 18px;
  height: 18px;
}

.ss-item {
  padding: .5rem .75rem;
  cursor: pointer;
  color: #111827;
}

.ss-item-content {
  display: inline-flex;
  align-items: center;
}

.ss-label {
  white-space: nowrap;
}

html.dark .ss-trigger,
:global(html.dark) .ss-trigger {
  background: #404157 !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
  color: #ffffff !important;
}

html.dark .ss-text,
html.dark .ss-icon,
html.dark .ss-inline-icon,
:global(html.dark) .ss-text,
:global(html.dark) .ss-icon,
:global(html.dark) .ss-inline-icon {
  color: #ffffff !important;
}

html.dark .ss-menu,
:global(html.dark) .ss-menu {
  background: #00021f !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
}

html.dark .ss-group,
:global(html.dark) .ss-group {
  background: #404157 !important;
  color: #ffffff !important;
  border-bottom-color: rgba(255, 255, 255, 0.2) !important;
}

html.dark .ss-item,
:global(html.dark) .ss-item {
  background: #00021f !important;
  color: #ffffff !important;
}

html.dark .ss-item:hover,
:global(html.dark) .ss-item:hover {
  background: #404157 !important;
}

html.dark .ss-item.active,
:global(html.dark) .ss-item.active {
  background: #00021f !important;
  color: #ffffff !important;
}
</style>
