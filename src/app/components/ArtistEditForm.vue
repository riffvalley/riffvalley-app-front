<script setup lang="ts">
defineProps<{
  name: string;
  countryId: string;
  image: string;
  description: string;
  saving: boolean;
  fetchingImage: boolean;
  imageOptions: Array<{ image: string; name: string }>;
}>();

const emit = defineEmits<{
  "update:name": [value: string];
  "update:countryId": [value: string];
  "update:image": [value: string];
  "update:description": [value: string];
  save: [];
  cancel: [];
  "fetch-image": [];
  "pick-image": [image: string];
}>();
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" @click.self="emit('cancel')">
      <div class="bg-white dark:bg-rv-darkBg rounded-2xl shadow-xl text-rv-navy dark:text-white w-[94vw] max-w-md max-h-[92vh] overflow-y-auto">
        <div class="relative w-full h-36 bg-gray-100 dark:bg-white/10 flex items-center justify-center">
          <img v-if="image" :src="image" class="w-full h-full object-cover" />
          <i v-else class="fa-solid fa-user text-4xl text-gray-300"></i>
          <button @click="emit('fetch-image')" :disabled="fetchingImage" class="absolute bottom-2 right-2 flex items-center gap-1.5 text-xs font-semibold bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-full shadow transition-all">
            <i class="fa-brands fa-spotify"></i>{{ fetchingImage ? "Buscando..." : "Spotify" }}
          </button>
          <div v-if="imageOptions.length" class="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 p-3 rounded-t-2xl">
            <button v-for="option in imageOptions" :key="option.image" @click="emit('pick-image', option.image)" class="flex flex-col items-center gap-1 group">
              <img :src="option.image" class="w-16 h-16 rounded-lg object-cover ring-2 ring-transparent group-hover:ring-green-400 transition-all" />
              <span class="text-white text-[10px] truncate max-w-[64px]">{{ option.name }}</span>
            </button>
          </div>
        </div>
        <div class="p-5 flex flex-col gap-3">
          <h2 class="text-base font-bold text-gray-800">Editar artista</h2>
          <div class="grid grid-cols-2 gap-2">
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nombre
              <input :value="name" @input="emit('update:name', ($event.target as HTMLInputElement).value)" type="text" class="border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm w-full bg-white dark:bg-rv-darkCard text-rv-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-rv-pink" />
            </label>
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">País
              <slot name="country-select" :value="countryId" :update="(value: string) => emit('update:countryId', value)" />
            </label>
          </div>
          <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Imagen (URL)
            <input :value="image" @input="emit('update:image', ($event.target as HTMLInputElement).value)" type="text" placeholder="https://..." class="border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm w-full bg-white dark:bg-rv-darkCard text-rv-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-rv-pink" />
          </label>
          <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Descripción
            <textarea :value="description" @input="emit('update:description', ($event.target as HTMLTextAreaElement).value)" rows="2" placeholder="Descripción del artista..." class="border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none" />
          </label>
        </div>
        <div class="flex justify-end gap-2 mt-5 p-5 pt-0">
          <button @click="emit('cancel')" class="px-4 py-2 text-sm rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-gray-700 dark:text-gray-200 transition-all">Cancelar</button>
          <button @click="emit('save')" :disabled="saving" class="px-4 py-2 text-sm rounded-full bg-rv-pink hover:opacity-90 text-white font-semibold transition-all disabled:opacity-50">{{ saving ? "Guardando..." : "Guardar" }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
