<!-- ReunionManager.vue -->
<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-rv-darkBg">
    <!-- Modal de creación -->
    <div v-if="showForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="toggleForm">
      <div class="bg-white dark:bg-rv-darkCard rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Crear Reunión</h2>
        <form @submit.prevent="createReunion" class="space-y-4">
          <div>
            <label for="title" class="block font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
            <input v-model="formData.title" type="text" id="title"
              class="w-full p-2 border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg"
              required />
          </div>
          <div>
            <label for="date" class="block font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
            <input v-model="formData.date" type="datetime-local" id="date"
              class="w-full p-2 border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg"
              required />
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" @click="toggleForm"
              class="px-4 py-2 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-lg font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit"
              class="px-4 py-2 bg-rv-purple text-white rounded-lg hover:bg-rv-pink transition-colors">
              Crear Reunión
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Contenido principal -->
    <div class="flex-1 overflow-y-auto p-4 md:p-6">
      <h1 class="text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-white"><i class="fa-solid fa-comments mr-2"></i>Reuniones</h1>
      <!-- Reuniones Actuales -->
      <div class="mb-8">
        <ReunionTable title="Reuniones Actuales" :reuniones="reunionesPresentes" @edit="openEditModal"
          @update="handleReunionUpdate" />
      </div>

      <!-- Reuniones Pasadas -->
      <div>
        <div
          class="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-rv-darkCard p-2 rounded-lg transition-colors"
          @click="showPastReunions = !showPastReunions">
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Reuniones Pasadas</h2>
            <i class="fa-solid fa-chevron-down text-gray-400 transition-transform duration-300"
              :class="{ 'rotate-180': showPastReunions }"></i>
          </div>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ reunionesPasadas.length }} reuniones</span>
        </div>

        <div v-show="showPastReunions">
          <div v-if="reunionesPasadas.length > 0">
            <!-- Selects de Año y Mes -->
            <div class="flex flex-col sm:flex-row gap-3 mb-4">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                <select v-model="selectedYear"
                  class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2">
                  <option :value="null">Selecciona un año</option>
                  <option v-for="ano in anosDisponibles" :key="ano" :value="ano">{{ ano }}</option>
                </select>
              </div>
              <div class="flex-1" v-if="selectedYear">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mes</label>
                <select v-model="selectedMonth"
                  class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2">
                  <option :value="null">Selecciona un mes</option>
                  <option v-for="mes in mesesDisponibles" :key="mes" :value="mes">{{ getNombreMes(mes) }}</option>
                </select>
              </div>
            </div>

            <!-- Reuniones del mes seleccionado -->
            <div v-if="selectedMonth !== null" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-for="reunion in reunionesFiltradas" :key="reunion.id"
                class="border border-gray-200 dark:border-white/10 rounded-lg p-4 bg-white dark:bg-rv-darkCard hover:shadow-lg cursor-pointer transition-all"
                @click="openEditModal(reunion.id)">
                <h4 class="font-bold text-gray-900 dark:text-white">{{ reunion.title }}</h4>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ formatDate(reunion.date) }}</p>
                <div v-if="reunion.points && reunion.points.length > 0" class="mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{{ reunion.points.length }} puntos</p>
                  <div class="flex gap-1">
                    <span v-for="point in reunion.points.slice(0, 5)" :key="point.id">
                      <i class="fa-solid fa-check text-green-500 text-xs" v-if="point.done"></i>
                      <i class="fa-regular fa-circle text-gray-300 dark:text-gray-600 text-xs" v-else></i>
                    </span>
                    <span v-if="reunion.points.length > 5" class="text-xs text-gray-400">+{{ reunion.points.length - 5 }}</span>
                  </div>
                </div>
                <button
                  class="w-full mt-3 px-3 py-2 bg-rv-purple text-white rounded-lg hover:bg-rv-pink text-sm flex items-center justify-center gap-2 transition-colors">
                  <i class="fa-solid fa-eye"></i>
                  <span>Ver Detalle</span>
                </button>
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
      @updated="handleReunionUpdated" />
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
    handleReunionUpdate(updatedReunion) {
      const index = this.reuniones.findIndex(r => r.id === updatedReunion.id);
      if (index !== -1) this.reuniones.splice(index, 1, updatedReunion);
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
