<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import { getDiscSpotifyTracks, type DiscSpotifyTrack } from '@services/discs/discs';
import { checkSpelling as checkSpellingService, type LanguageToolMatch } from '@services/languagetool/languagetool';
import SwalService from '@services/swal/SwalService';

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

interface SpellMatch {
  id: string;
  offset: number;
  length: number;
  message: string;
  originalText: string;
  replacements: string[];
}

const quillEditorRef = ref<InstanceType<typeof QuillEditor> | null>(null);
const checkingSpelling = ref(false);
const spellMatches = ref<SpellMatch[]>([]);

// Resaltamos con formatText en source "silent" para que sea puramente visual:
// no dispara text-change, así que nunca llega a `description` (el v-model) ni
// se guarda por error si el usuario cierra el modal con avisos sin resolver.
function highlightMatch(match: SpellMatch) {
  const quill = quillEditorRef.value?.getQuill();
  if (!quill) return;
  quill.formatText(match.offset, match.length, 'background', '#fecaca', 'silent');
  quill.formatText(match.offset, match.length, 'color', '#7f1d1d', 'silent');
}

function clearHighlight(match: SpellMatch) {
  const quill = quillEditorRef.value?.getQuill();
  if (!quill) return;
  quill.formatText(match.offset, match.length, 'background', false, 'silent');
  quill.formatText(match.offset, match.length, 'color', false, 'silent');
}

async function checkSpelling() {
  const quill = quillEditorRef.value?.getQuill();
  if (!quill) return;

  checkingSpelling.value = true;
  spellMatches.value.forEach(clearHighlight);
  spellMatches.value = [];
  try {
    const text = quill.getText();
    const matches = await checkSpellingService(text, 'es');

    if (matches.length === 0) {
      SwalService.success('No se han encontrado errores');
      return;
    }

    spellMatches.value = matches.map((m: LanguageToolMatch, idx: number) => ({
      id: `${m.offset}-${idx}`,
      offset: m.offset,
      length: m.length,
      message: m.shortMessage || m.message,
      originalText: text.slice(m.offset, m.offset + m.length),
      replacements: m.replacements.slice(0, 3).map((r) => r.value),
    }));
    spellMatches.value.forEach(highlightMatch);
  } catch (e) {
    SwalService.error('No se pudo comprobar la ortografía');
  } finally {
    checkingSpelling.value = false;
  }
}

// Al aceptar una corrección individual, los offsets de los avisos
// posteriores (a la derecha) se desplazan según la diferencia de longitud
// entre el texto original y la sustitución.
function shiftOffsets(afterOffset: number, delta: number) {
  spellMatches.value.forEach((m) => {
    if (m.offset > afterOffset) m.offset += delta;
  });
}

function acceptSpellMatch(id: string) {
  const quill = quillEditorRef.value?.getQuill();
  const match = spellMatches.value.find((m) => m.id === id);
  if (!quill || !match || !match.replacements[0]) return;

  const replacement = match.replacements[0];
  clearHighlight(match);
  quill.deleteText(match.offset, match.length, 'user');
  quill.insertText(match.offset, replacement, 'user');
  shiftOffsets(match.offset, replacement.length - match.length);

  spellMatches.value = spellMatches.value.filter((m) => m.id !== id);
}

function ignoreSpellMatch(id: string) {
  const match = spellMatches.value.find((m) => m.id === id);
  if (!match) return;
  clearHighlight(match);
  spellMatches.value = spellMatches.value.filter((m) => m.id !== id);
}

function acceptAllSpellMatches() {
  const quill = quillEditorRef.value?.getQuill();
  if (!quill) return;

  // De derecha a izquierda: cada sustitución solo afecta a texto posterior
  // a su propio offset, así que los pendientes (a la izquierda) no se ven
  // afectados y no hace falta recalcular offsets en el bucle.
  const sorted = [...spellMatches.value].sort((a, b) => b.offset - a.offset);
  sorted.forEach((match) => {
    clearHighlight(match);
    if (match.replacements[0]) {
      quill.deleteText(match.offset, match.length, 'user');
      quill.insertText(match.offset, match.replacements[0], 'user');
    }
  });

  spellMatches.value = [];
}

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
  spellMatches.value = [];
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

