<template>
  <div class="min-h-screen bg-gray-100 dark:bg-rv-darkBg py-4 px-4 flex flex-col items-center">
    <div class="w-full max-w-6xl">

      <!-- Cabecera -->
      <div class="text-center mb-2">
        <h1 class="text-xl md:text-2xl font-bold text-rv-navy dark:text-white mb-1">
          <i class="fa-solid fa-building mr-2"></i>Salas
        </h1>
        <p class="text-xs text-gray-500 dark:text-gray-400">Haz click en una provincia para ver sus salas.</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-rv-pink mb-4"></i>
        <p class="text-gray-500 dark:text-gray-400 text-lg">Cargando mapa...</p>
      </div>

      <template v-else>
        <!-- Mapa fijo de España (península + Baleares + recuadro de Canarias) -->
        <div class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-1.5 spain-map-wrapper">
          <svg :viewBox="viewBox" class="w-full h-auto select-none">
            <path
              v-if="portugalFeature"
              :d="portugalPath ?? undefined"
              :fill="fillFor(portugalFeature)"
              class="province-path"
              @click="goToProvince('Portugal')"
            >
              <title>Portugal</title>
            </path>

            <path
              v-if="andorraFeature"
              :d="andorraPath ?? undefined"
              :fill="fillFor(andorraFeature)"
              class="province-path"
              @click="goToProvince('Andorra')"
            >
              <title>Andorra</title>
            </path>

            <path
              v-for="f in provinceFeatures"
              :key="f.properties.name"
              :d="pathFor(f) ?? undefined"
              :fill="fillFor(f)"
              class="province-path"
              @click="goToProvince(f.properties.name)"
            >
              <title>{{ f.properties.name }}</title>
            </path>

            <path :d="compositionBorderPath" class="composition-border" />

            <text
              v-if="portugalFeature"
              :x="portugalCentroid[0]"
              :y="portugalCentroid[1]"
              text-anchor="middle"
              dominant-baseline="middle"
              class="province-label"
              :class="{ 'province-label--empty': countFor(portugalFeature) === 0 }"
            >{{ countFor(portugalFeature) }}</text>

            <text
              v-if="andorraFeature"
              :x="andorraCentroid[0]"
              :y="andorraCentroid[1]"
              text-anchor="middle"
              dominant-baseline="middle"
              class="province-label"
              :class="{ 'province-label--empty': countFor(andorraFeature) === 0 }"
            >{{ countFor(andorraFeature) }}</text>

            <text
              v-for="f in provinceFeatures"
              :key="`label-${f.properties.name}`"
              :x="centroidFor(f)[0]"
              :y="centroidFor(f)[1]"
              text-anchor="middle"
              dominant-baseline="middle"
              class="province-label"
              :class="{ 'province-label--empty': countFor(f) === 0 }"
            >{{ countFor(f) }}</text>
          </svg>
        </div>

        <div v-if="unlocatedCount > 0" class="text-center mt-2">
          <button @click="goToUnlocated"
            class="text-sm text-gray-500 dark:text-gray-400 hover:text-rv-pink dark:hover:text-rv-pink transition-colors">
            <i class="fa-solid fa-location-crosshairs mr-1"></i>
            Ver salas sin ubicar ({{ unlocatedCount }})
          </button>
        </div>
      </template>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { geoPath, geoConicConformal } from 'd3-geo';
import { geoConicConformalSpain } from 'd3-composite-projections';
import { feature as topoFeature } from 'topojson-client';
// @ts-expect-error - JSON sin tipos, ver es-atlas
import provincesTopology from 'es-atlas/es/provinces.json';
// @ts-expect-error - JSON sin tipos, ver world-atlas
import worldTopology from 'world-atlas/countries-50m.json';
import { getVenueStatsByProvince } from '@services/venues/venues';
import type { VenueProvinceStat } from '@services/venues/venues';
import { provincesMatch } from '@helpers/provinceMatch';
import { provinceSlug, slugify } from '@helpers/slug';
import SwalService from '@services/swal/SwalService';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

// Territorio incluido en el TopoJSON de es-atlas que no es una provincia española real.
const NON_PROVINCE_NAMES = ['Gibraltar. Territorio no asociado a ninguna provincia'];

type ProvinceFeature = Feature<Geometry, { name: string }>;

