<template>
  <div class="bg-white dark:bg-rv-darkCard p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Checklist</h2>
      <button @click="openCreateModal"
        class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-200 flex items-center gap-2">
        <i class="fa-solid fa-plus"></i>
        <span class="hidden sm:inline">Nueva </span>Asignación
      </button>
    </div>

    <!-- Lista de asignaciones (Grid de Tarjetas) -->
    <div v-if="asignations.length === 0"
      class="text-center py-10 bg-gray-50 dark:bg-rv-darkBg/30 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
      <i class="fa-regular fa-clipboard text-4xl text-gray-300 dark:text-gray-600 mb-2"></i>
      <p class="text-gray-500 dark:text-gray-400">No hay tareas creadas todavía.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div v-for="asignation in asignations" :key="asignation.id"
        class="bg-white dark:bg-rv-darkSurface border text-left border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full"
        :class="{ 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30': asignation.done }">

        <div class="flex justify-between items-center mb-2">
          <!-- Status -->
          <label class="flex items-center cursor-pointer min-w-0 mr-2">
            <input type="checkbox" :checked="asignation.done" @change="toggleDone(asignation)"
              class="form-checkbox h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-white/20 focus:ring-indigo-500 transition-all dark:bg-rv-darkSurface" />
            <span class="ml-2 text-xs font-semibold text-gray-700 dark:text-gray-300 truncate"
              :class="{ 'line-through text-gray-400 dark:text-gray-500': asignation.done }">
              {{ asignation.done ? 'Completado' : 'Pendiente' }}
            </span>
          </label>

          <!-- User Info & Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">

            <!-- User Info (Compact) -->
            <div class="flex items-center gap-1.5" v-if="asignation.user" title="Usuario asignado">
              <img v-if="asignation.user.image" :src="asignation.user.image" alt="Avatar"
                class="w-5 h-5 rounded-full object-cover shadow-sm border border-gray-100" />
              <div v-else
                class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                :style="{ backgroundColor: getAvatarColor(asignation.user.username) }">
                {{ asignation.user.username?.charAt(0).toUpperCase() || '?' }}
              </div>
              <span class="text-[10px] text-gray-500 dark:text-gray-400 font-medium max-w-[60px] truncate hidden sm:inline">{{
                asignation.user.username }}</span>
            </div>

            <!-- Separator -->
            <div class="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1"></div>

            <!-- Actions -->
            <div class="flex gap-1">
              <button @click="startEditing(asignation)"
                class="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 rounded-md transition-colors" title="Editar">
                <i class="fa-solid fa-pen-to-square text-xs"></i>
              </button>
              <button @click="deleteAsignation(asignation.id)"
                class="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-0.5 rounded-md transition-colors" title="Eliminar">
                <i class="fa-solid fa-trash text-xs"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="flex-grow">
          <p class="text-gray-800 dark:text-gray-200 text-sm leading-snug whitespace-pre-line"
            :class="{ 'text-gray-500 dark:text-gray-500': asignation.done }" v-html="formatTextWithLineBreaks(asignation.description)"></p>
        </div>
      </div>
    </div>

    <!-- Modal de Creación/Edición -->
    <div v-if="showModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
      <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div class="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-rv-darkSurface">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ editingId ? 'Editar Asignación' : 'Nueva Asignación' }}
          </h3>
          <button @click="closeModal" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <textarea v-model="modalForm.description" rows="4"
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="¿Qué hay que hacer?" required></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asignar a Usuario</label>
            <select v-model="modalForm.userId"
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none">
              <option value="">-- Sin asignar --</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.username }}
              </option>
            </select>
          </div>

          <div class="pt-2 flex gap-3 justify-end">
            <button type="button" @click="closeModal"
              class="px-5 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-rv-darkSurface transition-colors">
              Cancelar
            </button>
            <button type="submit"
              class="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all">
              {{ editingId ? 'Guardar Cambios' : 'Crear Asignación' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, reactive } from "vue";
import { getRvUsers } from "@services/users/users";
import SwalService from "@services/swal/SwalService";
import {
  postAsignationService,
  updateAsignationService,
  deleteAsignationService,
} from "@services/asignation/asignation";

export default defineComponent({
  name: "SpecialAsignationForm",
  props: {
    listId: {
      type: String,
      required: true,
    },
    asignations: {
      type: Array,
      required: true,
    },
  },
  setup(props) {
    const users = ref<any[]>([]);
    const asignations = ref<any[]>([]);
    const editingId = ref<string | null>(null);
    const showModal = ref(false);

    const modalForm = reactive({
      userId: "",
      description: "",
      done: false,
    });

    // Colores para avatares
    const avatarColors = [
      "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
      "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E"
    ];

    const getAvatarColor = (username?: string) => {
      if (!username) return "#9CA3AF"; // Gray for unknown
      let hash = 0;
      for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % avatarColors.length;
      return avatarColors[index];
    };

    const formatTextWithLineBreaks = (text: string): string => {
      return text ? text.replace(/\n/g, "<br>") : "";
    };

    const fetchUsers = async () => {
      try {
        const response = await getRvUsers();
        users.value = response;
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const openCreateModal = () => {
      editingId.value = null;
      modalForm.userId = "";
      modalForm.description = "";
      modalForm.done = false;
      showModal.value = true;
    };

    const closeModal = () => {
      showModal.value = false;
      editingId.value = null;
      modalForm.userId = "";
      modalForm.description = "";
      modalForm.done = false;
    };

    const startEditing = (asignation: any) => {
      editingId.value = asignation.id;
      modalForm.userId = asignation.user?.id || "";
      modalForm.description = asignation.description;
      modalForm.done = asignation.done;
      showModal.value = true;
    };

    const handleSubmit = async () => {
      if (editingId.value) {
        await updateAsignation();
      } else {
        await createAsignation();
      }
    };

    const createAsignation = async () => {
      try {
        const newAsignationData = {
          userId: modalForm.userId || undefined,
          description: modalForm.description || "",
          done: modalForm.done,
          listId: props.listId,
        };
        const response = await postAsignationService(newAsignationData);
        asignations.value.push(response);

        closeModal();
        SwalService.success("Asignación creada con éxito!");
      } catch (error) {
        console.error("Error creating asignation:", error);
        SwalService.error("Error al crear la asignación");
      }
    };

    const updateAsignation = async () => {
      if (!editingId.value) return;

      try {
        const updatedAsignationData = {
          userId: modalForm.userId || undefined,
          description: modalForm.description,
        };

        const response: any = await updateAsignationService(
          editingId.value,
          updatedAsignationData
        );

        // Actualizamos en local
        const index = asignations.value.findIndex((a) => a.id === editingId.value);
        if (index !== -1) {
          const updatedUser = users.value.find((u) => u.id === modalForm.userId);
          // Si el backend devuelve el objeto actualizado completo, úsalo, si no, mezcla
          asignations.value[index] = {
            ...asignations.value[index],
            ...response, // mezcla lo que devuelva el back
            userId: modalForm.userId,
            description: modalForm.description,
            user: updatedUser ?? asignations.value[index].user,
          };
        }

        closeModal();
        SwalService.success("Asignación actualizada con éxito!");
      } catch (error) {
        console.error("Error updating asignation:", error);
        SwalService.error("Error actualizando asignación");
      }
    };

    const toggleDone = async (asignation: any) => {
      try {
        const newDone = !asignation.done;
        await updateAsignationService(asignation.id, { done: newDone });

        const index = asignations.value.findIndex((a) => a.id === asignation.id);
        if (index !== -1) {
          asignations.value[index].done = newDone;
        }
        // Feedback visual sutil, no un alert invasivo para un check
      } catch (error) {
        console.error("Error toggling done:", error);
        SwalService.error("Error actualizando estado");
      }
    };

    const deleteAsignation = async (id: string) => {
      const confirmed = await SwalService.confirm(
        "¿Eliminar tarea?",
        "Esta acción no se puede deshacer."
      );

      if (confirmed.isConfirmed) {
        try {
          await deleteAsignationService(id);
          asignations.value = asignations.value.filter((a) => a.id !== id);
          SwalService.success("Eliminado correctamente");
        } catch (error) {
          console.error("Error deleting asignation:", error);
          SwalService.error("Error eliminando asignación");
        }
      }
    };

    watch(
      () => props.asignations,
      (newAsignations) => {
        if (newAsignations) {
          asignations.value = [...newAsignations];
        }
      },
      { immediate: true, deep: true }
    );

    onMounted(() => {
      fetchUsers();
    });

    return {
      users,
      asignations,
      editingId,
      showModal,
      modalForm,
      openCreateModal,
      closeModal,
      startEditing,
      handleSubmit,
      toggleDone,
      deleteAsignation,
      formatTextWithLineBreaks,
      getAvatarColor,
    };
  },
});
</script>
