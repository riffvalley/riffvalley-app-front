<script setup lang="ts">
withDefaults(defineProps<{
  code?: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  embedded?: boolean;
}>(), {
  embedded: false,
});
</script>

<template>
  <div
    class="status-page text-rv-navy dark:text-white"
    :class="embedded
      ? 'w-full'
      : 'flex min-h-screen items-center justify-center bg-gray-100 px-4 py-7 dark:bg-rv-darkBg sm:px-8 sm:py-10'"
  >
    <section class="w-full max-w-5xl" aria-labelledby="status-title">
      <div
        class="status-art mx-auto flex aspect-[3/2] max-h-[56svh] w-full max-w-[52rem] items-center justify-center overflow-hidden rounded-[1.75rem] bg-transparent"
      >
        <img
          class="h-full w-full object-contain"
          :src="imageSrc"
          :alt="imageAlt"
          fetchpriority="high"
        />
      </div>

      <div class="mx-auto mt-6 max-w-2xl text-center sm:mt-8">
        <p v-if="code" class="mb-2 text-sm font-bold tracking-[0.18em] text-rv-blueDark dark:text-rv-pink">{{ code }}</p>
        <h1 id="status-title" class="text-3xl font-bold leading-tight text-rv-navy dark:text-white sm:text-4xl">
          {{ title }}
        </h1>
        <p class="mx-auto mt-3 max-w-prose text-base leading-relaxed text-gray-700 dark:text-gray-200 sm:text-lg">
          {{ description }}
        </p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-7">
          <slot name="actions" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.status-art {
  box-shadow: none;
}

.status-page :deep(.status-action) {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  padding: 0.7rem 1.15rem;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.25;
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
}

.status-page :deep(.status-action:focus-visible) {
  outline: 3px solid #b0669f;
  outline-offset: 3px;
}

.status-page :deep(.status-action-primary) {
  background: #e46e8a;
  color: #00021f;
}

.status-page :deep(.status-action-primary:hover) {
  background: #d95b79;
}

.status-page :deep(.status-action-secondary) {
  border: 1px solid rgb(0 2 31 / 24%);
  background: transparent;
  color: #00021f;
}

.status-page :deep(.status-action-secondary:hover) {
  background: rgb(0 2 31 / 7%);
}

.dark .status-page :deep(.status-action-secondary) {
  border-color: rgb(255 255 255 / 28%);
  color: white;
}

.dark .status-page :deep(.status-action-secondary:hover) {
  background: rgb(255 255 255 / 10%);
}

@media (prefers-reduced-motion: reduce) {
  .status-page :deep(.status-action) {
    transition: none;
  }
}
</style>