export default defineComponent({
  name: 'Rooms',
  setup() {
    const router = useRouter();
    const loading = ref(true);
    const provinceStats = ref<VenueProvinceStat[]>([]);

    // Proyección compuesta oficial: península + Baleares proyectadas, Canarias en su propio recuadro fijo.
    const projection = geoConicConformalSpain();
    const pathGenerator = geoPath(projection);

    const provinceFeatures = computed<ProvinceFeature[]>(() => {
      const collection = topoFeature(
        provincesTopology as any,
        (provincesTopology as any).objects.provinces
      ) as unknown as FeatureCollection<Geometry, GeoJsonProperties>;
      return collection.features.filter(
        (f) => !NON_PROVINCE_NAMES.includes(f.properties?.name)
      ) as ProvinceFeature[];
    });

    const compositionBorderPath = computed(() => projection.getCompositionBorders());

    // Portugal se dibuja como un ente único (sin subdivisiones), con la misma proyección cónica
    // que usa la península pero sin el recorte que la composite projection reserva solo para España.
    const portugalProjection = geoConicConformal()
      .rotate([5, -38.6])
      .parallels([0, 60])
      .scale(projection.scale())
      .translate(projection.translate());
    const portugalPathGenerator = geoPath(portugalProjection);

    const portugalFeature = computed<ProvinceFeature | null>(() => {
      const collection = topoFeature(
        worldTopology as any,
        (worldTopology as any).objects.countries
      ) as unknown as FeatureCollection<Geometry, GeoJsonProperties>;
      const portugal = collection.features.find((f) => f.properties?.name === 'Portugal');
      if (!portugal) return null;
      if (portugal.geometry.type !== 'MultiPolygon') return portugal as ProvinceFeature;

      // El MultiPolygon de Portugal incluye Azores y Madeira; nos quedamos solo con la parte continental,
      // pegada a España (excluye los archipiélagos, muy al oeste/sur en el Atlántico).
      const mainland = portugal.geometry.coordinates.find((polygon) => {
        const ring = polygon[0];
        const lons = ring.map((p) => p[0]);
        const lats = ring.map((p) => p[1]);
        return Math.min(...lons) > -11 && Math.min(...lats) > 36;
      });
      if (!mainland) return portugal as ProvinceFeature;

      return { ...portugal, geometry: { type: 'Polygon', coordinates: mainland } } as ProvinceFeature;
    });

    const portugalPath = computed(() =>
      portugalFeature.value ? portugalPathGenerator(portugalFeature.value) : null
    );

    const portugalCentroid = computed<[number, number]>(() =>
      portugalFeature.value ? portugalPathGenerator.centroid(portugalFeature.value) : [0, 0]
    );

    // Andorra: mismo tratamiento que Portugal (ente único, sobre todo pensado para poder meter
    // ahí un festival), reutilizando la misma proyección sin recorte.
    const andorraFeature = computed<ProvinceFeature | null>(() => {
      const collection = topoFeature(
        worldTopology as any,
        (worldTopology as any).objects.countries
      ) as unknown as FeatureCollection<Geometry, GeoJsonProperties>;
      const andorra = collection.features.find((f) => f.properties?.name === 'Andorra');
      return (andorra as ProvinceFeature) ?? null;
    });

    const andorraPath = computed(() =>
      andorraFeature.value ? portugalPathGenerator(andorraFeature.value) : null
    );

    const andorraCentroid = computed<[number, number]>(() =>
      andorraFeature.value ? portugalPathGenerator.centroid(andorraFeature.value) : [0, 0]
    );

    // Recorta el lienzo 960x500 al hueco real que ocupa el contenido (provincias + recuadro de Canarias),
    // en vez de dejar el océano vacío que trae por defecto la proyección.
    const viewBox = computed(() => {
      const PADDING = 8;
      const [[fx0, fy0], [fx1, fy1]] = pathGenerator.bounds({
        type: 'FeatureCollection',
        features: provinceFeatures.value,
      } as any);

      const borderNums = (compositionBorderPath.value.match(/-?\d+\.?\d*/g) ?? []).map(Number);
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (let i = 0; i < borderNums.length; i += 2) {
        bx0 = Math.min(bx0, borderNums[i]);
        bx1 = Math.max(bx1, borderNums[i]);
        by0 = Math.min(by0, borderNums[i + 1]);
        by1 = Math.max(by1, borderNums[i + 1]);
      }

      let px0 = fx0, py0 = fy0, px1 = fx1, py1 = fy1;
      if (portugalFeature.value) {
        const [[gx0, gy0], [gx1, gy1]] = portugalPathGenerator.bounds(portugalFeature.value);
        px0 = Math.min(px0, gx0);
        py0 = Math.min(py0, gy0);
        px1 = Math.max(px1, gx1);
        py1 = Math.max(py1, gy1);
      }
      if (andorraFeature.value) {
        const [[ax0, ay0], [ax1, ay1]] = portugalPathGenerator.bounds(andorraFeature.value);
        px0 = Math.min(px0, ax0);
        py0 = Math.min(py0, ay0);
        px1 = Math.max(px1, ax1);
        py1 = Math.max(py1, ay1);
      }

      const x0 = Math.min(px0, bx0) - PADDING;
      const y0 = Math.min(py0, by0) - PADDING;
      const x1 = Math.max(px1, bx1) + PADDING;
      const y1 = Math.max(py1, by1) + PADDING;

      return `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;
    });

    const maxCount = computed(() =>
      provinceStats.value.reduce((max, s) => (s.province && s.count > max ? s.count : max), 0)
    );

    const unlocatedCount = computed(() =>
      provinceStats.value.find((s) => s.province === null)?.count ?? 0
    );

    const findStatForEsAtlasName = (esAtlasName: string): VenueProvinceStat | undefined =>
      provinceStats.value.find((s) => s.province && provincesMatch(s.province, esAtlasName));

    const countFor = (f: ProvinceFeature) => findStatForEsAtlasName(f.properties.name)?.count ?? 0;

    const pathFor = (f: ProvinceFeature) => pathGenerator(f);

    const centroidFor = (f: ProvinceFeature) => pathGenerator.centroid(f);

    const interpolateFillColor = (ratio: number) => {
      // De un tono claro (sin salas) a rv-pink (#e46e8a) según la proporción respecto a la provincia con más salas.
      const from = { r: 0xf3, g: 0xe8, b: 0xec };
      const to = { r: 0xe4, g: 0x6e, b: 0x8a };
      const r = Math.round(from.r + (to.r - from.r) * ratio);
      const g = Math.round(from.g + (to.g - from.g) * ratio);
      const b = Math.round(from.b + (to.b - from.b) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    };

    const fillFor = (f: ProvinceFeature) => {
      const count = countFor(f);
      return count === 0 ? '#e5e7eb' : interpolateFillColor(maxCount.value > 0 ? count / maxCount.value : 0);
    };

    const goToProvince = (esAtlasName: string) => {
      const stat = findStatForEsAtlasName(esAtlasName);
      const slug = stat?.province ? provinceSlug(stat.province) : slugify(esAtlasName);
      router.push({ name: 'RoomsByProvince', params: { province: slug } });
    };

    const goToUnlocated = () => {
      router.push({ name: 'RoomsByProvince', params: { province: 'sin-ubicar' } });
    };

    const fetchData = async () => {
      loading.value = true;
      try {
        provinceStats.value = await getVenueStatsByProvince();
      } catch (error) {
        console.error('Error fetching province stats:', error);
        SwalService.error('No se pudieron cargar las salas');
      } finally {
        loading.value = false;
      }
    };

    onMounted(fetchData);

    return {
      loading,
      unlocatedCount,
      provinceFeatures,
      compositionBorderPath,
      portugalFeature,
      portugalPath,
      portugalCentroid,
      andorraFeature,
      andorraPath,
      andorraCentroid,
      viewBox,
      countFor,
      pathFor,
      centroidFor,
      fillFor,
      goToProvince,
      goToUnlocated,
    };
  },
});
</script>

<style scoped>
.spain-map-wrapper svg {
  background: #dceefb;
  border-radius: 0.5rem;
}

.province-path {
  stroke: #ffffff;
  stroke-width: 1;
  cursor: pointer;
  transition: stroke 0.15s, stroke-width 0.15s;
}

.province-path:hover {
  stroke: #0064d6;
  stroke-width: 2.5;
}

.composition-border {
  fill: none;
  stroke: #64748b;
  stroke-width: 1.25;
  stroke-dasharray: 5 3;
  pointer-events: none;
}

.province-label {
  font-weight: 700;
  font-size: 12px;
  fill: #00021f;
  pointer-events: none;
  paint-order: stroke;
  stroke: #ffffff;
  stroke-width: 3px;
  stroke-linejoin: round;
}

.province-label--empty {
  font-weight: 500;
  fill: #6b7280;
}
</style>
