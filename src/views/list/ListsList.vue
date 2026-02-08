<template>
  <div class="p-6 bg-gray-50 min-h-screen flex flex-col items-center">
    <!-- Main Container -->
    <div class="max-w-7xl w-full">

      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Listas</h1>
        </div>
        <button @click="showCreateModal = true"
          class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all duration-200 flex items-center gap-2 transform hover:scale-105">
          <i class="fa-solid fa-plus"></i>
          Nueva Lista
        </button>
      </div>

      <!-- Filtro por tipo -->
      <div v-if="!loading && lists.length > 0" class="flex flex-wrap gap-2 mb-4">
        <button @click="filterSpecialType = ''"
          :class="[
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            !filterSpecialType ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
          ]">
          Todas
        </button>
        <button v-for="opt in specialTypeOptions" :key="opt.value" @click="filterSpecialType = opt.value"
          :class="[
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            filterSpecialType === opt.value
              ? getTypeColors(opt.value).badgeBg + ' ' + getTypeColors(opt.value).badgeText + ' ring-2 ring-offset-1 ring-current'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
          ]">
          <i :class="[getTypeColors(opt.value).icon, 'mr-1 text-xs']"></i>
          {{ opt.label }}
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-20">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i>
        <p class="text-gray-500 text-lg">Cargando listas...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="lists.length === 0"
        class="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
        <div class="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fa-solid fa-list-check text-2xl text-indigo-400"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">No hay listas creadas</h3>
        <button @click="showCreateModal = true"
          class="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
          Crear lista ahora
        </button>
      </div>

      <!-- Grid Layout Compacto -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="list in filteredLists" :key="list.id"
          :class="[
            'bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 overflow-hidden flex flex-col justify-between h-full',
            list.specialType ? 'border-t-4 ' + getTypeColors(list.specialType).border : ''
          ]">

          <div class="p-4 flex items-center gap-3">
            <div
              :class="['flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', getTypeColors(list.specialType).iconBg, getTypeColors(list.specialType).iconText]">
              <i :class="[getTypeColors(list.specialType).icon, 'text-sm']"></i>
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <h3 class="font-bold text-gray-800 text-base leading-tight line-clamp-2 mr-2">{{ list.name }}</h3>
              <span v-if="list.specialType"
                :class="['inline-block text-xs font-medium px-2 py-0.5 rounded-full w-fit capitalize', getTypeColors(list.specialType).badgeBg, getTypeColors(list.specialType).badgeText]">
                {{ list.specialType }}
              </span>
            </div>
          </div>

          <div class="px-4 pb-4 flex gap-2 mt-auto">
            <button @click="goToEdit(list.id)"
              class="flex-1 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 border border-gray-200 hover:border-indigo-200 rounded text-sm font-medium py-1.5 transition-colors flex items-center justify-center gap-2">
              <i class="fa-solid fa-pen text-xs"></i>
              <span>Editar</span>
            </button>
            <button @click="deleteItem(list.id)"
              class="w-8 flex items-center justify-center bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded transition-colors"
              title="Eliminar">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 class="text-xl font-bold text-gray-900">Nueva Lista Especial</h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 transition-colors">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Nombre de la Lista</label>
            <input v-model="newListName" type="text"
              class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="Ej: Lo mejor del Indie 2024" @keyup.enter="createList" autofocus />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Lista Especial</label>
            <select v-model="newListSpecialType"
              class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none">
              <option disabled value="">Selecciona un tipo</option>
              <option value="web">Web</option>
              <option value="app">App</option>
              <option value="noticias">Noticias</option>
              <option value="videos">Videos</option>
              <option value="riffValley">Riff Valley</option>
              <option value="otros">Otros</option>
            </select>
          </div>
        </div>

        <div class="p-6 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
          <button @click="closeModal"
            class="px-5 py-2.5 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button @click="createList" :disabled="!newListName || !newListSpecialType || creating"
            class="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
            <i v-if="creating" class="fa-solid fa-circle-notch fa-spin"></i>
            <span v-else>Crear Lista</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { getSpecialLists, postList, deleteList } from "@services/list/list";
import { useRouter } from "vue-router";
import SwalService from "@services/swal/SwalService";

