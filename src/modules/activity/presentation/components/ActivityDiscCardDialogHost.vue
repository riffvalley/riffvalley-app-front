<script setup lang="ts">
import { computed, provide, shallowRef } from "vue";
import { discCardDialogKey } from "@/composables/discCardDialog";
import ActivityDiscCardDialog from "./ActivityDiscCardDialog.vue";

// Provee a toda la app la ficha votable del disco que usa Actividad en «Ver disco».
const request = shallowRef<{ discId: string; onClose?: (changed: boolean) => void } | null>(null);
let changed = false;

provide(discCardDialogKey, {
  isOpen: computed(() => request.value !== null),
  open(discId, options) {
    changed = false;
    request.value = { discId, onClose: options?.onClose };
  },
});

function close(): void {
  const current = request.value;
  request.value = null;
  current?.onClose?.(changed);
  changed = false;
}
</script>

<template>
  <slot />
  <!-- Se teletransporta al abrirse para quedar por encima del modal que la pidió (z-[100]). -->
  <Teleport v-if="request" to="body">
    <div class="relative z-[100]">
      <ActivityDiscCardDialog :key="request.discId" :disc-id="request.discId" @updated="changed = true" @close="close" />
    </div>
  </Teleport>
</template>
