<!-- ReunionManager.vue -->
<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-rv-darkBg">
    <!-- Modal de creación -->
    <div v-if="showForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="toggleForm">
      <div class="bg-white dark:bg-rv-darkCard rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto">
  <!-- Header -->
  <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/10">
    <div class="flex items-center gap-2">
      <span class="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
        Reunión
      </span>
      <h2 class="text-base font-bold text-gray-900 dark:text-white">Nueva reunión</h2>
    </div>
    <button type="button" @click="toggleForm"
      class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-rv-darkSurface transition-all">
      <i class="fa-solid fa-xmark text-base"></i>
    </button>
  </div>
  <!-- Form body -->
  <form @submit.prevent="createReunion" class="px-5 py-4 space-y-4">
    <div>
      <label for="title" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Título</label>
      <input v-model="formData.title" type="text" id="title"
        class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30"
        required placeholder="Nombre de la reunión..." />
    </div>
    <div>
      <label for="date" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Fecha</label>
      <input v-model="formData.date" type="datetime-local" id="date"
        class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30"
        required />
    </div>
    <div class="flex justify-end gap-2 pt-1">
      <button type="button" @click="toggleForm"
        class="px-4 py-2 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-xl font-medium text-sm transition-colors">
        Cancelar
      </button>
      <button type="submit"
        class="px-4 py-2 bg-rv-purple hover:bg-rv-pink text-white rounded-xl font-semibold text-sm shadow-sm transition-all hover:-translate-y-0.5 transform">
        Crear reunión
      </button>
    </div>
  </form>
</div>
    </div>

    <!-- Contenido principal -->
    <div class="flex-1 overflow-y-auto p-4 md:p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          <i class="fa-solid fa-comments mr-2"></i>Reuniones
        </h1>
        <button @click="toggleForm"
          class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rv-purple to-rv-pink text-white rounded-xl font-semibold text-sm shadow-sm hover:opacity-90 transition-all hover:-translate-y-0.5 transform">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Nueva reunión</span>
        </button>
      </div>
      <!-- Reuniones Actuales -->
      <div class="mb-8">
        <ReunionTable title="Reuniones Actuales" :reuniones="reunionesPresentes" @edit="openEditModal"
          @update="handleReunionUpdate" @delete="handleReunionDelete" />
      </div>

      <!-- Reuniones Pasadas -->
      <div>
        <div class="flex items-center justify-between mb-4 cursor-pointer select-none px-4 py-3 rounded-2xl bg-white dark:bg-rv-darkCard border border-gray-100 dark:border-white/10 hover:shadow-sm transition-all"
  @click="showPastReunions = !showPastReunions">
  <div class="flex items-center gap-3">
    <div class="w-8 h-8 rounded-xl bg-gray-100 dark:bg-rv-darkSurface flex items-center justify-center">
      <i class="fa-solid fa-clock-rotate-left text-gray-500 dark:text-gray-400 text-sm"></i>
    </div>
    <h2 class="text-lg font-bold text-gray-900 dark:text-white">Reuniones Pasadas</h2>
    <i class="fa-solid fa-chevron-down text-gray-400 text-xs transition-transform duration-300"
      :class="{ 'rotate-180': showPastReunions }"></i>
  </div>
  <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-rv-darkSurface text-gray-500 dark:text-gray-400">{{ reunionesPasadas.length }}</span>
</div>

        <div v-show="showPastReunions">
          <div v-if="reunionesPasadas.length > 0">
            <!-- Selects de Año y Mes -->
            <div class="flex flex-col sm:flex-row gap-3 mb-4">
  <div class="flex-1">
    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Año</label>
    <select v-model="selectedYear"
      class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30">
      <option :value="null">Selecciona un año</option>
      <option v-for="ano in anosDisponibles" :key="ano" :value="ano">{{ ano }}</option>
    </select>
  </div>
  <div class="flex-1" v-if="selectedYear">
    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Mes</label>
    <select v-model="selectedMonth"
      class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30">
      <option :value="null">Selecciona un mes</option>
      <option v-for="mes in mesesDisponibles" :key="mes" :value="mes">{{ getNombreMes(mes) }}</option>
    </select>
  </div>
</div>

            <!-- Reuniones del mes seleccionado -->
            <div v-if="selectedMonth !== null" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-for="reunion in reunionesFiltradas" :key="reunion.id"
  class="bg-white dark:bg-rv-darkCard border border-gray-100 dark:border-white/10 rounded-2xl p-4 hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5 group"
  @click="openEditModal(reunion.id)">
  <div class="flex items-start justify-between gap-2 mb-2">
    <h4 class="font-bold text-gray-900 dark:text-white text-sm leading-snug">{{ reunion.title }}</h4>
    <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-gray-300 dark:text-gray-600 group-hover:text-rv-purple transition-colors shrink-0 mt-0.5"></i>
  </div>
  <p class="text-xs text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-1.5">
    <i class="fa-regular fa-calendar text-[10px]"></i>
    {{ formatDate(reunion.date) }}
  </p>
  <div v-if="reunion.points && reunion.points.length > 0" class="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-white/5">
    <span class="text-xs text-gray-400">{{ reunion.points.filter(p => p.done).length }}/{{ reunion.points.length }} completados</span>
    <div class="flex gap-0.5">
      <span v-for="point in reunion.points.slice(0, 6)" :key="point.id"
        class="w-2 h-2 rounded-full"
        :class="point.done ? 'bg-green-400' : 'bg-gray-200 dark:bg-white/15'"></span>
      <span v-if="reunion.points.length > 6" class="text-[9px] text-gray-400 ml-1">+{{ reunion.points.length - 6 }}</span>
    </div>
  </div>
  <div v-else class="pt-2 border-t border-gray-50 dark:border-white/5">
    <span class="text-xs text-gray-300 dark:text-gray-600">Sin puntos</span>
  </div>