export default defineComponent({
  name: "SpecialLists",
  setup() {
    const lists = ref<any[]>([]);
    const loading = ref(true);
    const router = useRouter();
    const showCreateModal = ref(false);
    const newListName = ref("");
    const newListSpecialType = ref("");
    const creating = ref(false);
    const filterSpecialType = ref("");

    const specialTypeColors: Record<string, { border: string; iconBg: string; iconText: string; badgeBg: string; badgeText: string; icon: string }> = {
      web: { border: "border-t-blue-500", iconBg: "bg-blue-50", iconText: "text-blue-500", badgeBg: "bg-blue-100", badgeText: "text-blue-700", icon: "fa-solid fa-globe" },
      app: { border: "border-t-purple-500", iconBg: "bg-purple-50", iconText: "text-purple-500", badgeBg: "bg-purple-100", badgeText: "text-purple-700", icon: "fa-solid fa-mobile-screen" },
      noticias: { border: "border-t-amber-500", iconBg: "bg-amber-50", iconText: "text-amber-500", badgeBg: "bg-amber-100", badgeText: "text-amber-700", icon: "fa-solid fa-newspaper" },
      videos: { border: "border-t-red-500", iconBg: "bg-red-50", iconText: "text-red-500", badgeBg: "bg-red-100", badgeText: "text-red-700", icon: "fa-solid fa-video" },
      riffValley: { border: "border-t-emerald-500", iconBg: "bg-emerald-50", iconText: "text-emerald-500", badgeBg: "bg-emerald-100", badgeText: "text-emerald-700", icon: "fa-solid fa-music" },
      otros: { border: "border-t-gray-500", iconBg: "bg-gray-100", iconText: "text-gray-500", badgeBg: "bg-gray-200", badgeText: "text-gray-700", icon: "fa-solid fa-ellipsis" },
    };

    const defaultColors = { border: "", iconBg: "bg-indigo-50", iconText: "text-indigo-500", badgeBg: "bg-indigo-100", badgeText: "text-indigo-700", icon: "fa-solid fa-list-ul" };

    const getTypeColors = (specialType: string) => specialTypeColors[specialType] || defaultColors;

    const specialTypeOptions = [
      { value: "web", label: "Web" },
      { value: "app", label: "App" },
      { value: "noticias", label: "Noticias" },
      { value: "videos", label: "Videos" },
      { value: "riffValley", label: "Riff Valley" },
      { value: "otros", label: "Otros" },
    ];

    const filteredLists = computed(() => {
      if (!filterSpecialType.value) return lists.value;
      return lists.value.filter((l: any) => l.specialType === filterSpecialType.value);
    });

    const fetchLists = async () => {
      loading.value = true;
      try {
        const response = await getSpecialLists();
        // Assuming response is an array based on previous getLists format which returned { data: [] } but getSpecialLists returns response.data directly
        // Let's safe check based on getLists implementation in service
        lists.value = Array.isArray(response) ? response : (response.data || []);
      } catch (error) {
        console.error("Error fetching special lists:", error);
        SwalService.error("Error al cargar las listas");
      } finally {
        loading.value = false;
      }
    };

    const goToEdit = (id: string) => {
      router.push({ name: "EditList", params: { id } });
    };

    const deleteItem = async (id: string) => {
      const confirmed = await SwalService.confirm(
        "¿Estás seguro?",
        "Esta acción no se puede deshacer. Se eliminará la lista y sus asignaciones."
      );

      if (confirmed.isConfirmed) {
        try {
          await deleteList(id);
          SwalService.success("Lista eliminada");
          fetchLists();
        } catch (error) {
          console.error("Error deleting list:", error);
          SwalService.error("No se pudo eliminar la lista");
        }
      }
    };

    const closeModal = () => {
      showCreateModal.value = false;
      newListName.value = "";
      newListSpecialType.value = "";
    };

    const createList = async () => {
      if (!newListName.value) return;

      creating.value = true;
      try {
        await postList({
          name: newListName.value,
          type: 'special',
          specialType: newListSpecialType.value
        });
        SwalService.success("Lista creada correctamente");
        closeModal();
        fetchLists();
      } catch (error) {
        console.error("Error creating list:", error);
        SwalService.error("No se pudo crear la lista");
      } finally {
        creating.value = false;
      }
    };

    onMounted(() => {
      fetchLists();
    });

    return {
      lists,
      filteredLists,
      filterSpecialType,
      specialTypeOptions,
      getTypeColors,
      loading,
      goToEdit,
      deleteItem,
      showCreateModal,
      newListName,
      newListSpecialType,
      creating,
      closeModal,
      createList
    };
  },
});
</script>

<style scoped>
/* Scoped styles if needed */
</style>
