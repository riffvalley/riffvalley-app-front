<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import type { Component } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import {
  getRatesGeographyWorld,
  type RatesGeographyCountryDto,
  type RatesGeographyWorldResponseDto,
} from "@services/rates/rates";
import { matchCountriesToGeometry } from "../utils/musicalWorldGeo";

const emit = defineEmits<{ close: [] }>();
const authStore = useAuthStore();
const dialog = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
const response = shallowRef<RatesGeographyWorldResponseDto | null>(null);
const isLoading = ref(true);
const hasHttpError = ref(false);
const hasGeometryError = ref(false);
const selectedCode = ref<string | null>(null);
const hoveredCountry = shallowRef<RatesGeographyCountryDto | null>(null);
const mapComponent = shallowRef<Component | null>(null);
let controller: AbortController | null = null;
let liveRequest = 0;
let priorOverflow = "";
let closing = false;

const matchResult = computed(() => response.value
  ? matchCountriesToGeometry(response.value.countries, geometryCodes.value)
  : { represented: [], unrepresented: [], ambiguousCodes: [] });
const geometryCodes = ref<Array<string | null>>([]);
const rankedCountries = computed(() => response.value?.countries.slice(0, 10) ?? []);
const selectedCountry = computed(() => response.value?.countries.find(({ isoCode }) => isoCode === selectedCode.value) ?? null);
const detailCountry = computed(() => hoveredCountry.value ?? selectedCountry.value);
const isEmpty = computed(() => response.value !== null && response.value.totalRatedDiscs === 0);
const isAuthenticated = computed(() => authStore.authStatus === "authenticated" && Boolean(authStore.userId));
const focusables = () => dialog.value?.querySelectorAll<HTMLElement>(
  'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
) ?? [];

async function loadGeometry() {
  hasGeometryError.value = false;
  try {
    const [data, mapModule] = await Promise.all([
      import("../assets/world-countries-110m.min.json"),
      import("./MusicalWorldMap.vue"),
    ]);
    const collection = data.default as { features: Array<{ properties: { isoCode: string | null } }> };
    geometryCodes.value = collection.features.map(({ properties }) => properties.isoCode);
    mapComponent.value = mapModule.default;
  } catch {
    hasGeometryError.value = true;
    mapComponent.value = null;
  }
}

