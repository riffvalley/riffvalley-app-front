<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <div class="bg-rv-navy border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 class="text-white font-bold text-lg">
              <i :class="isMobile ? 'fa-solid fa-shuffle text-rv-pink' : 'fa-solid fa-star text-amber-400'" class="mr-2"></i>
              {{ isMobile ? 'Tus discos por género' : 'Galaxia musical' }}
            </h2>
            <p class="text-white/50 text-xs mt-0.5">
              {{ isMobile ? 'Cada burbuja es un género, tócala para ver sus discos' : 'Cada estrella es un disco que has votado, coloreada por su género' }}
            </p>
          </div>
          <button @click="$emit('close')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors flex-shrink-0">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="flex-1 min-h-0 relative">
          <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60 text-sm">
            <i class="fa-solid fa-circle-notch fa-spin text-2xl"></i>
            Cargando galaxia...
          </div>
          <div v-else-if="error" class="absolute inset-0 flex items-center justify-center text-rv-pink text-sm px-6 text-center">
            {{ error }}
          </div>
          <div v-else-if="!discs.length" class="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
            No hay discos votados en este periodo.
          </div>
          <template v-else>
            <GenreGalaxyMobileBubbles v-if="isMobile" :discs="discs" />
            <GenreGalaxyDesktop v-else :discs="discs" />
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from "vue";
import { getUserRatedDiscs, type RatedDiscItem } from "@services/rates/rates";
import { useIsMobileViewport } from "@/composables/useIsMobileViewport";
import GenreGalaxyDesktop from "./GenreGalaxyDesktop.vue";
import GenreGalaxyMobileBubbles from "./GenreGalaxyMobileBubbles.vue";

export default defineComponent({
  name: "GenreGalaxyModal",
  components: { GenreGalaxyDesktop, GenreGalaxyMobileBubbles },
  props: {
    year: {
      type: Number,
      default: null,
    },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const discs = ref<RatedDiscItem[]>([]);
    const loading = ref(true);
    const error = ref("");
    const isMobile = useIsMobileViewport();

    onMounted(async () => {
      try {
        discs.value = await getUserRatedDiscs(props.year ?? undefined);
      } catch {
        error.value = "No se pudo cargar la galaxia de discos.";
      } finally {
        loading.value = false;
      }
    });

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") emit("close");
    };
    onMounted(() => window.addEventListener("keydown", onKeydown));
    onUnmounted(() => window.removeEventListener("keydown", onKeydown));

    return { discs, loading, error, isMobile };
  },
});
</script>
