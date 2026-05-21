// ReunionTable.vue
<template>
  <div>
    <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">{{ title }}</h2>
    <div class="space-y-4">
      <div v-for="reunion in reuniones" :key="reunion.id"
        class="border border-gray-100 dark:border-white/10 rounded-2xl p-4 bg-white dark:bg-rv-darkCard shadow-sm hover:shadow-md transition-shadow">
        <!-- Header de la tarjeta -->
        <div class="flex justify-between items-center mb-3 cursor-pointer" @click="toggleReunion(reunion.id)">
          <div class="flex items-baseline gap-3 min-w-0">
            <i class="fa-solid fa-chevron-down transition-transform duration-300 text-gray-400 shrink-0"
              :class="{ 'rotate-180': !isReunionCollapsed(reunion.id) }"></i>
            <strong class="text-lg text-gray-900 dark:text-white truncate">{{ reunion.title }}</strong>
            <p class="text-sm text-gray-600 dark:text-gray-400 shrink-0">{{ formatDate(reunion.date) }}</p>
          </div>
          <div class="flex gap-2 shrink-0 ml-2">
            <button @click.stop="openAddPointModal(reunion.id)"
              class="px-3 py-1.5 bg-rv-purple/10 text-rv-purple hover:bg-rv-purple hover:text-white rounded-xl text-sm flex items-center gap-1 sm:gap-2 transition-all font-semibold"
              title="Añadir punto">
              <i class="fa-solid fa-plus"></i>
              <span class="hidden sm:inline">Añadir</span>
            </button>
            <button @click.stop="reloadReunion(reunion.id)"
              class="px-3 py-1.5 bg-gray-100 dark:bg-rv-darkSurface text-gray-500 dark:text-gray-400 hover:bg-rv-purple/10 hover:text-rv-purple rounded-xl text-sm flex items-center gap-1 sm:gap-2 transition-all font-semibold"
              title="Recargar">
              <i class="fa-solid fa-rotate-right"></i>
              <span class="hidden sm:inline">Recargar</span>
            </button>
            <button @click.stop="confirmDeleteReunion(reunion)"
              class="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-sm flex items-center gap-1 sm:gap-2 transition-all font-semibold"
              title="Eliminar reunión">
              <i class="fa-regular fa-trash-can"></i>
              <span class="hidden sm:inline">Borrar</span>
            </button>
          </div>
        </div>

        <!-- Lista de puntos -->
        <div v-show="!isReunionCollapsed(reunion.id)" class="space-y-2">
          <div v-for="point in reunion.points" :key="point.id"
            class="rounded-xl px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-rv-darkSurface"
            :class="point.done ? 'opacity-60' : ''">
            <div class="flex items-start gap-2">
              <!-- Checkbox de completado -->
              <input type="checkbox" :checked="point.done" @change="togglePointDone(reunion.id, point)"
                class="mt-1 rounded cursor-pointer shrink-0" title="Marcar como completado" />

              <!-- Título (expandible) -->
              <div class="flex-1 cursor-pointer min-w-0" @click="togglePoint(point.id)">
                <p class="text-sm font-medium text-gray-900 dark:text-white" :class="point.done ? 'line-through text-gray-400 dark:text-gray-500' : ''">{{ point.titulo }}</p>
              </div>

              <!-- Botones de acción -->
              <button @click.stop="openEditPointModal(reunion.id, point)"
                class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-rv-darkSurface text-gray-400 hover:bg-rv-purple/10 hover:text-rv-purple transition-colors shrink-0"
                title="Editar punto">
                <i class="fa-solid fa-edit"></i>
              </button>
              <button @click.stop="confirmDeletePoint(reunion.id, point)"
                class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-rv-darkSurface text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors shrink-0"
                title="Eliminar punto">
                <i class="fa-solid fa-trash"></i>
              </button>

              <!-- Icono expandir/contraer -->
              <i class="fa-solid text-gray-400 text-xs mt-1 cursor-pointer shrink-0"
                :class="expandedPoint === point.id ? 'fa-chevron-up' : 'fa-chevron-down'"
                @click="togglePoint(point.id)"></i>
            </div>

            <!-- Contenido expandido -->
            <div v-if="expandedPoint === point.id" class="mt-2 pt-2 border-t border-gray-200 dark:border-white/10 ml-6">
              <p v-html="formatContent(point.content)" class="text-xs text-gray-700 dark:text-gray-300"></p>
            </div>
          </div>

          <div v-if="!reunion.points || reunion.points.length === 0" class="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
            No hay puntos
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para añadir/editar punto -->
    <div v-if="showPointModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closePointModal">
      <div class="bg-white dark:bg-rv-darkCard rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto">
  <!-- Header -->
  <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/10">
    <h3 class="text-base font-bold text-gray-900 dark:text-white">
      {{ editingPoint ? 'Editar punto' : 'Añadir punto' }}
    </h3>
    <button type="button" @click="closePointModal"
      class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-rv-darkSurface transition-all">
      <i class="fa-solid fa-xmark text-base"></i>
    </button>
  </div>
  <!-- Form body -->
  <form @submit.prevent="savePoint" class="px-5 py-4 space-y-4">
    <div>
      <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Título</label>
      <input v-model="pointForm.titulo" type="text"
        class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30"
        required placeholder="Título del punto..." />
    </div>
    <div>
      <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Contenido</label>
      <textarea v-model="pointForm.content" rows="4"
        class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30 resize-none"
        placeholder="Descripción o notas..."></textarea>
    </div>
    <div class="flex items-center gap-3 bg-gray-50 dark:bg-rv-darkSurface rounded-xl px-3 py-2.5">
      <input v-model="pointForm.done" type="checkbox" id="pointDone"
        class="w-4 h-4 rounded accent-rv-purple cursor-pointer" />
      <label for="pointDone" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Marcar como completado</label>
    </div>
    <div class="flex justify-end gap-2 pt-1">
      <button type="button" @click="closePointModal"
        class="px-4 py-2 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-xl font-medium text-sm transition-colors">
        Cancelar
      </button>
      <button type="submit"
        class="px-4 py-2 bg-rv-purple hover:bg-rv-pink text-white rounded-xl font-semibold text-sm shadow-sm transition-all hover:-translate-y-0.5 transform">
        {{ editingPoint ? 'Guardar cambios' : 'Añadir punto' }}
      </button>
    </div>
  </form>
