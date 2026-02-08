<template>
  <div class="p-6 bg-gray-100 min-h-screen grid grid-cols-1 gap-6 items-start" v-if="!loading">
    <!-- Formulario de edición -->
    <div class="bg-white p-4 rounded-2xl shadow-md">
      <h3 class="text-lg font-bold mb-4">Info de la Lista</h3>
      <form @submit.prevent="submitForm" class="grid grid-cols-2 items-center gap-4">
        <!-- Compact Name -->
        <div class="flex items-center space-x-2" :class="{ 'col-span-2': form.type === ListType.SPECIAL }">
          <label for="name" class="text-sm font-medium text-gray-700 w-20">Name:</label>
          <div class="flex flex-grow gap-2">
            <input id="name" v-model="form.name" type="text"
              class="flex-grow rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter list name" required />
            <select v-if="form.type === ListType.SPECIAL" v-model="form.specialType"
              class="rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm">
              <option disabled value="">Tipo</option>
              <option value="web">Web</option>
              <option value="app">App</option>
              <option value="noticias">Noticias</option>
              <option value="videos">Videos</option>
              <option value="riffValley">Riff Valley</option>
              <option value="otros">Otros</option>
            </select>
            <button v-if="form.type === ListType.SPECIAL" type="submit"
              class="bg-indigo-600 text-white text-sm px-4 rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500">
              Guardar
            </button>
          </div>
        </div>

        <template v-if="form.type !== ListType.SPECIAL">
          <!-- Compact Type -->
          <div class="flex items-center space-x-2">
            <label for="type" class="text-sm font-medium text-gray-700 w-20">Type:</label>
            <select id="type" v-model="form.type"
              class="mt-1 flex-grow rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required>
              <option disabled value="">Select a type</option>
              <option :value="ListType.MONTH">Month</option>
              <option :value="ListType.WEEK">Week</option>
              <option :value="ListType.SPECIAL">Special</option>
            </select>
          </div>

          <!-- Dates -->
          <div class="flex items-center space-x-2">
            <label for="listDate" class="text-sm font-medium text-gray-700 w-20">List Date:</label>
            <input id="listDate" v-model="form.listDate" type="date"
              class="mt-1 flex-grow rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>

          <div class="flex items-center space-x-2">
            <label for="releaseDate" class="text-sm font-medium text-gray-700 w-20">Release Date:</label>
            <input id="releaseDate" v-model="form.releaseDate" type="date"
              class="mt-1 flex-grow rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>

          <!-- Status Section con botón de info -->
          <div class="col-span-2">
            <div class="mt-2 py-2 px-4 rounded-md text-sm font-bold flex items-center justify-between"
              :class="statusClass">
              <span>Status: {{ readableStatus }}</span>
              <!-- Botón de Información -->
              <button @click="showStatusInfo = true" type="button"
                class="ml-2 text-gray-700 hover:text-gray-900 focus:outline-none"
                title="Ver información de los estados">
                <i class="fas fa-info-circle"></i>
              </button>
            </div>
          </div>

          <!-- Control Buttons -->
          <div class="col-span-2 flex justify-end space-x-2">
            <button type="submit"
              class="bg-indigo-600 text-white text-sm px-4 py-1 rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500">
              Update List
            </button>
            <button v-if="canAdvanceStatus()" type="button" @click="nextStatus"
              class="bg-green-500 text-white text-sm px-4 py-1 rounded-md hover:bg-green-600 focus:ring-2 focus:ring-green-500">
              Next Status
            </button>
            <button v-if="canRevertStatus()" type="button" @click="prevStatus"
              class="bg-red-500 text-white text-sm px-4 py-1 rounded-md hover:bg-red-600 focus:ring-2 focus:ring-red-500">
              Revert Status
            </button>
          </div>
        </template>
      </form>
    </div>

    <!-- Tabla de discos -->
    <AsignationList v-if="form.type !== ListType.SPECIAL" :type="form.type" />

    <SpecialAsignationList v-if="form.type == ListType.SPECIAL" :list-id="id" :asignations="asignations" />


    <!-- Listado de Discos por Fecha -->
    <div class="bg-white p-6 rounded-2xl shadow-md" v-if="form.type !== ListType.SPECIAL">
      <h3 class="text-lg font-bold mb-4">Listado de Discos por Fecha</h3>
      <DiscsByDate :date="form.listDate" :type="form.type" :list-id="id" />
    </div>

    <!-- Modal de Información de Estados -->
    <transition name="fade">
      <div v-if="showStatusInfo" class="fixed inset-0 flex items-center justify-center z-50">
        <!-- Fondo semi-transparente -->
        <div class="fixed inset-0 bg-black opacity-50" @click="showStatusInfo = false"></div>
        <!-- Contenedor del Modal -->
        <div class="bg-white rounded-lg shadow-lg z-10 p-6 w-11/12 md:w-1/2">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold">Estados</h3>
            <button @click="showStatusInfo = false" type="button"
              class="text-gray-600 hover:text-gray-800 focus:outline-none">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div>
            <ul class="space-y-2">
              <li v-for="status in statusList" :key="status.value" class="border-b pb-1">
                <strong>{{ status.label }}:</strong> {{ status.legend }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </transition>
  </div>

  <div v-else class="flex items-center justify-center min-h-screen">
    <p class="text-lg font-medium text-gray-500">Cargando datos...</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, onMounted, computed } from "vue";
import { getListDetails, updateList } from "@services/list/list";
import DiscsByDate from "./components/DiscByDate.vue";
import AsignationList from "./components/AsignationList.vue";
import SpecialAsignationList from "./components/SpecialAsignationList.vue";
import { useAsignationStore } from "@stores/asignation/asignation";
import { useUserStore } from "@stores/user/users";
import SwalService from "@services/swal/SwalService";

