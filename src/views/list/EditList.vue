<template>
  <div class="p-4 md:p-6 bg-gray-100 dark:bg-rv-darkBg min-h-screen grid grid-cols-1 gap-6 items-start" v-if="!loading">

    <!-- Botón volver -->
    <div>
      <button @click="router.push('/list/lists')"
        class="px-4 py-2 bg-white dark:bg-rv-darkCard text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-rv-darkSurface border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i>
        Volver a Listas
      </button>
    </div>

    <!-- Formulario de edición -->
    <div class="bg-white dark:bg-rv-darkCard p-4 md:p-6 rounded-2xl shadow-md">
      <h3 class="text-lg font-bold mb-4 dark:text-white">Info de la Lista</h3>
      <form @submit.prevent="submitForm" class="grid grid-cols-1 md:grid-cols-2 items-center gap-4">

        <!-- Nombre -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2"
          :class="{ 'md:col-span-2': form.type === ListType.SPECIAL }">
          <label for="name" class="text-sm font-medium text-gray-700 dark:text-gray-300 sm:w-24 flex-shrink-0">Nombre:</label>
          <div class="flex flex-grow gap-2 w-full">
            <input id="name" v-model="form.name" type="text"
              class="flex-grow rounded-md border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Nombre de la lista" required />
            <select v-if="form.type === ListType.SPECIAL" v-model="form.specialType"
              class="rounded-md border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm">
              <option disabled value="">Tipo</option>
              <option value="web">Web</option>
              <option value="app">App</option>
              <option value="noticias">Noticias</option>
              <option value="videos">Vídeos</option>
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
          <!-- Tipo -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <label for="type" class="text-sm font-medium text-gray-700 dark:text-gray-300 sm:w-24 flex-shrink-0">Tipo:</label>
            <select id="type" v-model="form.type"
              class="flex-grow w-full rounded-md border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required>
              <option disabled value="">Selecciona tipo</option>
              <option :value="ListType.MONTH">Mes</option>
              <option :value="ListType.WEEK">Semana</option>
              <option :value="ListType.SPECIAL">Especial</option>
            </select>
          </div>

          <!-- Fecha Lista -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <label for="listDate" class="text-sm font-medium text-gray-700 dark:text-gray-300 sm:w-24 flex-shrink-0">Fecha:</label>
            <input id="listDate" v-model="form.listDate" type="date"
              class="flex-grow w-full rounded-md border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 [color-scheme:dark]" />
          </div>

          <!-- Fecha Publicación -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <label for="releaseDate" class="text-sm font-medium text-gray-700 dark:text-gray-300 sm:w-24 flex-shrink-0">Publicación:</label>
            <input id="releaseDate" v-model="form.releaseDate" type="date"
              class="flex-grow w-full rounded-md border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 [color-scheme:dark]" />
          </div>

          <!-- Estado -->
          <div class="md:col-span-2">
            <div class="mt-2 py-2 px-4 rounded-md text-sm font-bold flex items-center justify-between"
              :class="statusClass">
              <span>Estado: {{ readableStatus }}</span>
              <button @click="showStatusInfo = true" type="button"
                class="ml-2 opacity-70 hover:opacity-100 focus:outline-none"
                title="Ver información de los estados">
                <i class="fas fa-info-circle"></i>
              </button>
            </div>
          </div>

          <!-- Botones de control -->
          <div class="md:col-span-2 flex flex-wrap justify-end gap-2">
            <button type="submit"
              class="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500">
              Actualizar
            </button>
            <button v-if="canAdvanceStatus()" type="button" @click="nextStatus"
              class="bg-green-500 text-white text-sm px-4 py-1.5 rounded-md hover:bg-green-600 focus:ring-2 focus:ring-green-500">
              Siguiente
            </button>
            <button v-if="canRevertStatus()" type="button" @click="prevStatus"
              class="bg-red-500 text-white text-sm px-4 py-1.5 rounded-md hover:bg-red-600 focus:ring-2 focus:ring-red-500">
              Revertir
            </button>
          </div>
        </template>
      </form>
    </div>

    <!-- Asignaciones -->
    <AsignationList v-if="form.type !== ListType.SPECIAL" :type="form.type" />

    <SpecialAsignationList v-if="form.type === ListType.SPECIAL" :list-id="id" :asignations="asignations" />

    <!-- Listado de Discos por Fecha -->
    <div class="bg-white dark:bg-rv-darkCard p-4 md:p-6 rounded-2xl shadow-md" v-if="form.type !== ListType.SPECIAL">
      <h3 class="text-lg font-bold mb-4 dark:text-white">Listado de Discos por Fecha</h3>
      <DiscsByDate :date="form.listDate" :type="form.type" :list-id="id" />
    </div>

    <!-- Modal de Información de Estados -->
    <transition name="fade">
      <div v-if="showStatusInfo" class="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div class="fixed inset-0 bg-black/50" @click="showStatusInfo = false"></div>
        <div class="bg-white dark:bg-rv-darkCard rounded-lg shadow-lg z-10 p-6 w-full max-w-lg">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold dark:text-white">Estados</h3>
            <button @click="showStatusInfo = false" type="button"
              class="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <ul class="space-y-2">
            <li v-for="status in statusList" :key="status.value"
              class="border-b border-gray-100 dark:border-white/10 pb-2 text-sm dark:text-gray-300">
              <strong class="dark:text-white">{{ status.label }}:</strong> {{ status.legend }}
            </li>
          </ul>
        </div>
      </div>
    </transition>
  </div>

  <div v-else class="flex items-center justify-center min-h-screen dark:bg-rv-darkBg">
    <p class="text-lg font-medium text-gray-500 dark:text-gray-400">Cargando datos...</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
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
      link: "",
    });

    const router = useRouter();
    const loading = ref(true);
    const showStatusInfo = ref(false);
    const asignationStore = useAsignationStore();
    const userStore = useUserStore();
    const asignations = ref<any[]>([]);

    const loadListDetails = async () => {
      try {
        const details: any = await getListDetails(props.id);
        asignations.value = details.asignations || [];
        Object.assign(form, details);
      } catch (error) {
        console.error("Error fetching list details:", error);
        SwalService.error("No se pudieron cargar los detalles de la lista");
      } finally {
        loading.value = false;
      }
    };

    const submitForm = async () => {
      try {
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
        await updateList(props.id, payload);
        SwalService.success("Lista actualizada");
      } catch (error) {
        console.error("Error updating list:", error);
        SwalService.error("No se pudo actualizar la lista");
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
        SwalService.error("No hay enlace disponible");
      }
    };

    const readableStatus = computed(() => {
      const statusMap: Record<string, string> = {
        new: "Nueva",
        assigned: "Asignada",
        completed: "Completada",
        revised: "Revisada",
        withimage: "Con imagen",
        scheduled: "Programada",
        webpublished: "Publicada en web",
        smpublished: "Publicada en RRSS",
      };
      return statusMap[form.status] || "Desconocido";
    });

    const statusClass = computed(() => {
      const statusColors: Record<string, string> = {
        new:          "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
        assigned:     "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
        completed:    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
        revised:      "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
        withimage:    "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300",
        scheduled:    "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
        webpublished: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300",
        smpublished:  "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
      };
      return statusColors[form.status] || "bg-gray-100 dark:bg-rv-darkSurface text-gray-800 dark:text-gray-300";
    });

    const statusList = [
      { value: ListStatus.NEW,          label: "Nueva",            legend: "Creamos la lista para asignarnos discos" },
      { value: ListStatus.ASSIGNED,     label: "Asignada",         legend: "Discos asignados y noticias creadas" },
      { value: ListStatus.COMPLETED,    label: "Completada",       legend: "Todos los discos están hechos" },
      { value: ListStatus.REVISED,      label: "Revisada",         legend: "Revisados los artículos" },
      { value: ListStatus.WITHIMAGE,    label: "Con imagen",       legend: "Los artículos tienen imagen" },
      { value: ListStatus.SCHEDULED,    label: "Programada",       legend: "Los artículos tienen fecha de salida" },
      { value: ListStatus.WEBPUBLISHED, label: "Publicada en web", legend: "Los artículos están publicados en la web" },
      { value: ListStatus.SMPUBLISHED,  label: "Publicada en RRSS",legend: "Los artículos están publicados en las RRSS" },
    ];

    onMounted(async () => {
      loadListDetails();
      await asignationStore.loadAsignations(props.id);
      await userStore.loadRvUsers();
    });

    return {
      router, form, loading, submitForm, ListType, openLink,
      nextStatus, prevStatus, canRevertStatus, canAdvanceStatus,
      readableStatus, statusClass, showStatusInfo, statusList, asignations,
    };
  },
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
