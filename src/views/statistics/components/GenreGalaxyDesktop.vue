<template>
  <div class="relative w-full h-full select-none" ref="containerRef">
    <canvas
      ref="canvasRef"
      class="w-full h-full block"
      :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
      @wheel.prevent="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
    ></canvas>

    <DiscHoverTooltip v-if="hovered" :disc="hovered.star.disc" :x="hovered.x" :y="hovered.y" />

    <!-- Controles de zoom -->
    <div class="absolute bottom-3 right-3 flex flex-col gap-1.5">
      <button @click="zoomBy(1.3)" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors">
        <i class="fa-solid fa-plus text-xs"></i>
      </button>
      <button @click="zoomBy(1 / 1.3)" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors">
        <i class="fa-solid fa-minus text-xs"></i>
      </button>
      <button @click="resetView" title="Restablecer vista" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors">
        <i class="fa-solid fa-arrows-to-dot text-xs"></i>
      </button>
    </div>

    <p class="absolute top-3 left-3 text-[11px] text-white/50">
      Arrastra para mover · rueda para acercar
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, type PropType } from "vue";
import type { RatedDiscItem } from "@services/rates/rates";
import { buildGalaxy, type GalaxyStar } from "../utils/galaxyLayout";
import DiscHoverTooltip from "./DiscHoverTooltip.vue";

interface ScreenStar {
  star: GalaxyStar;
  sx: number;
  sy: number;
  r: number;
}

export default defineComponent({
  name: "GenreGalaxyDesktop",
  components: { DiscHoverTooltip },
  props: {
    discs: {
      type: Array as PropType<RatedDiscItem[]>,
      required: true,
    },
  },
  setup(props) {
    const containerRef = ref<HTMLDivElement | null>(null);
    const canvasRef = ref<HTMLCanvasElement | null>(null);

    const galaxy = buildGalaxy(props.discs);

    const zoom = ref(1);
    const pan = ref({ x: 0, y: 0 });
    const dragging = ref(false);
    const dragStart = { x: 0, y: 0, panX: 0, panY: 0 };

    const hovered = ref<{ star: GalaxyStar; x: number; y: number } | null>(null);
    let screenStars: ScreenStar[] = [];

    function resize() {
      const canvas = canvasRef.value;
      const container = containerRef.value;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      draw();
    }

    function worldToScreen(x: number, y: number, w: number, h: number) {
      const scale = Math.min(w, h) * 0.46 * zoom.value;
      return {
        sx: w / 2 + pan.value.x + x * scale,
        sy: h / 2 + pan.value.y + y * scale,
        scale,
      };
    }

    function draw() {
      const canvas = canvasRef.value;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.save();
      ctx.scale(dpr, dpr);

      // Fondo
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      bg.addColorStop(0, "#0a0821");
      bg.addColorStop(1, "#00021f");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Estrellas
      screenStars = [];
      galaxy.stars.forEach((star) => {
        const { sx, sy } = worldToScreen(star.x, star.y, w, h);
        const isHovered = hovered.value?.star === star;
        const r = (isHovered ? star.radius * 1.6 : star.radius) * Math.min(Math.max(zoom.value, 0.7), 2.2);
        screenStars.push({ star, sx, sy, r: Math.max(r, 3) });

        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 1.8);
        glow.addColorStop(0, star.color);
        glow.addColorStop(1, "transparent");
        ctx.globalAlpha = isHovered ? 0.8 : 0.35;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = isHovered ? "#ffffff" : star.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();

        if (isHovered) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      ctx.restore();
    }

    function zoomBy(factor: number) {
      zoom.value = Math.min(Math.max(zoom.value * factor, 0.6), 6);
      draw();
    }

    function resetView() {
      zoom.value = 1;
      pan.value = { x: 0, y: 0 };
      draw();
    }

    function onWheel(e: WheelEvent) {
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoomBy(factor);
    }

    function onMouseDown(e: MouseEvent) {
      dragging.value = true;
      dragStart.x = e.clientX;
      dragStart.y = e.clientY;
      dragStart.panX = pan.value.x;
      dragStart.panY = pan.value.y;
    }

    function onMouseMove(e: MouseEvent) {
      if (dragging.value) {
        pan.value = {
          x: dragStart.panX + (e.clientX - dragStart.x),
          y: dragStart.panY + (e.clientY - dragStart.y),
        };
        hovered.value = null;
        draw();
        return;
      }

      const canvas = canvasRef.value;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let closest: ScreenStar | null = null;
      let closestDist = Infinity;
      for (const s of screenStars) {
        const dist = Math.hypot(s.sx - mx, s.sy - my);
        const hitRadius = Math.max(s.r + 4, 8);
        if (dist <= hitRadius && dist < closestDist) {
          closest = s;
          closestDist = dist;
        }
      }

      const next = closest ? { star: closest.star, x: closest.sx, y: closest.sy - closest.r } : null;
      const changed = next?.star !== hovered.value?.star;
      hovered.value = next;
      if (changed) draw();
    }

    function onMouseLeave() {
      if (dragging.value) {
        dragging.value = false;
      }
      if (hovered.value) {
        hovered.value = null;
        draw();
      }
    }

    function onMouseUpGlobal() {
      dragging.value = false;
    }

    let resizeObserver: ResizeObserver | null = null;
    onMounted(() => {
      resize();
      window.addEventListener("mouseup", onMouseUpGlobal);
      resizeObserver = new ResizeObserver(resize);
      if (containerRef.value) resizeObserver.observe(containerRef.value);
    });
    onUnmounted(() => {
      window.removeEventListener("mouseup", onMouseUpGlobal);
      resizeObserver?.disconnect();
    });

    return {
      containerRef, canvasRef, dragging, hovered,
      onWheel, onMouseDown, onMouseMove, onMouseLeave,
      zoomBy, resetView,
    };
  },
});
</script>