</div>
            </div>

            <div v-else-if="selectedYear" class="text-center py-8 text-gray-400 dark:text-gray-500">
              <i class="fa-solid fa-calendar-xmark text-4xl mb-2"></i>
              <p>Selecciona un mes para ver las reuniones</p>
            </div>
            <div v-else class="text-center py-8 text-gray-400 dark:text-gray-500">
              <i class="fa-solid fa-calendar text-4xl mb-2"></i>
              <p>Selecciona un año para comenzar</p>
            </div>
          </div>

          <div v-else class="text-center py-12 text-gray-400 dark:text-gray-500">
            <i class="fa-solid fa-inbox text-4xl mb-2"></i>
            <p>No hay reuniones pasadas</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de edición -->
    <ReunionEditModal :show="showEditModal" :reunionId="selectedReunionId" @close="closeEditModal"
      @updated="handleReunionUpdated" @deleted="handleReunionDeletedFromModal" />
  </div>
</template>

<script>
import ReunionTable from "./components/ReunionTable.vue";
import ReunionEditModal from "./components/ReunionEditModal.vue";
import { postReunion, getReunions } from "@services/reunions/reunions";
import SwalService from "@services/swal/SwalService";

export default {
  components: { ReunionTable, ReunionEditModal },
  data() {
    return {
      showForm: false,
      showEditModal: false,
      selectedReunionId: null,
      formData: { title: "", date: "" },
      reuniones: [],
      selectedYear: null,
      selectedMonth: null,
      showPastReunions: false,
    };
  },
  computed: {
    reunionesPresentes() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return this.reuniones.filter((r) => {
        const fechaReunion = new Date(r.date);
        fechaReunion.setHours(0, 0, 0, 0);
        return fechaReunion >= hoy;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    reunionesPasadas() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return this.reuniones.filter((r) => {
        const fechaReunion = new Date(r.date);
        fechaReunion.setHours(0, 0, 0, 0);
        return fechaReunion < hoy;
      }).sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    anosDisponibles() {
      const anos = new Set();
      this.reunionesPasadas.forEach(r => anos.add(new Date(r.date).getFullYear()));
      return Array.from(anos).sort((a, b) => b - a);
    },
    mesesDisponibles() {
      if (!this.selectedYear) return [];
      const meses = new Set();
      this.reunionesPasadas.forEach(r => {
        const fecha = new Date(r.date);
        if (fecha.getFullYear() === this.selectedYear) meses.add(fecha.getMonth());
      });
      return Array.from(meses).sort((a, b) => b - a);
    },
    reunionesFiltradas() {
      if (this.selectedYear === null || this.selectedMonth === null) return [];
      return this.reunionesPasadas.filter(r => {
        const fecha = new Date(r.date);
        return fecha.getFullYear() === this.selectedYear && fecha.getMonth() === this.selectedMonth;
      });
    }
  },
  methods: {
    formatDate(dateString) {
      return new Date(dateString).toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    },
    getNombreMes(mesIndex) {
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      return meses[mesIndex];
    },
    openEditModal(id) {
      this.selectedReunionId = id;
      this.showEditModal = true;
    },
    closeEditModal() {
      this.showEditModal = false;
      this.selectedReunionId = null;
    },
    handleReunionUpdated() { this.fetchReuniones(); },
    handleReunionDeletedFromModal(reunionId) {
      this.reuniones = this.reuniones.filter(r => r.id !== reunionId);
      this.closeEditModal();
    },
    handleReunionUpdate(updatedReunion) {
      const index = this.reuniones.findIndex(r => r.id === updatedReunion.id);
      if (index !== -1) this.reuniones.splice(index, 1, updatedReunion);
    },
    handleReunionDelete(reunionId) {
      this.reuniones = this.reuniones.filter(r => r.id !== reunionId);
    },
    toggleForm() { this.showForm = !this.showForm; },
    async createReunion() {
      try {
        await postReunion({ title: this.formData.title, date: this.formData.date });
        this.formData = { title: "", date: "" };
        this.toggleForm();
        SwalService.success("Reunión creada con éxito.");
        this.fetchReuniones();
      } catch (error) {
        SwalService.error("No se pudo crear la reunión.");
      }
    },
    async fetchReuniones() {
      try {
        this.reuniones = await getReunions();
        if (this.anosDisponibles.length > 0 && !this.selectedYear) {
          this.selectedYear = this.anosDisponibles[0];
        }
      } catch (error) {
        SwalService.error("No se pudieron obtener las reuniones.");
      }
    },
  },
  watch: {
    selectedYear() {
      this.selectedMonth = null;
      if (this.mesesDisponibles.length > 0) this.selectedMonth = this.mesesDisponibles[0];
    }
  },
  mounted() { this.fetchReuniones(); }
};
</script>