</div>
    </div>
  </div>
</template>

<script>
import { getReunionDetails, deleteReunion } from '@services/reunions/reunions';
import { deletePoint, postPoint, updatePoint } from '@services/points/point';
import SwalService from '@services/swal/SwalService';

export default {
  props: {
    title: String,
    reuniones: Array,
  },
  data() {
    return {
      expandedPoint: null,
      showPointModal: false,
      editingPoint: null,
      currentReunionId: null,
      pointForm: {
        titulo: '',
        content: '',
        done: false,
      },
      collapsedReunions: {},
    };
  },
  watch: {
    reuniones: {
      handler(newVal) {
        this.initializeCollapsedState();
      },
      deep: true,
      immediate: true
    }
  },
  methods: {
    initializeCollapsedState() {
      if (!this.reuniones || this.reuniones.length === 0) return;
      this.collapsedReunions = {};
      this.reuniones.forEach((reunion, index) => {
        this.collapsedReunions[reunion.id] = index !== 0;
      });
    },
    toggleReunion(reunionId) {
      this.collapsedReunions[reunionId] = !this.collapsedReunions[reunionId];
    },
    isReunionCollapsed(reunionId) {
      return this.collapsedReunions[reunionId] === undefined ? true : this.collapsedReunions[reunionId];
    },
    togglePoint(pointId) {
      this.expandedPoint = this.expandedPoint === pointId ? null : pointId;
    },
    async togglePointDone(reunionId, point) {
      try {
        await updatePoint(point.id, { done: !point.done });
        point.done = !point.done;
        SwalService.success('Estado actualizado');
      } catch (error) {
        SwalService.error('No se pudo actualizar el estado');
      }
    },
    formatDate(date) {
      return new Date(date).toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    },
    formatContent(text) {
      return text ? text.replace(/\n/g, "<br>") : '';
    },
    async reloadReunion(reunionId) {
      try {
        const updatedReunion = await getReunionDetails(reunionId);
        this.$emit('update', updatedReunion);
        SwalService.success('Reunión actualizada');
      } catch (error) {
        SwalService.error('No se pudo recargar la reunión');
      }
    },
    openAddPointModal(reunionId) {
      this.currentReunionId = reunionId;
      this.editingPoint = null;
      this.pointForm = { titulo: '', content: '', done: false };
      this.showPointModal = true;
    },
    openEditPointModal(reunionId, point) {
      this.currentReunionId = reunionId;
      this.editingPoint = point;
      this.pointForm = { titulo: point.titulo, content: point.content, done: point.done };
      this.showPointModal = true;
    },
    closePointModal() {
      this.showPointModal = false;
      this.editingPoint = null;
      this.currentReunionId = null;
      this.pointForm = { titulo: '', content: '', done: false };
    },
    async savePoint() {
      try {
        if (this.editingPoint) {
          await updatePoint(this.editingPoint.id, this.pointForm);
          SwalService.success('Punto actualizado');
        } else {
          await postPoint({
            titulo: this.pointForm.titulo,
            content: this.pointForm.content,
            reunionId: this.currentReunionId
          });
          SwalService.success('Punto añadido');
        }
        await this.reloadReunion(this.currentReunionId);
        this.closePointModal();
      } catch (error) {
        SwalService.error('No se pudo guardar el punto');
      }
    },
    async confirmDeleteReunion(reunion) {
      const result = await SwalService.confirm(
        '¿Eliminar reunión?',
        `Vas a eliminar "${reunion.title}" y todos sus puntos. Esta acción no se puede deshacer.`,
        'Sí, eliminar', 'Cancelar'
      );
      if (result.isConfirmed) {
        try {
          await deleteReunion(reunion.id);
          this.$emit('delete', reunion.id);
          SwalService.success('Reunión eliminada');
        } catch (error) {
          SwalService.error('No se pudo eliminar la reunión');
        }
      }
    },
    async confirmDeletePoint(reunionId, point) {
      const result = await SwalService.confirm(
        '¿Eliminar punto?',
        `¿Estás seguro de que quieres eliminar "${point.titulo}"?`
      );
      if (result.isConfirmed) {
        try {
          await deletePoint(point.id);
          SwalService.success('Punto eliminado');
          await this.reloadReunion(reunionId);
        } catch (error) {
          SwalService.error('No se pudo eliminar el punto');
        }
      }
    },
  },
};
</script>
