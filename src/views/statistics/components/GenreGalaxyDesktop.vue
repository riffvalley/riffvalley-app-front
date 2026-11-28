<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue";
import type { StatisticsRatedDisc } from "@/modules/statistics/types/statistics";
import { buildGalaxy, type GalaxyStar } from "../utils/galaxyLayout";

// El cielo es siempre de noche (navy), también en modo claro: el espacio es oscuro y así
// los colores de los géneros brillan sin ensuciarse. El resto del modal sí sigue el tema.
const SKY = {
  backgroundCenter: "#0c0a2b",
  backgroundEdge: "#00021f",
  highlight: "#ffffff",
  glowAlpha: 0.4,
  dust: "255 255 255",
  dustAlpha: 0.55,
  // Nebulosas tenues: dan ambiente de color sin tapar las estrellas.
  nebulaAlpha: 0.09,
  label: "rgb(255 255 255 / 88%)",
  labelHalo: "rgb(0 2 31 / 75%)",
  sparkle: "rgb(255 255 255 / 80%)",
};
/** Duración de la animación de entrada (las estrellas se expanden desde el centro). */
const INTRO_MS = 1100;

/** Cuántos nombres de género se escriben en el cielo como máximo (los más grandes). */
const MAX_SKY_LABELS = 8;
/** Nota a partir de la cual un disco brilla con destello de cuatro puntas. */
const SPARKLE_RATE = 9;
/** Tamaño extra de las estrellas respecto al radio base del layout. */
const STAR_SIZE = 1.5;

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
/** Género resaltado desde la leyenda (null = todos). */
const activeGenre = ref<string | null>(null);
/** Géneros visibles en la leyenda plegada (los más grandes); el resto se despliega con un botón. */
const COLLAPSED_LEGEND = 7;
const legendExpanded = ref(false);
const visibleSectors = computed(() => {
  const sectors = galaxy.value.sectors;
  if (legendExpanded.value) return sectors;
  const visible = sectors.slice(0, COLLAPSED_LEGEND);
  // Si el género resaltado está entre los ocultos, se sigue mostrando para poder quitarlo.
  const active = sectors.find((sector) => sector.genre === activeGenre.value);
  if (active && !visible.includes(active)) visible.push(active);
  return visible;
});
const hiddenSectorCount = computed(() => galaxy.value.sectors.length - visibleSectors.value.length);
/** Recuadro con los datos del disco bajo el ratón (solo ratón; en táctil se usa la selección). */
const tooltip = ref<{ disc: StatisticsRatedDisc; x: number; y: number; below: boolean } | null>(null);
const pointerStart: PointerStart = { x: 0, y: 0, panX: 0, panY: 0, moved: false };
let screenStars: ScreenStar[] = [];
let resizeObserver: ResizeObserver | null = null;
/** Progreso de la animación de entrada: 0 = todo en el centro, 1 = galaxia completa. */
let intro = 1;
let introFrame = 0;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);
const rateFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function playIntro(): void {
  cancelAnimationFrame(introFrame);
  if (prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
    intro = 1;
    draw();
    return;
  }
  const start = performance.now();
  intro = 0;
  const step = (now: number) => {
    intro = clamp01((now - start) / INTRO_MS);
    draw();
    if (intro < 1) introFrame = requestAnimationFrame(step);
  };
  introFrame = requestAnimationFrame(step);
}

// Polvo de estrellas decorativo del fondo: fijo (mismo dibujo siempre) y sin interacción.
const backgroundDust = (() => {
  let seed = 4242;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: 260 }, () => ({
    x: rand() * 2 - 1,
    y: rand() * 2 - 1,
    r: 0.3 + rand() * 0.9,
    a: 0.2 + rand() * 0.8,
  }));
})();

// Encaja la galaxia en el lienzo según lo que ocupan de verdad sus estrellas.
const extent = computed(() => {
  const stars = galaxy.value.stars;
  if (!stars.length) return 1;
  return Math.max(0.3, ...stars.map((star) => Math.max(Math.abs(star.x), Math.abs(star.y))));
});

function baseScale(width: number, height: number): number {
  return (Math.min(width, height) / 2 / extent.value) * 0.88 * zoom.value;
}

function worldToScreen(x: number, y: number, width: number, height: number) {
  const scale = baseScale(width, height);
  return { sx: width / 2 + pan.value.x + x * scale, sy: height / 2 + pan.value.y + y * scale };
}

function isDimmed(genre: string): boolean {
  return activeGenre.value !== null && activeGenre.value !== genre;
}

