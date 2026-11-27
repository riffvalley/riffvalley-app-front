<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { getAdministrativeRegions, getVenueImportCountries } from "@/modules/venues";
import { resolveVenueBatch } from "@/modules/venues";
import { inspectLocalitiesBatch } from "../../api/entityResolution";
import { resolveArtistsBatch } from "../../api/artistResolution";
import { getEditableEvent } from "../../api/eventManagement";
import type { EditableEventDetail, UpdateEventRequest } from "../../api/eventManagement";
import { useUpdateEventMutation } from "../../application/useEventManagement";
import SwalService from "@/services/swal/SwalService";

const props = defineProps<{ eventId: string; canManage: boolean }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const dialogElement = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;
let localityRequestId = 0;
let venueRequestId = 0;
const artistRequestIds = new Map<number, number>();

interface LineupDraft {
  key: number;
  name: string;
  artistId: string | null;
  originalArtistId: string | null;
  tourId: string | null;
  originalName: string;
  candidates: Array<{ id: string; name: string }>;
  resolutionError: string;
}

interface EventDraft {
  name: string;
  startDate: string;
  endDate: string;
  price: string;
  otherInfo: string;
  countryId: string;
  regionId: string;
  localityId: string;
  localityName: string;
  province: string;
  venueId: string;
  venueName: string;
}

const detail = useQuery({
  queryKey: ["events-festivals", "event-detail", props.eventId],
  queryFn: ({ signal }) => getEditableEvent(props.eventId, signal),
  staleTime: 15_000,
  retry: false,
});
const countries = useQuery({
  queryKey: ["events-festivals", "edit-countries"],
  queryFn: ({ signal }) => getVenueImportCountries(signal),
  staleTime: 60_000,
  retry: false,
});
const draft = reactive<EventDraft>({
  name: "",
  startDate: "",
  endDate: "",
  price: "",
  otherInfo: "",
  countryId: "",
  regionId: "",
  localityId: "",
  localityName: "",
  province: "",
  venueId: "",
  venueName: "",
});
const lineup = ref<LineupDraft[]>([]);
const baseline = ref("");
const nextLineupKey = ref(0);
const localityCandidates = ref<
  Array<{
    id: string;
    name: string;
    province: string | null;
    administrativeRegion: { id: string; name: string };
    country: { id: string; name: string };
  }>
>([]);
const venueCandidates = ref<Array<{ id: string; name: string }>>([]);
const locationError = ref("");
const formError = ref("");
const isResolvingLocation = ref(false);
const isResolvingVenue = ref(false);
const isDirty = computed(() => baseline.value !== "" && baseline.value !== snapshot());
const regions = useQuery({
  queryKey: computed(() => ["events-festivals", "edit-regions", draft.countryId]),
  queryFn: ({ signal }) => getAdministrativeRegions(draft.countryId, signal),
  enabled: computed(() => Boolean(draft.countryId)),
  staleTime: 60_000,
  retry: false,
});
const mutation = useUpdateEventMutation();
const busy = computed(() => mutation.isPending.value || detail.isLoading.value);
const title = computed(() =>
  detail.data.value?.type === "festival" ? "Editar festival" : "Editar concierto"
);
const canSave = computed(() => props.canManage && !busy.value);

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    void requestClose();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = dialogElement.value?.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
  );
  if (!focusable?.length) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  window.addEventListener("keydown", onDialogKeydown);
  void nextTick(() => dialogElement.value?.focus());
});

onUnmounted(() => {
  window.removeEventListener("keydown", onDialogKeydown);
  localityRequestId += 1;
  venueRequestId += 1;
  artistRequestIds.forEach((requestId, key) => artistRequestIds.set(key, requestId + 1));
  previouslyFocused?.focus();
});

watch(
  detail.data,
  (event) => {
    if (!event) return;
    Object.assign(draft, toDraft(event));
    lineup.value = event.lineup.map((item) => ({
      key: nextLineupKey.value++,
      name: item.name,
      artistId: item.artistId,
      originalArtistId: item.artistId,
      tourId: item.tourId,
      originalName: item.name,
      candidates: [],
      resolutionError: "",
    }));
    baseline.value = snapshot();
  },
  { immediate: true }
);

