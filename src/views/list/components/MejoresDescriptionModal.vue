<script setup lang="ts">
import { ref, watch } from 'vue';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import { getDiscSpotifyTracks, type DiscSpotifyTrack } from '@services/discs/discs';

const props = defineProps<{
  asignation: any; // debe traer .disc.id, .disc.artist.name, .disc.name, .description, .similarBands, .spotifyTrackId
  saving?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  submit: [payload: { description: string; similarBands: string; spotifyTrackId: string }];
}>();

const description = ref(props.asignation.description || '');
const similarBands = ref(props.asignation.similarBands || '');
const spotifyTrackId = ref(props.asignation.spotifyTrackId || '');
const tracks = ref<DiscSpotifyTrack[]>([]);
const loadingTracks = ref(false);

async function loadTracks() {
  loadingTracks.value = true;
  try {
    tracks.value = await getDiscSpotifyTracks(props.asignation.disc.id);
  } catch (e) {
    tracks.value = [];
  } finally {
    loadingTracks.value = false;
  }
}

// Por si el modal se reutiliza sin desmontar entre discos, forzamos
// recarga de los campos cada vez que cambia el disco que se está editando.
watch(() => props.asignation.id, () => {
  description.value = props.asignation.description || '';
  similarBands.value = props.asignation.similarBands || '';
  spotifyTrackId.value = props.asignation.spotifyTrackId || '';
  loadTracks();
}, { immediate: true });

const toolbarOptions = [
  ['bold', 'italic'],
  ['link'],
];

function handleSubmit() {
  emit('submit', {
    description: description.value,
    similarBands: similarBands.value,
    spotifyTrackId: spotifyTrackId.value,
  });
}

// El padre controla `saving` mientras dura la llamada al backend, así el
// botón se queda deshabilitado el tiempo real que tarde el guardado (no
// el instante en que se emite el evento).
function handleClose() {
  if (props.saving) return;
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="handleClose">
      <div class="modal-content">
        <button @click="handleClose" :disabled="saving" class="modal-close">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 class="text-xl font-bold text-white mb-1">Editar disco</h3>
        <p class="text-sm text-rv-pink mb-6">
          {{ asignation.disc.artist.name }} – {{ asignation.disc.name }}
        </p>

        <div class="space-y-5">
          <div>
            <label class="block text-sm text-rv-pink mb-1.5 font-medium">Texto de reseña</label>
            <div class="quill-wrapper">
              <QuillEditor
                v-model:content="description"
                content-type="html"
                theme="snow"
                :toolbar="toolbarOptions"
                placeholder="Escribe la reseña de este disco..."
              />
            </div>
          </div>

          <div>
            <label class="block text-sm text-rv-pink mb-1.5 font-medium">Bandas similares</label>
            <input
              v-model="similarBands"
              type="text"
              placeholder="Ej: Opeth, Katatonia, Ne Obliviscaris"
              class="modal-input"
            />
          </div>

          <div>
            <label class="block text-sm text-rv-pink mb-1.5 font-medium">Canción destacada</label>
            <div v-if="loadingTracks" class="modal-input flex items-center gap-2 text-gray-400">
              <i class="fa-solid fa-circle-notch fa-spin"></i>
              <span>Cargando canciones...</span>
            </div>
            <select v-else v-model="spotifyTrackId" class="modal-input">
              <option value="">Automática (por defecto)</option>
              <option v-for="track in tracks" :key="track.id" :value="track.id">
                {{ track.trackNumber }}. {{ track.name }}
              </option>
            </select>
            <p v-if="!loadingTracks && tracks.length === 0" class="text-xs text-gray-500 mt-1">
              No se encontró el álbum en Spotify.
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 mt-5 border-t border-white/10">
          <button type="button" @click="handleClose" :disabled="saving" class="modal-btn-cancel">Cancelar</button>
          <button @click="handleSubmit" :disabled="saving" class="modal-btn-primary">
            {{ saving ? 'Guardando... (puede tardar unos segundos)' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.modal-content {
  position: relative;
  background: #00021f;
  border: 1px solid rgba(176, 102, 159, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 56rem;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-close {
  position: absolute;
  right: 1rem;
  top: 1rem;
  color: #e46e8a;
  transition: opacity 0.2s;
}

.modal-close:hover {
  opacity: 0.7;
}

.modal-input {
  width: 100%;
  padding: 0.625rem 1rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(176, 102, 159, 0.3);
  border-radius: 8px;
  color: #fff;
  transition: border-color 0.2s;
}

.modal-input:focus {
  outline: none;
  border-color: #e46e8a;
}

.modal-input::placeholder {
  color: #6b7280;
}

.modal-input option {
  background: #00021f;
  color: #fff;
}

.modal-btn-cancel {
  padding: 0.5rem 1rem;
  color: #e46e8a;
  transition: opacity 0.2s;
}

.modal-btn-cancel:hover {
  opacity: 0.7;
}

.modal-btn-primary {
  padding: 0.5rem 1.25rem;
  background: #e46e8a;
  color: #fff;
  font-weight: 500;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.modal-btn-primary:hover {
  background: #b0669f;
}

.modal-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Quill editor theming */
.quill-wrapper :deep(.ql-toolbar) {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(176, 102, 159, 0.3);
  border-radius: 8px 8px 0 0;
}

.quill-wrapper :deep(.ql-toolbar .ql-stroke) {
  stroke: #9ca3af;
}

.quill-wrapper :deep(.ql-toolbar .ql-fill) {
  fill: #9ca3af;
}

.quill-wrapper :deep(.ql-toolbar .ql-picker-label) {
  color: #9ca3af;
}

.quill-wrapper :deep(.ql-toolbar button:hover .ql-stroke),
.quill-wrapper :deep(.ql-toolbar button.ql-active .ql-stroke) {
  stroke: #e46e8a;
}

.quill-wrapper :deep(.ql-toolbar button:hover .ql-fill),
.quill-wrapper :deep(.ql-toolbar button.ql-active .ql-fill) {
  fill: #e46e8a;
}

.quill-wrapper :deep(.ql-container) {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(176, 102, 159, 0.3);
  border-top: none;
  border-radius: 0 0 8px 8px;
  color: #fff;
  min-height: 200px;
  font-size: 0.95rem;
}

.quill-wrapper :deep(.ql-editor.ql-blank::before) {
  color: #6b7280;
  font-style: normal;
}

.quill-wrapper :deep(.ql-snow .ql-picker-options) {
  background: #00021f;
  border-color: rgba(176, 102, 159, 0.3);
}

.quill-wrapper :deep(.ql-snow .ql-picker-item) {
  color: #d1d5db;
}

.quill-wrapper :deep(.ql-snow .ql-picker-item:hover) {
  color: #e46e8a;
}
</style>
