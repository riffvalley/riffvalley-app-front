<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { geoContains, geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import geometryData from "../assets/world-countries-110m.min.json";
import type { RatesGeographyCountryDto } from "@services/rates/rates";
import { colorIndexForCount, createCountBands, normalizeCountryCode } from "../utils/musicalWorldGeo";

interface GeometryProperties { isoCode: string | null; name: string }
type Position = [number, number];
type CountryGeometry =
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };
interface CountryFeature {
  type: "Feature";
  geometry: CountryGeometry;
  properties: GeometryProperties;
}
interface CountryCollection {
  type: "FeatureCollection";
  features: CountryFeature[];
}
interface MapCountry extends RatesGeographyCountryDto { colorIndex: number }
interface LabelPlacement { text: string; x: number; y: number }
interface MapFeature { key: string; geometryCode: string | null; country: MapCountry | null; path: string; label: string | null; labelX: number; labelY: number; name: string }

const props = defineProps<{
  countries: RatesGeographyCountryDto[];
  selectedCode: string | null;
}>();
const emit = defineEmits<{
  select: [country: RatesGeographyCountryDto | null];
  preview: [country: RatesGeographyCountryDto | null];
}>();
const WIDTH = 1000;
const HEIGHT = 560;
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const COUNTRIES_WITHOUT_NUMERIC_LABEL = new Set([
  "AD", "AG", "BB", "BH", "BN", "DM", "GD", "KN", "LC", "LI", "LU", "MC",
  "MT", "MV", "NR", "SG", "SM", "ST", "TO", "TV", "VC", "KM", "FM", "KI",
  "MH", "PW", "SC", "XK", "ME", "MK", "SI", "CY",
]);
const zoom = ref(1);
const offset = ref({ x: 0, y: 0 });
const dragOrigin = ref<{ x: number; y: number; offsetX: number; offsetY: number; hasPointerCapture: boolean } | null>(null);
const mapSurface = ref<HTMLElement | null>(null);
const dragged = ref(false);
const bands = computed(() => createCountBands(props.countries.map(({ count }) => count)));
const countryCodeCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const country of props.countries) {
    const code = normalizeCountryCode(country.isoCode);
    if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
});
const geometryCodeCounts = (() => {
  const counts = new Map<string, number>();
  for (const feature of (geometryData as CountryCollection).features) {
    const code = feature.properties.isoCode ? normalizeCountryCode(feature.properties.isoCode) : null;
    if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
})();
const countriesByCode = computed(() => new Map(props.countries
  .filter((country) => {
    const code = normalizeCountryCode(country.isoCode);
    return code !== null && countryCodeCounts.value.get(code) === 1 && geometryCodeCounts.get(code) === 1;
  })
  .map((country) => [normalizeCountryCode(country.isoCode), country])));
const collection = geometryData as CountryCollection;
const projection = geoNaturalEarth1().fitSize([WIDTH - 16, HEIGHT - 16], collection);
const pathGenerator = geoPath(projection);
const features = computed<MapFeature[]>(() => {
  const prepared = collection.features.map((feature, index) => {
    const isoCode = feature.properties.isoCode ? normalizeCountryCode(feature.properties.isoCode) : null;
    const rawCountry = isoCode ? countriesByCode.value.get(isoCode) ?? null : null;
    const country = rawCountry ? { ...rawCountry, colorIndex: colorIndexForCount(rawCountry.count, bands.value) } : null;
    const centroid = geoCentroid(feature);
    const position = projection(centroid) ?? [0, 0];
    const labelPlacement = country ? findLabelPlacement(feature, country) : null;
    return {
      key: `${feature.properties.isoCode ?? "unmapped"}-${index}`,
      geometryCode: isoCode,
      country,
      path: pathGenerator(feature) ?? "",
      label: labelPlacement?.text ?? null,
      labelX: labelPlacement?.x ?? position[0],
      labelY: labelPlacement?.y ?? position[1],
      name: feature.properties.name,
    };
  });
  return prepared;
});
const labelledFeatures = computed(() => features.value.filter(({ label }) => label !== null));
const legend = computed(() => bands.value);

function findLabelPlacement(
  feature: CountryFeature,
  country: RatesGeographyCountryDto,
): LabelPlacement | null {
  if (country.count <= 0 || COUNTRIES_WITHOUT_NUMERIC_LABEL.has(country.isoCode.toUpperCase())) return null;
  const labelGeometry = getLargestPolygon(feature.geometry);
  const centroid = geoCentroid(labelGeometry);
  const centroidPoint = projection(centroid);
  const text = new Intl.NumberFormat("es-ES").format(country.count);
  if (geoContains(labelGeometry, centroid) && centroidPoint) {
    return { text, x: centroidPoint[0], y: centroidPoint[1] };
  }

  const pathCenter = pathGenerator.centroid(labelGeometry);
  const pathCenterGeographic = projection.invert(pathCenter);
  if (pathCenterGeographic && geoContains(labelGeometry, pathCenterGeographic)) {
    return { text, x: pathCenter[0], y: pathCenter[1] };
  }

  const [[minX, minY], [maxX, maxY]] = pathGenerator.bounds(labelGeometry);
  const preferred = centroidPoint ?? pathCenter;
  let nearestPoint: [number, number] | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let y = minY + 2; y < maxY; y += 6) {
    for (let x = minX + 2; x < maxX; x += 6) {
      const point: [number, number] = [x, y];
      const geographic = projection.invert(point);
      if (!geographic || !geoContains(labelGeometry, geographic)) continue;
      const distance = Math.hypot(x - preferred[0], y - preferred[1]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = point;
      }
    }
  }
  const labelPoint = nearestPoint ?? centroidPoint ?? pathCenter;
  return { text, x: labelPoint[0], y: labelPoint[1] };
}