function toDraft(event: EditableEventDetail): EventDraft {
  return {
    name: event.name ?? "",
    startDate: event.startDate,
    endDate: event.endDate ?? "",
    price: event.price ?? "",
    otherInfo: event.otherInfo ?? "",
    countryId: event.countryId,
    regionId: event.administrativeRegionId,
    localityId: event.localityId,
    localityName: event.localityName,
    province: event.province ?? "",
    venueId: event.venueId,
    venueName: event.venueName,
  };
}

function snapshot(): string {
  return JSON.stringify({
    ...draft,
    lineup: lineup.value.map(({ name, artistId, tourId }) => ({ name, artistId, tourId })),
  });
}

function validDraft(): boolean {
  return Boolean(
    draft.startDate &&
    (!draft.endDate || draft.endDate >= draft.startDate) &&
    draft.name.length <= 240 &&
    draft.venueId &&
    draft.localityId &&
    lineup.value.every(
      (item) =>
        item.name.trim() &&
        item.name.trim().length <= 100 &&
        !item.resolutionError &&
        (item.artistId || item.name.trim() === item.originalName.trim())
    )
  );
}

function addArtist() {
  lineup.value.push({
    key: nextLineupKey.value++,
    name: "",
    artistId: null,
    originalArtistId: null,
    tourId: null,
    originalName: "",
    candidates: [],
    resolutionError: "Selecciona un artista existente.",
  });
}

function removeArtist(index: number) {
  lineup.value.splice(index, 1);
}
function moveArtist(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= lineup.value.length) return;
  const [item] = lineup.value.splice(index, 1);
  if (item) lineup.value.splice(target, 0, item);
}

async function resolveArtist(item: LineupDraft) {
  const requestId = (artistRequestIds.get(item.key) ?? 0) + 1;
  artistRequestIds.set(item.key, requestId);
  item.resolutionError = "";
  item.candidates = [];
  const name = item.name.trim();
  if (!name) {
    item.resolutionError = "Escribe el nombre de un artista.";
    return;
  }
  item.artistId = null;
  item.resolutionError = "Resolviendo artista…";
  try {
    const [result] = await resolveArtistsBatch([name]);
    if (
      artistRequestIds.get(item.key) !== requestId ||
      !lineup.value.some(({ key }) => key === item.key) ||
      item.name.trim() !== name
    )
      return;
    if (!result || result.status === "new" || result.status === "invalid") {
      item.resolutionError = "No se encontró un artista existente con ese nombre.";
    } else if (result.status === "ambiguous") {
      item.candidates = result.candidates;
      item.resolutionError = "Elige el artista correcto.";
    } else {
      item.artistId = result.artist.id;
      item.originalArtistId = result.artist.id;
      item.name = result.artist.name;
      item.originalName = result.artist.name;
      item.resolutionError = "";
    }
  } catch {
    if (artistRequestIds.get(item.key) !== requestId || item.name.trim() !== name) return;
    item.resolutionError = "No se pudo consultar el catálogo de artistas. Inténtalo de nuevo.";
  }
}

function selectArtist(item: LineupDraft, id: string) {
  const candidate = item.candidates.find((entry) => entry.id === id);
  if (!candidate) return;
  item.artistId = candidate.id;
  item.originalArtistId = candidate.id;
  item.name = candidate.name;
  item.originalName = candidate.name;
  item.candidates = [];
  item.resolutionError = "";
}

function changeArtistName(item: LineupDraft, name: string) {
  if (item.name === name) return;
  artistRequestIds.set(item.key, (artistRequestIds.get(item.key) ?? 0) + 1);
  item.name = name;
  item.artistId = name.trim() === item.originalName.trim() ? item.originalArtistId : null;
  item.candidates = [];
  item.resolutionError = "";
}