function drawSparkle(context: CanvasRenderingContext2D, sx: number, sy: number, length: number, color: string): void {
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(sx - length, sy);
  context.lineTo(sx + length, sy);
  context.moveTo(sx, sy - length);
  context.lineTo(sx, sy + length);
  context.stroke();
}

function draw(): void {
  const target = canvas.value;
  if (!target) return;
  const context = target.getContext("2d");
  if (!context) return;
  const dpr = window.devicePixelRatio || 1;
  const width = target.width / dpr;
  const height = target.height / dpr;
  const palette = SKY;
  const scale = baseScale(width, height);
  const introEase = easeOut(intro);
  context.save();
  context.scale(dpr, dpr);

  // 1. Cielo.
  const background = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
  background.addColorStop(0, palette.backgroundCenter);
  background.addColorStop(1, palette.backgroundEdge);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  // 2. Polvo de estrellas: se mueve menos que la galaxia al arrastrar, para dar profundidad.
  const dustSpan = Math.max(width, height) * 0.62;
  backgroundDust.forEach((dust) => {
    context.globalAlpha = dust.a * palette.dustAlpha;
    context.fillStyle = `rgb(${palette.dust})`;
    context.beginPath();
    context.arc(width / 2 + pan.value.x * 0.3 + dust.x * dustSpan, height / 2 + pan.value.y * 0.3 + dust.y * dustSpan, dust.r, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;

  // 3. Nebulosas: una nube suave del color de cada género detrás de su grupo de estrellas.
  const largestGroup = Math.max(1, ...galaxy.value.sectors.map((sector) => sector.count));
  galaxy.value.sectors.forEach((sector) => {
    if (isDimmed(sector.genre)) return;
    const { sx, sy } = worldToScreen(sector.labelX, sector.labelY, width, height);
    const radius = (0.12 + 0.2 * Math.sqrt(sector.count / largestGroup)) * scale;
    const nebula = context.createRadialGradient(sx, sy, 0, sx, sy, radius);
    nebula.addColorStop(0, sector.color);
    nebula.addColorStop(1, "transparent");
    context.globalAlpha = (activeGenre.value ? palette.nebulaAlpha * 2 : palette.nebulaAlpha) * introEase;
    context.fillStyle = nebula;
    context.beginPath();
    context.arc(sx, sy, radius, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;

  // 4. Estrellas (discos). Las de otros géneros se apagan si hay uno resaltado.
  screenStars = [];
  const zoomScale = Math.min(Math.max(zoom.value, 0.7), 2.2) * STAR_SIZE;
  galaxy.value.stars.forEach((star) => {
    // Entrada: cada estrella sale del centro hacia su sitio; las más alejadas llegan un poco después.
    const distance = Math.min(1, Math.hypot(star.x, star.y) / extent.value);
    const grow = easeOut(clamp01((intro - distance * 0.35) / 0.65));
    if (grow <= 0) return;
    const { sx, sy } = worldToScreen(star.x * grow, star.y * grow, width, height);
    const dimmed = isDimmed(star.genre);
    const isSelected = props.selectedDiscId === star.disc.id;
    const isHovered = hoveredId.value === star.disc.id;
    const radius = (isSelected || isHovered ? star.radius * 1.55 : star.radius) * zoomScale * (0.4 + 0.6 * grow);

    if (dimmed) {
      context.globalAlpha = 0.12;
      context.fillStyle = star.color;
      context.beginPath();
      context.arc(sx, sy, radius * 0.8, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      return;
    }
    screenStars.push({ star, sx, sy, r: Math.max(radius + 8, 11) });

    const glow = context.createRadialGradient(sx, sy, 0, sx, sy, radius * 2.2);
    glow.addColorStop(0, star.color);
    glow.addColorStop(1, "transparent");
    context.globalAlpha = isSelected || isHovered ? 0.85 : palette.glowAlpha;
    context.fillStyle = glow;
    context.beginPath();
    context.arc(sx, sy, radius * 2.2, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;

    // Los discos con nota muy alta llevan un destello de cuatro puntas.
    if (star.disc.rate >= SPARKLE_RATE) drawSparkle(context, sx, sy, radius * 3.2, palette.sparkle ?? star.color);

    context.fillStyle = isSelected || isHovered ? palette.highlight : star.color;
    context.beginPath();
    context.arc(sx, sy, radius, 0, Math.PI * 2);
    context.fill();
    if (isSelected) {
      context.strokeStyle = palette.highlight;
      context.lineWidth = 2;
      context.stroke();
    }
  });

  // 5. Nombres de los géneros más grandes (o solo el resaltado), sin que se pisen entre sí.
  const labelled = activeGenre.value
    ? galaxy.value.sectors.filter((sector) => sector.genre === activeGenre.value)
    : galaxy.value.sectors.slice(0, MAX_SKY_LABELS);
  const placed: { x: number; y: number }[] = [];
  context.font = "600 12px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  // Los nombres aparecen al final de la animación de entrada.
  context.globalAlpha = clamp01((intro - 0.6) / 0.4);
  labelled.forEach((sector) => {
    const { sx, sy } = worldToScreen(sector.labelX, sector.labelY, width, height);
    if (placed.some((point) => Math.abs(point.x - sx) < 90 && Math.abs(point.y - sy) < 22)) return;
    placed.push({ x: sx, y: sy });
    context.strokeStyle = palette.labelHalo;
    context.lineWidth = 4;
    context.strokeText(sector.genre, sx, sy);
    context.fillStyle = palette.label;
    context.fillText(sector.genre, sx, sy);
  });
  context.globalAlpha = 1;

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
  tooltip.value = null;
  draw();
}

function resetView(): void {
  zoom.value = 1;
  pan.value = { x: 0, y: 0 };
  draw();
}

function toggleGenre(genre: string | null): void {
  activeGenre.value = activeGenre.value === genre ? null : genre;
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
      tooltip.value = null;
      draw();
    }
    return;
  }
  if (event.pointerType !== "mouse") return;
  const hit = nearestStar(event.clientX, event.clientY);
  const nextId = hit?.star.disc.id ?? null;
  if (hoveredId.value !== nextId) {
    hoveredId.value = nextId;
    draw();
  }
  showTooltip(hit);
}

function showTooltip(hit: ScreenStar | null): void {
  const width = container.value?.clientWidth ?? 0;
  if (!hit || !width) {
    tooltip.value = null;
    return;
  }
  // Se mantiene dentro del lienzo: centrado sobre la estrella y debajo si está muy arriba.
  tooltip.value = {
    disc: hit.star.disc,
    x: Math.min(Math.max(hit.sx, 110), width - 110),
    y: hit.sy,
    below: hit.sy < 90,
  };
}

function onPointerLeave(): void {
  if (dragging.value) return;
  tooltip.value = null;
  if (hoveredId.value !== null) {
    hoveredId.value = null;
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

// Botones de zoom: siempre en versión oscura porque están sobre el cielo nocturno.
const controlClass = "grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-rv-darkCard/90 p-0 text-white shadow-sm backdrop-blur-sm transition-colors hover:border-rv-pink hover:bg-rv-pink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink";
const controls = [
  { label: "Acercar galaxia", title: "Acercar", icon: "fa-solid fa-plus", action: () => zoomBy(1.3) },
  { label: "Alejar galaxia", title: "Alejar", icon: "fa-solid fa-minus", action: () => zoomBy(1 / 1.3) },
  { label: "Restablecer vista de la galaxia", title: "Restablecer vista", icon: "fa-solid fa-rotate-left", action: resetView },
];

// Chips de la leyenda: seleccionado en navy (gris claro en oscuro), igual que otros filtros de la app.
const chipBase = "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink";
const chipIdle = "border-gray-200 bg-white text-gray-700 hover:border-rv-pink dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:border-rv-pink";
const chipActive = "border-rv-navy bg-rv-navy text-white dark:border-gray-200 dark:bg-gray-200 dark:text-rv-navy";

// Se vuelve a pintar al cambiar de género resaltado o de datos.
watch([activeGenre, galaxy], () => {
  tooltip.value = null;
  draw();
});

onMounted(() => {
  resize();
  if (container.value) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container.value);
  }
  playIntro();
});

onUnmounted(() => {
  cancelAnimationFrame(introFrame);
  resizeObserver?.disconnect();
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <!-- Leyenda en varias filas: se ven los géneros principales y un botón despliega el resto. -->
    <div
      id="galaxy-legend"
      class="galaxy-legend flex shrink-0 flex-wrap gap-2"
      :class="{ 'max-h-36 overflow-y-auto pr-1': legendExpanded }"
      role="group"
      aria-label="Resaltar un género en la galaxia"
    >
      <button type="button" :class="[chipBase, activeGenre === null ? chipActive : chipIdle]" :aria-pressed="activeGenre === null" @click="activeGenre = null">
        Todos
        <span class="tabular-nums opacity-70">{{ discs.length }}</span>
      </button>
      <button
        v-for="sector in visibleSectors"
        :key="sector.genre"
        type="button"
        :class="[chipBase, activeGenre === sector.genre ? chipActive : chipIdle]"
        :aria-pressed="activeGenre === sector.genre"
        @click="toggleGenre(sector.genre)"
      >
        <span class="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20" :style="{ backgroundColor: sector.color }" aria-hidden="true"></span>
        {{ sector.genre }}
        <span class="tabular-nums opacity-70">{{ sector.count }}</span>
      </button>
      <button
        v-if="hiddenSectorCount > 0 || legendExpanded"
        type="button"
        class="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-gray-300 bg-transparent px-3 py-1 text-xs font-semibold text-rv-navy transition-colors hover:border-rv-pink hover:text-rv-pink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:border-white/25 dark:text-white dark:hover:border-rv-pink dark:hover:text-rv-pink"
        :aria-expanded="legendExpanded"
        aria-controls="galaxy-legend"
        @click="legendExpanded = !legendExpanded"
      >
        <template v-if="legendExpanded">Ver menos <i class="fa-solid fa-chevron-up text-[10px]" aria-hidden="true"></i></template>
        <template v-else>+{{ hiddenSectorCount }} géneros <i class="fa-solid fa-chevron-down text-[10px]" aria-hidden="true"></i></template>
      </button>
    </div>

    <div
      ref="container"
      class="galaxy-stage min-h-0 flex-1 rounded-xl border border-rv-navy/20 bg-rv-navy dark:border-white/10"
      :class="{ 'is-dragging': dragging }"
    >
      <canvas
        ref="canvas"
        class="galaxy-canvas"
        role="img"
        aria-label="Galaxia interactiva. Cada punto representa un disco; el color identifica el género y el tamaño la puntuación. Los discos con nota de 9 o más brillan con un destello. Selecciona una estrella con clic o toque y usa los controles para ajustar la vista."
        @wheel="onWheel"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @lostpointercapture="onPointerCancel"
        @pointerleave="onPointerLeave"
      ></canvas>

      <!-- Recuadro al pasar el ratón: decorativo (aria-hidden); con teclado o lector se usa el selector de discos. -->
      <div
        v-if="tooltip"
        class="galaxy-tooltip pointer-events-none absolute z-[1] w-max max-w-[13.5rem] rounded-lg border border-white/15 bg-rv-darkCard/95 px-3 py-2 text-left text-white shadow-lg backdrop-blur-sm"
        :class="tooltip.below ? 'is-below' : 'is-above'"
        :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
        aria-hidden="true"
        data-test="galaxy-tooltip"
      >
        <p class="m-0 truncate text-sm font-bold">{{ tooltip.disc.name }}</p>
        <p class="m-0 truncate text-xs text-gray-300">{{ tooltip.disc.artist?.name ?? "Artista no disponible" }}</p>
        <p class="m-0 mt-1 flex items-center gap-2 text-xs">
          <span class="font-bold tabular-nums text-amber-300"><i class="fa-solid fa-star" aria-hidden="true"></i> {{ rateFormatter.format(tooltip.disc.rate) }}</span>
          <span class="truncate text-gray-300">{{ tooltip.disc.genre?.name ?? "Sin género" }}</span>
        </p>
      </div>

      <p class="pointer-events-none absolute left-3 top-3 m-0 max-w-[calc(100%-1.5rem)] rounded-full bg-rv-darkCard/85 px-3 py-1 text-xs text-gray-300 shadow-sm backdrop-blur-sm">
        Toca o pulsa una estrella para seleccionarla · Arrastra para mover
      </p>
      <div class="zoom-controls absolute bottom-3 right-3 flex gap-2" role="group" aria-label="Controles de la galaxia">
        <button v-for="control in controls" :key="control.label" type="button" :class="controlClass" :aria-label="control.label" :title="control.title" @click="control.action">
          <i :class="control.icon" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.galaxy-stage { position: relative; width: 100%; overflow: hidden; }
.galaxy-stage.is-dragging .galaxy-canvas { cursor: grabbing; }
.galaxy-canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
/* Desplegada, la leyenda tiene altura máxima y barra fina si hay muchísimos géneros. */
.galaxy-legend { scrollbar-width: thin; }
/* El recuadro flota encima de la estrella (o debajo si la estrella está pegada al borde superior). */
.galaxy-tooltip.is-above { transform: translate(-50%, calc(-100% - 14px)); }
.galaxy-tooltip.is-below { transform: translate(-50%, 14px); }
</style>
