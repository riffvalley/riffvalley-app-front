<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content modal-xl">
        <button @click="$emit('close')" class="modal-close">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 class="text-xl font-bold text-white mb-6">
          {{ isEditing ? 'Editar Noticia' : 'Crear Noticia' }}
        </h3>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Título -->
          <div>
            <label class="block text-sm text-rv-pink mb-1.5 font-medium">Título</label>
            <input
              v-model="form.title"
              type="text"
              maxlength="200"
              placeholder="Título de la noticia"
              class="modal-input"
              required
            />
            <span class="text-xs text-gray-500 mt-1 block">{{ form.title.length }}/200</span>
          </div>

          <!-- Body WYSIWYG -->
          <div>
            <label class="block text-sm text-rv-pink mb-1.5 font-medium">Contenido</label>
            <div class="quill-wrapper">
              <QuillEditor
                ref="quillRef"
                v-model:content="form.body"
                content-type="html"
                theme="snow"
                :toolbar="toolbarOptions"
                placeholder="Escribe el contenido de la noticia..."
                @ready="onEditorReady"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- Tipo -->
            <div>
              <label class="block text-sm text-rv-pink mb-1.5 font-medium">Tipo</label>
              <select v-model="form.type" class="modal-input" required>
                <option v-for="t in NEWS_TYPES" :key="t.value" :value="t.value">
                  {{ t.label }}
                </option>
              </select>
            </div>

            <!-- Fecha de publicación -->
            <div>
              <label class="block text-sm text-rv-pink mb-1.5 font-medium">Fecha de publicación</label>
              <VueDatePicker
                v-model="form.publishDate"
                :enable-time-picker="false"
                auto-apply
                dark
                placeholder="Seleccionar fecha"
                format="dd/MM/yyyy"
              />
            </div>

            <!-- Estado -->
            <div>
              <label class="block text-sm text-rv-pink mb-1.5 font-medium">Estado</label>
              <select v-model="form.status" class="modal-input">
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" @click="$emit('close')" class="modal-btn-cancel">
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="submitting || !form.title.trim()"
              class="modal-btn-primary"
            >
              {{ submitting ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear noticia') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import Swal from 'sweetalert2';
import { NEWS_TYPES } from '@services/news/news';
import type { News, NewsStatus, NewsType } from '@services/news/news';

const INTERNAL_ROUTES = [
  { path: '/', label: 'Inicio' },
  { path: '/disc-list', label: 'Discos' },
  { path: '/statistics', label: 'Estadísticas' },
  { path: '/calendar', label: 'Calendario' },
  { path: '/import', label: 'Importar' },
  { path: '/petitions', label: 'Peticiones' },
  { path: '/articles', label: 'Artículos' },
  { path: '/recap', label: 'Resumen semanal' },
  { path: '/videos', label: 'Vídeos' },
  { path: '/spotify/festivales', label: 'Spotify - Festivales' },
  { path: '/spotify/generos', label: 'Spotify - Géneros' },
  { path: '/patch-notes', label: 'Notas de versión' },
  { path: '/how-to-use', label: 'Cómo usar' },
];

const props = defineProps<{
  news?: News | null;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  close: [];
  submit: [form: { title: string; body: string; type: NewsType; publishDate: string | null; status: NewsStatus }];
}>();

const form = reactive({
  title: '',
  body: '',
  type: 'new_feature' as NewsType,
  publishDate: null as Date | null,
  status: 'draft' as NewsStatus,
});

const submitting = ref(false);
const quillRef = ref<InstanceType<typeof QuillEditor> | null>(null);
let quillInstance: any = null;

const toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ header: [1, 2, 3, false] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image'],
  ['clean'],
];

function onEditorReady(quill: any) {
  quillInstance = quill;

  // Añadir botón custom "Enlace interno" al toolbar
  const toolbar = quill.getModule('toolbar');
  const toolbarEl = toolbar.container as HTMLElement;

  // Crear grupo de botón
  const btnGroup = document.createElement('span');
  btnGroup.classList.add('ql-formats');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = 'Enlace interno';
  btn.innerHTML = '<svg viewBox="0 0 18 18" style="width:18px;height:18px"><path fill="currentColor" d="M10 2a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0V9H5a1 1 0 110-2h4V3a1 1 0 011-1z"/><rect x="1" y="14" width="16" height="2" rx="1" fill="currentColor" opacity="0.4"/></svg>';
  btn.classList.add('ql-internalLink');
  btn.addEventListener('click', handleInternalLink);

  btnGroup.appendChild(btn);
  toolbarEl.appendChild(btnGroup);
}

async function handleInternalLink() {
  if (!quillInstance) return;

  const routeOptionsHtml = INTERNAL_ROUTES
    .map(r => `<option value="${r.path}">${r.label} (${r.path})</option>`)
    .join('');

  const { value: formValues } = await Swal.fire({
    title: 'Enlace interno',
    html: `
      <div style="text-align:left;margin-bottom:12px">
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:#ccc">Ruta</label>
        <select id="swal-route" class="swal2-select" style="width:100%;padding:8px;border-radius:6px;border:1px solid #555;background:#1a1a2e;color:#fff">
          ${routeOptionsHtml}
        </select>
      </div>
      <div style="text-align:left">
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:#ccc">Texto del enlace</label>
        <input id="swal-text" class="swal2-input" placeholder="Ej: Ver estadísticas" style="margin:0;width:100%;box-sizing:border-box">
      </div>
    `,
    background: '#00021f',
    color: '#fff',
    confirmButtonText: 'Insertar',
    confirmButtonColor: '#0064d6',
    showCancelButton: true,
    cancelButtonText: 'Cancelar',
    focusConfirm: false,
    preConfirm: () => {
      const route = (document.getElementById('swal-route') as HTMLSelectElement).value;
      const text = (document.getElementById('swal-text') as HTMLInputElement).value.trim();
      if (!text) {
        Swal.showValidationMessage('Escribe un texto para el enlace');
        return false;
      }
      return { route, text };
    },
  });

  if (formValues) {
    const range = quillInstance.getSelection(true);
    quillInstance.insertText(range.index, formValues.text, 'link', formValues.route, 'user');
    quillInstance.setSelection(range.index + formValues.text.length);
  }
}

// Inicializar form cuando se edita
watch(
  () => props.news,
  (news) => {
    if (news) {
      form.title = news.title;
      form.body = news.body || '';
      form.type = news.type || 'new_feature';
      form.publishDate = news.publishDate ? new Date(news.publishDate) : null;
      form.status = news.status;
    }
  },
  { immediate: true }
);

function handleSubmit() {
  if (!form.title.trim()) return;
  submitting.value = true;

  emit('submit', {
    title: form.title.trim(),
    body: form.body,
    type: form.type,
    publishDate: form.publishDate ? new Date(form.publishDate).toISOString() : null,
    status: form.status,
  });
}

defineExpose({ resetSubmitting: () => { submitting.value = false; } });
</script>

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
  max-height: 90vh;
  overflow-y: auto;
}

.modal-xl {
  max-width: 56rem;
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

/* Botón custom "Enlace interno" */
.quill-wrapper :deep(.ql-internalLink) {
  width: auto !important;
  padding: 0 6px !important;
  color: #0064d6 !important;
  font-size: 11px;
  font-weight: 600;
}

.quill-wrapper :deep(.ql-internalLink:hover) {
  color: #e46e8a !important;
}

.quill-wrapper :deep(.ql-internalLink svg) {
  stroke: none;
  fill: currentColor;
}
</style>