function loadWorld() {
  controller?.abort();
  const requestController = new AbortController();
  controller = requestController;
  const requestId = ++liveRequest;
  const { authStatus, userId, authSessionGeneration } = authStore;
  response.value = null;
  hasHttpError.value = false;
  selectedCode.value = null;
  hoveredCountry.value = null;
  if (authStatus !== "authenticated" || !userId) {
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  void getRatesGeographyWorld(requestController.signal)
    .then((result) => {
      if (requestId !== liveRequest || requestController.signal.aborted) return;
      if (authStore.userId !== userId || authStore.authSessionGeneration !== authSessionGeneration) return;
      response.value = result;
    })
    .catch(() => {
      if (requestId === liveRequest && !requestController.signal.aborted) hasHttpError.value = true;
    })
    .finally(() => {
      if (requestId === liveRequest && !requestController.signal.aborted) isLoading.value = false;
    });
}

function retry() {
  if (hasHttpError.value) loadWorld();
  if (hasGeometryError.value) void loadGeometry();
}
function close() {
  if (closing) return;
  closing = true;
  controller?.abort();
  liveRequest += 1;
  emit("close");
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== "Tab") return;
  const elements = [...focusables()];
  if (!elements.length) { event.preventDefault(); dialog.value?.focus(); return; }
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
function selectCountry(country: RatesGeographyCountryDto | null) {
  selectedCode.value = country?.isoCode === selectedCode.value ? null : country?.isoCode ?? null;
}
function formatNumber(value: number) { return new Intl.NumberFormat("es-ES").format(value); }
function formatPercentage(value: number) { return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value)}%`; }

watch(
  () => [authStore.authStatus, authStore.userId, authStore.authSessionGeneration] as const,
  () => loadWorld(),
);

onMounted(() => {
  priorOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", onKeydown);
  void loadGeometry();
  loadWorld();
  void nextTick(() => closeButton.value?.focus());
});
onBeforeUnmount(() => {
  controller?.abort();
  liveRequest += 1;
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = priorOverflow;
  if (opener?.isConnected) void nextTick(() => opener.focus());
});
</script>

<template>
  <Teleport to="body">
    <div ref="dialog" class="fixed inset-0 z-[100] flex min-h-0 flex-col bg-white text-gray-900 dark:bg-rv-darkSurface dark:text-white" data-test="musical-world-modal" role="dialog" aria-modal="true" aria-labelledby="musical-world-modal-title" tabindex="-1">
      <header class="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/10 sm:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <i class="fa-solid fa-earth-americas text-rv-blue" aria-hidden="true"></i>
          <div class="min-w-0">
            <h2 class="truncate text-lg font-bold" id="musical-world-modal-title">Tu mundo musical</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">Explora los países de tus discos valorados</p>
          </div>
        </div>
        <button ref="closeButton" type="button" class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink dark:text-gray-200 dark:hover:bg-white/10" aria-label="Cerrar mapa mundial" @click="close">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </header>

      <main class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
        <div v-if="isLoading" class="grid min-h-64 place-items-center" role="status" aria-busy="true" data-test="world-loading">
          <div class="flex flex-col items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <span class="h-9 w-9 animate-spin rounded-full border-4 border-rv-blue/20 border-t-rv-blue" aria-hidden="true"></span>
            Cargando tu distribución musical…
          </div>
        </div>
        <section v-else-if="hasHttpError" class="mx-auto grid min-h-64 max-w-md place-content-center gap-3 text-center" role="alert" data-test="world-http-error">
          <p>No se pudo cargar tu distribución de países.</p>
          <button type="button" class="rounded-lg border-2 border-rv-navy bg-rv-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-transparent hover:text-gray-600 hover:border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:hover:text-gray-300 dark:hover:border-white/20" @click="retry">Reintentar</button>
        </section>
        <div v-else-if="!isAuthenticated" class="mx-auto grid min-h-64 max-w-md place-content-center gap-2 text-center" data-test="world-session-unavailable"><p class="font-semibold">Tu sesión ya no está disponible.</p><p class="text-sm text-gray-600 dark:text-gray-300">Vuelve a iniciar sesión para consultar tu mundo musical.</p></div>
        <div v-else-if="isEmpty" class="mx-auto grid min-h-64 max-w-md place-content-center gap-2 text-center" data-test="world-empty">
          <p class="font-semibold">Todavía no tienes discos valorados</p>
          <p class="text-sm text-gray-600 dark:text-gray-300">Cuando valores discos con país disponible, aparecerán aquí.</p>
        </div>
        <div v-else-if="response" class="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,.8fr)]">
          <section class="min-w-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/40 sm:p-5" aria-label="Mapa mundial">
            <div v-if="hasGeometryError" class="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" role="alert" data-test="geometry-error">
              <span>No se pudo cargar la geometría del mapa. Puedes consultar los países en el ranking.</span>
              <button type="button" class="shrink-0 rounded-lg border-2 border-rv-navy bg-rv-navy px-3 py-1.5 font-semibold text-white transition hover:border-gray-300 hover:bg-transparent hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:hover:border-white/20 dark:hover:text-gray-300" @click="retry">Reintentar</button>
            </div>
            <component :is="mapComponent" v-else-if="mapComponent" :countries="response.countries" :selected-code="selectedCode" @select="selectCountry" @preview="hoveredCountry = $event" />
            <p v-else class="grid min-h-64 place-items-center text-sm text-gray-500" role="status">Preparando geometría local…</p>
            <div v-if="detailCountry" class="mt-3 rounded-xl border border-rv-blue/20 bg-rv-blue/5 p-3" data-test="country-detail" aria-live="polite">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="truncate font-semibold" :title="detailCountry.name">{{ detailCountry.name }}</h3>
                  <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ formatNumber(detailCountry.count) }} discos valorados · {{ formatPercentage(detailCountry.percentage) }} de los países conocidos</p>
                </div>
                <button v-if="selectedCountry" type="button" class="shrink-0 text-xs font-semibold text-rv-navy underline hover:text-rv-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:text-white" @click="selectedCode = null">Quitar selección</button>
              </div>
            </div>
          </section>

          <aside class="flex min-w-0 flex-col gap-4">
            <section class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40" aria-label="Resumen de países">
              <h3 class="mb-3 text-sm font-bold">Tu distribución</h3>
              <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt class="text-xs text-gray-500 dark:text-gray-400">Países explorados</dt><dd class="mt-0.5 font-semibold tabular-nums">{{ formatNumber(response.countryCount) }}</dd></div>
                <div><dt class="text-xs text-gray-500 dark:text-gray-400">Discos con país</dt><dd class="mt-0.5 font-semibold tabular-nums">{{ formatNumber(response.mappedDiscs) }}</dd></div>
                <div class="col-span-2"><dt class="text-xs text-gray-500 dark:text-gray-400">Discos sin país representable</dt><dd class="mt-0.5 font-semibold tabular-nums">{{ formatNumber(response.unmappedDiscs) }} <span class="font-normal">de {{ formatNumber(response.totalRatedDiscs) }} valorados</span></dd></div>
                <div v-if="response.countries[0]" class="col-span-2"><dt class="text-xs text-gray-500 dark:text-gray-400">País dominante</dt><dd class="mt-0.5 font-semibold">{{ response.countries[0].name }} <span class="font-normal">· {{ formatNumber(response.countries[0].count) }} discos</span></dd></div>
              </dl>
            </section>
            <section class="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40" aria-label="Top 10 países">
              <h3 class="mb-3 text-sm font-bold">Top 10 de países</h3>
              <ol v-if="rankedCountries.length" class="flex flex-col gap-1.5">
                <li v-for="(country, index) in rankedCountries" :key="country.isoCode">
                  <button type="button" class="group flex w-full min-w-0 items-center gap-2 rounded-lg border-2 border-rv-navy bg-rv-navy px-2 py-1.5 text-left text-white transition hover:border-gray-300 hover:bg-transparent hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:hover:border-white/20 dark:hover:text-gray-300" :class="selectedCode === country.isoCode ? 'ring-2 ring-rv-pink' : ''" :aria-pressed="selectedCode === country.isoCode" @click="selectCountry(country)">
                    <span class="w-5 shrink-0 text-right text-xs tabular-nums text-white/80 group-hover:text-gray-600 dark:group-hover:text-gray-300">{{ index + 1 }}</span>
                    <span class="min-w-0 flex-1 truncate text-sm" :title="country.name">{{ country.name }}</span>
                    <span class="shrink-0 text-xs tabular-nums text-white/80 group-hover:text-gray-600 dark:group-hover:text-gray-300">{{ formatNumber(country.count) }} · {{ formatPercentage(country.percentage) }}</span>
                  </button>
                </li>
              </ol>
              <p v-else class="text-sm text-gray-600 dark:text-gray-300">No hay países con código disponible para mostrar.</p>
            </section>
            <section v-if="matchResult.unrepresented.length" class="rounded-xl border border-amber-300/70 bg-amber-50/70 p-3 dark:border-amber-800/60 dark:bg-amber-950/20" aria-label="Países no representados en el mapa" data-test="unrepresented-countries">
              <h3 class="text-xs font-bold">Países no representados en el mapa</h3><p class="mt-1 text-[11px] text-gray-600 dark:text-gray-400">Su código no tiene una geometría única compatible en el recurso local.</p>
              <ul class="mt-1 flex flex-wrap gap-x-2 text-xs text-gray-700 dark:text-gray-300">
                <li v-for="country in matchResult.unrepresented" :key="country.isoCode">{{ country.name }} ({{ country.isoCode }}) · {{ formatNumber(country.count) }}</li>
              </ul>
            </section>
            <p v-if="response.unmappedDiscs" class="text-xs text-gray-500 dark:text-gray-400">{{ formatNumber(response.unmappedDiscs) }} discos no tienen un código de país representable en los datos del servicio.</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-500">Geometría: Made with Natural Earth.</p>
          </aside>
        </div>
      </main>
    </div>
  </Teleport>
</template>