async function resolveLocality() {
  const requestId = ++localityRequestId;
  locationError.value = "";
  localityCandidates.value = [];
  draft.localityId = "";
  draft.venueId = "";
  if (!draft.countryId || !draft.localityName.trim()) {
    locationError.value = "Selecciona país y escribe la localidad.";
    return;
  }
  isResolvingLocation.value = true;
  try {
    const requested = {
      name: draft.localityName.trim(),
      countryId: draft.countryId,
      regionId: draft.regionId,
      province: draft.province.trim(),
    };
    const { results } = await inspectLocalitiesBatch({
      localities: [
        {
          name: requested.name,
          countryId: requested.countryId,
          ...(requested.regionId ? { administrativeRegionId: requested.regionId } : {}),
          ...(requested.province ? { province: requested.province } : {}),
        },
      ],
    });
    if (
      localityRequestId !== requestId ||
      draft.localityName.trim() !== requested.name ||
      draft.countryId !== requested.countryId ||
      draft.regionId !== requested.regionId ||
      draft.province.trim() !== requested.province
    )
      return;
    const result = results[0];
    if (!result || result.status === "new" || result.status === "invalid") {
      locationError.value = "No se encontró una localidad existente con esos datos.";
    } else if (result.status === "ambiguous") {
      localityCandidates.value = result.candidates;
      locationError.value = "Elige la localidad correcta.";
    } else {
      applyLocality(result.locality);
    }
  } catch {
    if (localityRequestId !== requestId) return;
    locationError.value = "No se pudo consultar el catálogo de localidades. Inténtalo de nuevo.";
  } finally {
    if (localityRequestId === requestId) isResolvingLocation.value = false;
  }
}

function applyLocality(locality: NonNullable<(typeof localityCandidates.value)[number]>) {
  draft.localityId = locality.id;
  draft.localityName = locality.name;
  draft.regionId = locality.administrativeRegion.id;
  draft.countryId = locality.country.id;
  localityCandidates.value = [];
  locationError.value = "Localidad existente seleccionada. Ahora confirma la sala.";
}

async function resolveVenue() {
  const requestId = ++venueRequestId;
  locationError.value = "";
  venueCandidates.value = [];
  draft.venueId = "";
  if (!draft.localityId || !draft.venueName.trim()) {
    locationError.value = "Selecciona una localidad y escribe la sala.";
    return;
  }
  isResolvingVenue.value = true;
  const requestedName = draft.venueName.trim();
  const requestedLocalityId = draft.localityId;
  try {
    const [result] = await resolveVenueBatch([
      { name: requestedName, localityId: requestedLocalityId },
    ]);
    if (
      venueRequestId !== requestId ||
      draft.venueName.trim() !== requestedName ||
      draft.localityId !== requestedLocalityId
    )
      return;
    if (!result || result.status === "new") {
      locationError.value = "No se encontró una sala existente en esa localidad.";
    } else if (result.status === "ambiguous") {
      venueCandidates.value = result.candidates;
      locationError.value = "Elige la sala correcta.";
    } else {
      draft.venueId = result.venue.id;
      draft.venueName = result.venue.name;
      locationError.value = "Sala existente seleccionada.";
    }
  } catch {
    if (venueRequestId !== requestId) return;
    locationError.value = "No se pudo consultar el catálogo de salas. Inténtalo de nuevo.";
  } finally {
    if (venueRequestId === requestId) isResolvingVenue.value = false;
  }
}

function selectVenue(id: string) {
  const candidate = venueCandidates.value.find((entry) => entry.id === id);
  if (!candidate) return;
  draft.venueId = candidate.id;
  draft.venueName = candidate.name;
  venueCandidates.value = [];
  locationError.value = "Sala existente seleccionada.";
}

function changeCountry(countryId: string) {
  invalidateLocationResolutions();
  draft.countryId = countryId;
  draft.regionId = "";
  draft.localityId = "";
  draft.venueId = "";
  locationError.value = "";
}

function changeRegion(regionId: string) {
  invalidateLocationResolutions();
  draft.regionId = regionId;
  draft.localityId = "";
  draft.venueId = "";
  locationError.value = "";
}

function changeLocalityName(name: string) {
  invalidateLocationResolutions();
  draft.localityName = name;
  draft.localityId = "";
  draft.venueId = "";
  locationError.value = "";
}