onMounted(() => { document.body.style.overflow = 'hidden'; });
onUnmounted(() => { document.body.style.overflow = ''; });
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay">
      <div class="modal-content">
        <button @click="handleClose" :disabled="saving" class="modal-close">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1">Editar disco</h3>
        <p class="text-sm text-rv-pink mb-6">
          {{ asignation.disc.artist.name }} – {{ asignation.disc.name }}
        </p>

        <div class="space-y-5">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-sm text-rv-pink font-medium">Texto de reseña</label>
              <div class="flex items-center gap-3">
                <button type="button" @click="checkSpelling" :disabled="checkingSpelling"
                  class="text-xs font-semibold text-gray-700 dark:text-rv-pink transition-colors flex items-center gap-1.5 disabled:opacity-50 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg px-2.5 py-1">
                  <i class="fa-solid" :class="checkingSpelling ? 'fa-circle-notch fa-spin' : 'fa-spell-check'"></i>
                  {{ checkingSpelling ? 'Revisando...' : 'Corregir ortografía' }}
                </button>
                <button v-if="spellMatches.length" type="button" @click="acceptAllSpellMatches"
                  class="text-xs font-semibold text-green-400 hover:text-green-300 transition-colors flex items-center gap-1.5">
                  <i class="fa-solid fa-check-double"></i>
                  Aceptar todo ({{ spellMatches.length }})
                </button>
              </div>
            </div>
            <div class="quill-wrapper">
              <QuillEditor
                ref="quillEditorRef"
                v-model:content="description"
                content-type="html"
                theme="snow"
                :toolbar="toolbarOptions"
                placeholder="Escribe la reseña de este disco..."
              />
            </div>

            <div v-if="spellMatches.length" class="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
              <div v-for="match in spellMatches" :key="match.id"
                class="bg-black/30 border border-rv-pink/20 rounded-lg p-2.5 text-xs">
                <p class="text-gray-300 mb-1.5">{{ match.message }}</p>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-gray-500 truncate">
                    <span class="line-through text-red-400">{{ match.originalText }}</span>
                    <template v-if="match.replacements[0]">
                      → <span class="text-green-400 font-medium">{{ match.replacements[0] }}</span>
                    </template>
                  </span>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button v-if="match.replacements[0]" type="button" @click="acceptSpellMatch(match.id)"
                      class="px-2 py-1 rounded-md bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors" title="Aceptar corrección">
                      <i class="fa-solid fa-check"></i>
                    </button>
                    <button type="button" @click="ignoreSpellMatch(match.id)"
                      class="px-2 py-1 rounded-md bg-white/5 text-gray-400 hover:bg-white/10 transition-colors" title="Ignorar">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
              </div>
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

        <div class="flex justify-end gap-3 pt-4 mt-5 border-t border-gray-200 dark:border-white/10">
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
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

/* ── Modal content ── */
.modal-content {
  position: relative;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 56rem;
  max-height: 90vh;
  overflow-y: auto;
}

html.dark .modal-content {
  background: #2a2b3d;
  border-color: rgba(176, 102, 159, 0.3);
}

/* ── Close button ── */
.modal-close {
  position: absolute;
  right: 1rem;
  top: 1rem;
  color: #e46e8a;
  background: #e5e7eb;
  border-radius: 8px;
  transition: background-color 0.15s;
}

.modal-close:hover {
  background: #d1d5db;
}

html.dark .modal-close {
  background: rgba(255, 255, 255, 0.08);
}

html.dark .modal-close:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* ── Inputs ── */
.modal-input {
  width: 100%;
  padding: 0.625rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #111827;
  transition: border-color 0.2s;
}

.modal-input:focus {
  outline: none;
  border-color: #e46e8a;
}

.modal-input::placeholder {
  color: #9ca3af;
}

.modal-input option {
  background: #ffffff;
  color: #111827;
}

html.dark .modal-input {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(176, 102, 159, 0.3);
  color: #fff;
}

html.dark .modal-input::placeholder {
  color: #6b7280;
}

html.dark .modal-input option {
  background: #00021f;
  color: #fff;
}

/* ── Buttons ── */
.modal-btn-cancel {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: #e5e7eb;
  color: #374151;
  transition: background-color 0.15s;
}

.modal-btn-cancel:hover {
  background: #d1d5db;
}

html.dark .modal-btn-cancel {
  background: rgba(255, 255, 255, 0.08);
  color: #e46e8a;
}

html.dark .modal-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
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

/* ── Quill – light mode ── */
.quill-wrapper :deep(.ql-toolbar) {
  border: 1px solid #e5e7eb;
  border-radius: 8px 8px 0 0;
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
  border: 1px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 8px 8px;
  min-height: 200px;
  font-size: 0.95rem;
}

.quill-wrapper :deep(.ql-editor.ql-blank::before) {
  font-style: normal;
}

/* ── Quill – dark mode ── */
html.dark .quill-wrapper :deep(.ql-toolbar) {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(176, 102, 159, 0.3);
}

html.dark .quill-wrapper :deep(.ql-toolbar .ql-stroke) {
  stroke: #9ca3af;
}

html.dark .quill-wrapper :deep(.ql-toolbar .ql-fill) {
  fill: #9ca3af;
}

html.dark .quill-wrapper :deep(.ql-toolbar .ql-picker-label) {
  color: #9ca3af;
}

html.dark .quill-wrapper :deep(.ql-container) {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(176, 102, 159, 0.3);
  color: #fff;
}

html.dark .quill-wrapper :deep(.ql-editor.ql-blank::before) {
  color: #6b7280;
}

html.dark .quill-wrapper :deep(.ql-snow .ql-picker-options) {
  background: #2a2b3d;
  border-color: rgba(176, 102, 159, 0.3);
}

html.dark .quill-wrapper :deep(.ql-snow .ql-picker-item) {
  color: #d1d5db;
}

html.dark .quill-wrapper :deep(.ql-snow .ql-picker-item:hover) {
  color: #e46e8a;
}
</style>