function getLargestPolygon(geometry: CountryGeometry): Extract<CountryGeometry, { type: "Polygon" }> {
  if (geometry.type === "Polygon") return geometry;

  const largestCoordinates = geometry.coordinates.reduce((largest, candidate) => {
    const largestArea = pathGenerator.area({ type: "Polygon", coordinates: largest });
    const candidateArea = pathGenerator.area({ type: "Polygon", coordinates: candidate });
    return candidateArea > largestArea ? candidate : largest;
  });

  return { type: "Polygon", coordinates: largestCoordinates };
}

function fillClass(country: MapCountry | null, featureCode: string | null): string {
  if (!country) return featureCode ? "fill-gray-200 dark:fill-slate-700" : "fill-gray-300 dark:fill-slate-600";
  const classes = [
    "fill-pink-100 dark:fill-pink-950",
    "fill-pink-300 dark:fill-pink-800",
    "fill-pink-500 dark:fill-pink-600",
    "fill-pink-700 dark:fill-pink-400",
    "fill-pink-900 dark:fill-pink-200",
  ];
  return classes[country.colorIndex] ?? classes[0];
}

function onCountryClick(country: MapCountry | null) {
  if (!country || dragged.value) return;
  emit("select", country);
}
function onCountryKeydown(event: KeyboardEvent, country: MapCountry | null) {
  if (!country) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onCountryClick(country);
  }
}
function setZoom(value: number) {
  zoom.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
  if (zoom.value === 1) offset.value = { x: 0, y: 0 };
}
function resetView() { setZoom(1); }
function startPan(event: PointerEvent) {
  dragged.value = false;
  if (event.button !== 0 || zoom.value <= 1) return;
  dragOrigin.value = { x: event.clientX, y: event.clientY, offsetX: offset.value.x, offsetY: offset.value.y, hasPointerCapture: false };
  dragged.value = false;
}
function movePan(event: PointerEvent) {
  if (!dragOrigin.value) return;
  const scale = WIDTH / (event.currentTarget as SVGSVGElement).getBoundingClientRect().width;
  const dx = (event.clientX - dragOrigin.value.x) * scale;
  const dy = (event.clientY - dragOrigin.value.y) * scale;
  dragged.value = Math.abs(dx) + Math.abs(dy) > 4;
  if (dragged.value && !dragOrigin.value.hasPointerCapture) {
    const surface = event.currentTarget as HTMLElement;
    surface.setPointerCapture(event.pointerId);
    dragOrigin.value.hasPointerCapture = true;
  }
  const limitX = (WIDTH * (zoom.value - 1)) / 2;
  const limitY = (HEIGHT * (zoom.value - 1)) / 2;
  offset.value = {
    x: Math.max(-limitX, Math.min(limitX, dragOrigin.value.offsetX + dx)),
    y: Math.max(-limitY, Math.min(limitY, dragOrigin.value.offsetY + dy)),
  };
}
function endPan() { dragOrigin.value = null; }
function onMapKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    const step = 32;
    const maxX = (WIDTH * (zoom.value - 1)) / 2;
    const maxY = (HEIGHT * (zoom.value - 1)) / 2;
    const delta = { x: event.key === "ArrowLeft" ? step : event.key === "ArrowRight" ? -step : 0, y: event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0 };
    offset.value = { x: Math.max(-maxX, Math.min(maxX, offset.value.x + delta.x)), y: Math.max(-maxY, Math.min(maxY, offset.value.y + delta.y)) };
  }
}
function addPanListeners() {
  mapSurface.value?.addEventListener("keydown", onMapKeydown);
  mapSurface.value?.addEventListener("pointerdown", startPan);
  mapSurface.value?.addEventListener("pointermove", movePan);
  mapSurface.value?.addEventListener("pointerup", endPan);
  mapSurface.value?.addEventListener("pointercancel", endPan);
}
function removePanListeners() {
  mapSurface.value?.removeEventListener("keydown", onMapKeydown);
  mapSurface.value?.removeEventListener("pointerdown", startPan);
  mapSurface.value?.removeEventListener("pointermove", movePan);
  mapSurface.value?.removeEventListener("pointerup", endPan);
  mapSurface.value?.removeEventListener("pointercancel", endPan);
}
onMounted(addPanListeners);
onUnmounted(removePanListeners);