export enum ListType {
  MONTH = "month",
  WEEK = "week",
  SPECIAL = "special",
}

export enum ListStatus {
  NEW = "new",
  ASSIGNED = "assigned",
  COMPLETED = "completed",
  REVISED = "revised",
  WITHIMAGE = "withimage",
  SCHEDULED = "scheduled",
  WEBPUBLISHED = "webpublished",
  SMPUBLISHED = "smpublished",
}

const statusOrder = [
  ListStatus.NEW,
  ListStatus.ASSIGNED,
  ListStatus.COMPLETED,
  ListStatus.REVISED,
  ListStatus.WITHIMAGE,
  ListStatus.SCHEDULED,
  ListStatus.WEBPUBLISHED,
  ListStatus.SMPUBLISHED,
];

export default defineComponent({
  name: "EditListForm",
  components: { DiscsByDate, AsignationList, SpecialAsignationList },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const form = reactive({
      name: "",
      type: "",
      specialType: "",
      listDate: "",
      status: ListStatus.NEW,
      releaseDate: "",
      link: "", // Añadido para evitar error TS
    });

    const loading = ref(true);
    const showStatusInfo = ref(false);
    const asignationStore = useAsignationStore();
    const userStore = useUserStore();
    const asignations = ref<any[]>([]); // <<<<<< AÑADIMOS ESTA LINEA

    const loadListDetails = async () => {
      try {
        const details: any = await getListDetails(props.id); // Tipado temporal como any para evitar error void
        console.log("List details fetched:", details);
        asignations.value = details.asignations || [];
        Object.assign(form, details); // Pre-fill form with list details
      } catch (error) {
        console.error("Error fetching list details:", error);
        SwalService.error("Unable to load list details. Please try again");
      } finally {
        loading.value = false; // Stop loading after fetching data
      }
    };

    const submitForm = async () => {
      try {
        console.log("Updating list with data:", form);
        const payload: any = {
          name: form.name,
          type: form.type,
          listDate: form.listDate || null,
          releaseDate: form.releaseDate || null,
          status: form.status,
        };
        if (form.type === ListType.SPECIAL) {
          payload.specialType = form.specialType || null;
        }
        const response = await updateList(props.id, payload);
        console.log("List updated successfully:", response);
        SwalService.success("List updated successfully!");
      } catch (error) {
        console.error("Error updating list:", error);
        SwalService.error(
          "An error occurred while updating the list. Please try again."
        );
      }
    };

    const nextStatus = async () => {
      const currentIndex = statusOrder.indexOf(form.status);
      if (currentIndex < statusOrder.length - 1) {
        form.status = statusOrder[currentIndex + 1];
        await submitForm();
      }
    };

    const prevStatus = async () => {
      const currentIndex = statusOrder.indexOf(form.status);
      if (currentIndex > 0) {
        form.status = statusOrder[currentIndex - 1];
        await submitForm();
      }
    };

    const canRevertStatus = () => form.status !== ListStatus.NEW;
    const canAdvanceStatus = () => form.status !== ListStatus.SMPUBLISHED;

    const openLink = () => {
      if (form.link) {
        window.open(form.link, "_blank");
      } else {
        SwalService.error("No link provided!");
      }
    };

    const readableStatus = computed(() => {
      const statusMap = {
        new: "New",
        assigned: "Assigned",
        completed: "Completed",
        revised: "Revised",
        withimage: "With Image",
        scheduled: "Scheduled",
        webpublished: "Web Published",
        smpublished: "Social Media Published",
      };
      return statusMap[form.status] || "Unknown Status";
    });

    const statusClass = computed(() => {
      const statusColors = {
        new: "bg-red-100 text-red-800",
        assigned: "bg-orange-100 text-orange-800",
        completed: "bg-yellow-100 text-yellow-800",
        revised: "bg-green-100 text-green-800",
        withimage: "bg-teal-100 text-teal-800",
        scheduled: "bg-blue-100 text-blue-800",
        webpublished: "bg-indigo-100 text-indigo-800",
        smpublished: "bg-purple-100 text-purple-800",
      };
      return statusColors[form.status] || "bg-gray-100 text-gray-800";
    });

    // Lista de estados con su leyenda (por ahora, la leyenda es igual al label)
    const statusList = [
      { value: ListStatus.NEW, label: "New", legend: "Creamos la lista para asignarnos discos" },
      { value: ListStatus.ASSIGNED, label: "Assigned", legend: "Discos asignados y noticias creadas" },
      { value: ListStatus.COMPLETED, label: "Completed", legend: "Todos los discos estan hechos" },
      { value: ListStatus.REVISED, label: "Revised", legend: "Revisados los articulos" },
      { value: ListStatus.WITHIMAGE, label: "With Image", legend: "Los articulos tienen imagen" },
      { value: ListStatus.SCHEDULED, label: "Scheduled", legend: "Los articulos tienen fecha de salida" },
      { value: ListStatus.WEBPUBLISHED, label: "Web Published", legend: "Los articulos estan publicados en la web" },
      { value: ListStatus.SMPUBLISHED, label: "Social Media Published", legend: "Los articulos estan publicados en las RRSS" },
    ];


    onMounted(async () => {
      loadListDetails();
      await asignationStore.loadAsignations(props.id);
      await userStore.loadRvUsers();
    });

    return {
      form,
      loading,
      submitForm,
      ListType,
      openLink,
      nextStatus,
      prevStatus,
      canRevertStatus,
      canAdvanceStatus,
      readableStatus,
      statusClass,
      showStatusInfo,
      statusList,
      asignations,
    };
  },
});
</script>

<style scoped>
/* Transición para el modal (fade in/out) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