function changeVenueName(name: string) {
  invalidateVenueResolution();
  draft.venueName = name;
  draft.venueId = "";
  locationError.value = "";
}

function changeProvince(province: string) {
  if (draft.province === province) return;
  invalidateLocationResolutions();
  draft.province = province;
  draft.localityId = "";
  draft.venueId = "";
  locationError.value = "";
}

function invalidateLocationResolutions() {
  localityRequestId += 1;
  venueRequestId += 1;
  isResolvingLocation.value = false;
  isResolvingVenue.value = false;
  localityCandidates.value = [];
  venueCandidates.value = [];
}

function invalidateVenueResolution() {
  venueRequestId += 1;
  isResolvingVenue.value = false;
  venueCandidates.value = [];
}

async function requestClose() {
  if (busy.value) return;
  if (isDirty.value) {
    const discard = await SwalService.confirm(
      "¿Descartar los cambios sin guardar?",
      "Perderás los cambios que todavía no se han guardado.",
      "Descartar cambios",
      "Seguir editando"
    );
    if (!discard.isConfirmed) return;
  }
  emit("close");
}

async function save() {
  formError.value = "";
  if (!validDraft()) {
    formError.value =
      "Revisa las fechas, la sala y que todos los artistas sean existentes y estén resueltos.";
    return;
  }
  const current = detail.data.value;
  if (!current) return;
  const payload: UpdateEventRequest = {
    name: draft.name.trim() || null,
    startDate: draft.startDate,
    endDate: draft.endDate || null,
    venueId: draft.venueId,
    localityId: draft.localityId,
    tourId: current.tourId,
    price: draft.price || null,
    otherInfo: draft.otherInfo || null,
    lineup: lineup.value.map(({ name, artistId, tourId }) => ({
      artistId,
      name: name.trim(),
      tourId,
    })),
  };
  try {
    await mutation.mutateAsync({ id: props.eventId, payload });
    await SwalService.success("Evento actualizado correctamente.");
    emit("saved");
    emit("close");
  } catch {
    formError.value = "No se pudo guardar el evento. Revisa los datos e inténtalo de nuevo.";
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-3 py-6 sm:p-6"
  >
    <section
      ref="dialogElement"
      tabindex="-1"
      class="my-auto w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-rv-darkCard"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-edit-title"
    >
      <header
        class="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-white/10 sm:px-7"
      >
        <div>
          <h2 id="event-edit-title" class="text-xl font-bold text-rv-navy dark:text-white">
            {{ title }}
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Los cambios se aplican solo a este evento y sus relaciones.
          </p>
        </div>
        <button
          type="button"
          aria-label="Cerrar edición"
          class="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:text-gray-200 dark:hover:bg-white/10"
          :disabled="busy"
          @click="requestClose"
        >
          ×
        </button>
      </header>

      <div
        v-if="detail.isLoading.value || countries.isLoading.value"
        class="p-8 text-center text-sm text-gray-600 dark:text-gray-300"
        role="status"
      >
        Cargando datos del evento…
      </div>
      <div
        v-else-if="detail.isError.value || !detail.data.value || countries.isError.value"
        class="p-6"
        role="alert"
      >
        <p class="text-sm text-red-700 dark:text-red-300">
          No se pudieron cargar todos los datos necesarios para editar este evento.
        </p>
        <button
          type="button"
          class="mt-3 rounded-lg border px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple"
          @click="detail.refetch()"
        >
          Reintentar
        </button>
      </div>
      <form
        v-else
        class="max-h-[72vh] space-y-6 overflow-y-auto px-5 py-5 sm:px-7"
        @submit.prevent="save"
      >
        <fieldset :disabled="busy || !canManage" class="space-y-5">
          <div>
            <label for="event-name" class="mb-1 block text-sm font-semibold"
              >{{
                detail.data.value.type === "festival" ? "Nombre del festival" : "Título (opcional)"
              }}
              <input
                id="event-name"
                v-model="draft.name"
                maxlength="240"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-rv-navy focus:border-rv-purple focus:outline-none focus:ring-2 focus:ring-rv-purple/30 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
              />
            </label>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label for="event-start-date" class="text-sm font-semibold"
              >Fecha de inicio<input
                id="event-start-date"
                v-model="draft.startDate"
                type="date"
                required
                class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
            /></label>
            <label for="event-end-date" class="text-sm font-semibold"
              >{{
                detail.data.value.type === "festival" ? "Fecha de fin" : "Fecha de fin (opcional)"
              }}<input
                id="event-end-date"
                v-model="draft.endDate"
                type="date"
                class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
            /></label>
          </div>

          <section
            class="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-white/10"
            aria-labelledby="event-location-title"
          >
            <h3 id="event-location-title" class="font-semibold text-rv-navy dark:text-white">
              Sala y ubicación
            </h3>
            <p class="text-xs text-gray-600 dark:text-gray-300">
              Selecciona relaciones existentes. El catálogo no se modifica.
            </p>
            <div class="grid gap-3 sm:grid-cols-3">
              <label for="event-country" class="text-sm font-medium"
                >País<select
                  id="event-country"
                  :value="draft.countryId"
                  class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                  @change="changeCountry(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">Seleccionar</option>
                  <option
                    v-for="country in countries.data.value"
                    :key="country.id"
                    :value="country.id"
                  >
                    {{ country.name }}
                  </option>
                </select></label
              >
              <label for="event-region" class="text-sm font-medium"
                >Región<select
                  id="event-region"
                  :value="draft.regionId"
                  class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                  @change="changeRegion(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">Todas</option>
                  <option
                    v-for="region in regions.data.value ?? []"
                    :key="region.id"
                    :value="region.id"
                  >
                    {{ region.name }}
                  </option>
                </select></label
              >
              <label for="event-locality" class="text-sm font-medium"
                >Localidad<input
                  id="event-locality"
                  :value="draft.localityName"
                  class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                  @input="changeLocalityName(($event.target as HTMLInputElement).value)"
              /></label>
            </div>
            <div class="flex flex-wrap items-end gap-3">
              <label for="event-province" class="min-w-36 flex-1 text-sm font-medium"
                >Provincia (opcional)<input
                  id="event-province"
                  :value="draft.province"
                  class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                  @input="changeProvince(($event.target as HTMLInputElement).value)"
              /></label>
              <button
                type="button"
                class="min-h-10 rounded-lg border border-rv-navy px-3 text-sm font-semibold text-rv-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:opacity-50 dark:border-gray-200 dark:text-gray-100"
                :disabled="isResolvingLocation"
                @click="resolveLocality"
              >
                {{ isResolvingLocation ? "Buscando…" : "Buscar localidad existente" }}
              </button>
            </div>
            <div
              v-if="localityCandidates.length"
              class="grid gap-2 sm:grid-cols-2"
              aria-label="Localidades encontradas"
            >
              <button
                v-for="candidate in localityCandidates"
                :key="candidate.id"
                type="button"
                class="rounded-lg border px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:hover:bg-white/5"
                @click="applyLocality(candidate)"
              >
                {{ candidate.name }} · {{ candidate.administrativeRegion.name }},
                {{ candidate.country.name }}
              </button>
            </div>
            <div class="flex flex-wrap items-end gap-3">
              <label for="event-venue" class="min-w-36 flex-1 text-sm font-medium"
                >Sala / recinto<input
                  id="event-venue"
                  :value="draft.venueName"
                  class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                  @input="changeVenueName(($event.target as HTMLInputElement).value)"
              /></label>
              <button
                type="button"
                class="min-h-10 rounded-lg border border-rv-navy px-3 text-sm font-semibold text-rv-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:opacity-50 dark:border-gray-200 dark:text-gray-100"
                :disabled="isResolvingVenue || !draft.localityId"
                @click="resolveVenue"
              >
                {{ isResolvingVenue ? "Buscando…" : "Buscar sala existente" }}
              </button>
            </div>
            <div
              v-if="venueCandidates.length"
              class="grid gap-2 sm:grid-cols-2"
              aria-label="Salas encontradas"
            >
              <button
                v-for="candidate in venueCandidates"
                :key="candidate.id"
                type="button"
                class="rounded-lg border px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:hover:bg-white/5"
                @click="selectVenue(candidate.id)"
              >
                {{ candidate.name }}
              </button>
            </div>
            <p v-if="locationError" class="text-sm text-gray-700 dark:text-gray-200" role="status">
              {{ locationError }}
            </p>
          </section>

          <section class="space-y-3" aria-labelledby="event-lineup-title">
            <div class="flex items-center justify-between gap-3">
              <h3 id="event-lineup-title" class="font-semibold text-rv-navy dark:text-white">
                Lineup ({{ lineup.length }})
              </h3>
              <button
                type="button"
                class="rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple"
                @click="addArtist"
              >
                Añadir artista
              </button>
            </div>
            <ol class="space-y-2">
              <li
                v-for="(item, index) in lineup"
                :key="item.key"
                class="rounded-xl border border-gray-200 p-3 dark:border-white/10"
              >
                <div class="flex flex-wrap items-end gap-2">
                  <span class="w-8 pb-2 text-sm font-bold text-gray-500">{{ index + 1 }}.</span>
                  <label
                    :for="`event-lineup-${item.key}`"
                    class="min-w-40 flex-1 text-sm font-medium"
                    >Artista<input
                      :id="`event-lineup-${item.key}`"
                      :value="item.name"
                      class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                      @input="changeArtistName(item, ($event.target as HTMLInputElement).value)"
                  /></label>
                  <button
                    type="button"
                    class="min-h-10 rounded-lg border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple"
                    @click="resolveArtist(item)"
                  >
                    Resolver existente
                  </button>
                  <button
                    type="button"
                    class="min-h-10 rounded-lg border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple"
                    :disabled="index === 0"
                    :aria-label="`Subir ${item.name || 'artista'}`"
                    @click="moveArtist(index, -1)"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="min-h-10 rounded-lg border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple"
                    :disabled="index === lineup.length - 1"
                    :aria-label="`Bajar ${item.name || 'artista'}`"
                    @click="moveArtist(index, 1)"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    class="min-h-10 rounded-lg border border-red-300 px-3 text-sm text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 dark:border-red-500/50 dark:text-red-300"
                    :aria-label="`Quitar ${item.name || 'artista'}`"
                    @click="removeArtist(index)"
                  >
                    Quitar
                  </button>
                </div>
                <div
                  v-if="item.candidates.length"
                  class="mt-2 flex flex-wrap gap-2"
                  aria-label="Artistas candidatos"
                >
                  <button
                    v-for="candidate in item.candidates"
                    :key="candidate.id"
                    type="button"
                    class="rounded-lg border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple"
                    @click="selectArtist(item, candidate.id)"
                  >
                    {{ candidate.name }}
                  </button>
                </div>
                <p
                  v-if="item.resolutionError"
                  class="mt-2 text-sm text-amber-800 dark:text-amber-200"
                  role="status"
                >
                  {{ item.resolutionError }}
                </p>
                <p
                  v-else-if="item.artistId"
                  class="mt-2 text-xs text-green-800 dark:text-green-300"
                >
                  Artista existente seleccionado
                </p>
              </li>
            </ol>
          </section>
          <div class="grid gap-4 sm:grid-cols-2">
            <label for="event-price" class="text-sm font-semibold"
              >Precio<input
                id="event-price"
                v-model="draft.price"
                class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white" /></label
            ><label for="event-other-info" class="text-sm font-semibold"
              >Información adicional<input
                id="event-other-info"
                v-model="draft.otherInfo"
                class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
            /></label>
          </div>
        </fieldset>
        <p
          v-if="formError || mutation.isError.value"
          class="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {{
            formError ||
            "El servidor rechazó la actualización. Revisa las fechas y asociaciones existentes."
          }}
        </p>
        <footer
          class="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4 dark:border-white/10"
        >
          <button
            type="button"
            class="min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:text-white"
            :disabled="busy"
            @click="requestClose"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="min-h-10 rounded-lg bg-rv-navy px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-200 dark:text-rv-navy"
            :disabled="!canSave"
          >
            {{ mutation.isPending.value ? "Guardando…" : "Guardar cambios" }}
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>
