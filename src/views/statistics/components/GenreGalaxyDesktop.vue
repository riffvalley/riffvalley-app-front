<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";
import type { StatisticsRatedDisc } from "@/modules/statistics/types/statistics";
import { buildGalaxy, type GalaxyStar } from "../utils/galaxyLayout";

defineOptions({ name: "GenreGalaxyDesktop" });

const props = defineProps<{
  discs: StatisticsRatedDisc[];
  selectedDiscId: string | null;
}>();
const emit = defineEmits<{ select: [id: string] }>();

interface ScreenStar {
  star: GalaxyStar;
  sx: number;
  sy: number;
  r: number;
}
interface PointerStart { x: number; y: number; panX: number; panY: number; moved: boolean }

const container = useTemplateRef<HTMLDivElement>("container");
const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const galaxy = computed(() => buildGalaxy(props.discs));
const zoom = ref(1);
const pan = ref({ x: 0, y: 0 });
const dragging = ref(false);
const hoveredId = ref<string | null>(null);
const pointerStart: PointerStart = { x: 0, y: 0, panX: 0, panY: 0, moved: false };
let screenStars: ScreenStar[] = [];
let resizeObserver: ResizeObserver | null = null;

function worldToScreen(x: number, y: number, width: number, height: number) {
  const scale = Math.min(width, height) * 0.46 * zoom.value;
  return { sx: width / 2 + pan.value.x + x * scale, sy: height / 2 + pan.value.y + y * scale };
}

function draw(): void {
  const target = canvas.value;
  if (!target) return;
  const context = target.getContext("2d");
  if (!context) return;
  const dpr = window.devicePixelRatio || 1;
  const width = target.width / dpr;
  const height = target.height / dpr;
  context.save();
  context.scale(dpr, dpr);
  const background = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
  background.addColorStop(0, "#0a0821");
  background.addColorStop(1, "#00021f");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  screenStars = [];
  galaxy.value.stars.forEach((star) => {
    const { sx, sy } = worldToScreen(star.x, star.y, width, height);
    const isSelected = props.selectedDiscId === star.disc.id;
    const isHovered = hoveredId.value === star.disc.id;
    const scale = Math.min(Math.max(zoom.value, 0.7), 2.2);
    const radius = (isSelected || isHovered ? star.radius * 1.55 : star.radius) * scale;
    const hitRadius = Math.max(radius + 8, 11);
    screenStars.push({ star, sx, sy, r: hitRadius });

    const glow = context.createRadialGradient(sx, sy, 0, sx, sy, radius * 1.8);
    glow.addColorStop(0, star.color);
    glow.addColorStop(1, "transparent");
    context.globalAlpha = isSelected || isHovered ? 0.85 : 0.35;
    context.fillStyle = glow;
    context.beginPath();
    context.arc(sx, sy, radius * 1.8, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = isSelected || isHovered ? "#ffffff" : star.color;
    context.beginPath();
    context.arc(sx, sy, radius, 0, Math.PI * 2);
    context.fill();
    if (isSelected) {
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2;
      context.stroke();
    }
  });
  context.restore();
}

function resize(): void {
  const target = canvas.value;
  const frame = container.value;
  if (!target || !frame) return;
  const dpr = window.devicePixelRatio || 1;
  target.width = Math.round(frame.clientWidth * dpr);
  target.height = Math.round(frame.clientHeight * dpr);
  draw();
}

function zoomBy(factor: number): void {
  zoom.value = Math.min(Math.max(zoom.value * factor, 0.6), 6);
  draw();
}

function resetView(): void {
  zoom.value = 1;
  pan.value = { x: 0, y: 0 };
  draw();
}

function nearestStar(clientX: number, clientY: number): ScreenStar | null {
  const rect = canvas.value?.getBoundingClientRect();
  if (!rect) return null;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  let nearest: ScreenStar | null = null;
  let minimum = Infinity;
  for (const candidate of screenStars) {
    const distance = Math.hypot(candidate.sx - x, candidate.sy - y);
    if (distance <= candidate.r && distance < minimum) {
      nearest = candidate;
      minimum = distance;
    }
  }
  return nearest;
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  pointerStart.x = event.clientX;
  pointerStart.y = event.clientY;
  pointerStart.panX = pan.value.x;
  pointerStart.panY = pan.value.y;
  pointerStart.moved = false;
  dragging.value = true;
  (event.currentTarget as HTMLCanvasElement).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  if (dragging.value && event.buttons !== 0) {
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (Math.hypot(dx, dy) > 5) pointerStart.moved = true;
    if (pointerStart.moved) {
      pan.value = { x: pointerStart.panX + dx, y: pointerStart.panY + dy };
      hoveredId.value = null;
      draw();
    }
    return;
  }
  if (event.pointerType !== "mouse") return;
  const nextId = nearestStar(event.clientX, event.clientY)?.star.disc.id ?? null;
  if (hoveredId.value !== nextId) {
    hoveredId.value = nextId;
    draw();
  }
}

function onPointerUp(event: PointerEvent): void {
  if (!dragging.value) return;
  dragging.value = false;
  if (!pointerStart.moved) {
    const hit = nearestStar(event.clientX, event.clientY);
    if (hit) emit("select", hit.star.disc.id);
  }
}

function onPointerCancel(): void {
  dragging.value = false;
  pointerStart.moved = true;
}

function onWheel(event: WheelEvent): void {
  event.preventDefault();
  zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15);
}

onMounted(() => {
  resize();
  if (container.value) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container.value);
  }
});

onUnmounted(() => resizeObserver?.disconnect());
</script>

<template>
  <div ref="container" class="galaxy-stage" :class="{ 'is-dragging': dragging }">
    <canvas
      ref="canvas"
      class="galaxy-canvas"
      role="img"
      aria-label="Galaxia interactiva. Cada punto representa un disco; el color identifica el género y el tamaño la puntuación. Selecciona una estrella con clic o toque y usa los controles para ajustar la vista."
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @lostpointercapture="onPointerCancel"
    ></canvas>

    <p class="interaction-hint">Toca o pulsa una estrella para seleccionarla · Arrastra para mover</p>
    <div class="zoom-controls" aria-label="Controles de la galaxia">
      <button type="button" aria-label="Acercar galaxia" @click="zoomBy(1.3)"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
      <button type="button" aria-label="Alejar galaxia" @click="zoomBy(1 / 1.3)"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>
      <button type="button" aria-label="Restablecer vista de la galaxia" @click="resetView"><i class="fa-solid fa-arrows-to-dot" aria-hidden="true"></i></button>
    </div>
  </div>
</template>

<style scoped>
.galaxy-stage { position: relative; width: 100%; height: 100%; overflow: hidden; background: #00021f; }
.galaxy-stage.is-dragging .galaxy-canvas { cursor: grabbing; }
.galaxy-canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
.interaction-hint { position: absolute; top: .65rem; left: .75rem; max-width: calc(100% - 6rem); margin: 0; color: rgb(255 255 255 / 67%); font-size: .7rem; pointer-events: none; }
.zoom-controls { position: absolute; right: .65rem; bottom: .65rem; display: flex; gap: .4rem; }
.zoom-controls button { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border: 1px solid rgb(255 255 255 / 25%); border-radius: .7rem; background: rgb(10 15 34 / 88%); color: white; }
.zoom-controls button:hover { background: rgb(255 255 255 / 18%); }
.zoom-controls button:focus-visible { outline: 3px solid #ee91af; outline-offset: 2px; }
</style>