</script>

<template>
  <div class="flex min-w-0 flex-col gap-3" data-test="musical-world-map">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-gray-500 dark:text-gray-400">Selecciona un país para consultar tus discos valorados.</p>
      <div class="flex items-center gap-1" role="group" aria-label="Controles del mapa">
        <button type="button" class="map-control" aria-label="Acercar mapa" :disabled="zoom >= ZOOM_MAX" @click="setZoom(zoom + 1)">+</button>
        <button type="button" class="map-control" aria-label="Alejar mapa" :disabled="zoom <= ZOOM_MIN" @click="setZoom(zoom - 1)">−</button>
        <button type="button" class="map-control px-2 text-xs" aria-label="Restablecer mapa" @click="resetView">Restablecer</button>
      </div>
    </div>
    <div ref="mapSurface" class="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-slate-950/40" role="application" aria-label="Mapa mundial interactivo" tabindex="0">
      <svg
        class="world-svg block h-auto w-full touch-pan-y"
        viewBox="0 0 1000 560"
        role="group"
        aria-label="Mapa interactivo de países por discos valorados"
      >
        <g :transform="`translate(${offset.x} ${offset.y}) translate(500 280) scale(${zoom}) translate(-500 -280)`" class="map-features">
          <g class="country-shapes">
            <g
              v-for="feature in features"
              :key="feature.key"
              class="country-feature"
              :class="[
                fillClass(feature.country, feature.geometryCode),
                feature.country && selectedCode === feature.country.isoCode ? 'is-selected' : '',
              ]"
              :tabindex="feature.country ? 0 : -1"
              role="button"
              :aria-disabled="!feature.country"
              :aria-label="feature.country ? `${feature.country.name}: ${feature.country.count} discos, ${feature.country.percentage}%` : feature.name"
              :aria-pressed="feature.country ? selectedCode === feature.country.isoCode : undefined"
              @mouseenter="emit('preview', feature.country)"
              @mouseleave="emit('preview', null)"
              @focus="emit('preview', feature.country)"
              @blur="emit('preview', null)"
              @click="onCountryClick(feature.country)"
              @keydown="onCountryKeydown($event, feature.country)"
            >
              <path :d="feature.path">
                <title>{{ feature.country ? `${feature.country.name}: ${feature.country.count} discos (${feature.country.percentage}%)` : feature.name }}</title>
              </path>
            </g>
          </g>
          <g class="country-labels" aria-hidden="true" pointer-events="none">
            <text
              v-for="feature in labelledFeatures"
              :key="feature.key"
              :x="feature.labelX"
              :y="feature.labelY"
              :data-country-label="feature.geometryCode"
              pointer-events="none"
              class="country-value text-[6px] select-none"
            >{{ feature.label }}</text>
          </g>
        </g>
      </svg>
    </div>
    <div v-if="legend.length" class="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Leyenda de cantidad de discos">
      <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Discos:</span>
      <span v-for="band in legend" :key="`${band.min}-${band.max}`" class="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
        <span class="h-3 w-3 rounded-sm" :class="`legend-${band.colorIndex}`" aria-hidden="true"></span>
        {{ band.min === band.max ? band.min : `${band.min}–${band.max}` }}
      </span>
      <span class="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300"><span class="h-3 w-3 rounded-sm bg-gray-300 dark:bg-slate-600"></span>0</span>
    </div>
  </div>
</template>

<style scoped>
.world-svg { cursor: grab; }
.world-svg:active { cursor: grabbing; }
.country-feature path { stroke: rgb(255 255 255 / 78%); stroke-width: 0.8; vector-effect: non-scaling-stroke; transition: filter 120ms ease, stroke 120ms ease; }
.country-feature[role="button"] { cursor: pointer; outline: none; }
.country-feature[aria-disabled="true"] { pointer-events: none; cursor: default; }
.country-feature[role="button"]:hover path,
.country-feature[role="button"]:focus-visible path { filter: brightness(1.1); stroke-width: 2; @apply stroke-rv-pink; }
.country-feature.is-selected path { stroke-width: 2.5; @apply stroke-rv-pink; filter: brightness(1.1); }
.country-labels { pointer-events: none; user-select: none; -webkit-user-select: none; }
.country-value { fill: #111827; font: 600 6px/1 sans-serif; text-anchor: middle; pointer-events: none; user-select: none; -webkit-user-select: none; paint-order: stroke; stroke: rgb(255 255 255 / 88%); stroke-width: 1.5px; stroke-linejoin: round; }
.country-value { fill: #fff; stroke: rgb(15 23 42 / 90%); }
.map-control { @apply inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-gray-300 bg-white px-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700; }
.legend-0 { @apply bg-pink-100 dark:bg-pink-950; }
.legend-1 { @apply bg-pink-300 dark:bg-pink-800; }
.legend-2 { @apply bg-pink-500 dark:bg-pink-600; }
.legend-3 { @apply bg-pink-700 dark:bg-pink-400; }
.legend-4 { @apply bg-pink-900 dark:bg-pink-200; }
</style>
