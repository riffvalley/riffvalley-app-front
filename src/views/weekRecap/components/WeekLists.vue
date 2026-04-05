<template>
  <div class="space-y-6 p-4 md:p-6">
    <!-- Listas -->
    <div
      v-for="item in lists"
      :key="item.id"
      class="p-4 md:p-6 bg-white shadow-md rounded-lg border border-gray-200"
    >
      <!-- Información de la lista -->
      <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
        <div>
          <h3 class="text-md md:text-lg font-bold text-gray-800">{{ item.name }}</h3>
          <!-- Información en línea -->
          <div class="flex flex-wrap items-center text-sm text-gray-600 gap-2 md:gap-4">
            <p><span class="font-semibold">Tipo:</span> {{ item.type }}</p>
            <p><span class="font-semibold">Estado:</span> {{ item.status }}</p>
            <p><span class="font-semibold">Fecha de Lanzamiento:</span> {{ item.releaseDate }}</p>
          </div>
        </div>
        <button
          @click="goToEdit(item.id)"
          class="mt-3 md:mt-0 px-3 py-2 md:px-4 md:py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 w-full md:w-auto"
        >
          Editar
        </button>
      </div>

      <!-- Tabla de asignaciones -->
      <div>
        <h4 class="text-sm font-semibold text-gray-700 mb-2">Discos:</h4>
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 px-2 py-1 text-left">Artista</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Disco</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="assignment in filteredAssignments(item.asignations)"
              :key="assignment.id"
              class="odd:bg-white even:bg-gray-50"
            >
              <td class="border border-gray-300 px-2 py-1">
                {{ assignment.disc.artist.name }}
              </td>
              <td class="border border-gray-300 px-2 py-1">
                {{ assignment.disc.name }}
              </td>
              <td class="border border-gray-300 px-2 py-1 text-center">
                <div class="flex items-center justify-center space-x-4">
                  <!-- Spotify link -->
                  <a
                    v-if="assignment.disc.link"
                    :href="assignment.disc.link"
                    target="_blank"
                    class="text-green-600"
                  >
                    <i class="fa-brands fa-spotify"></i>
                  </a>
                  <!-- Checkbox -->
                  <input
                    type="checkbox"
                    :checked="assignment.done"
                    @change="toggleDone(assignment)"
                    class="w-4 h-4"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from "vue";
import { getLists } from "@services/list/list";
import { useRouter } from "vue-router";
import { useAuthStore } from "@stores/auth/auth";
import { useAsignationStore } from "@stores/asignation/asignation";
import SwalService from "@services/swal/SwalService";
export default defineComponent({
  name: "StyledList",
  props: {
    exclusions: {
      type: Array as () => string[],
      required: true,
    },
  },
  setup(props) {
    const lists = ref<any[]>([]);
    const router = useRouter();
    const authStore = useAuthStore();
    const user = computed(() => authStore.loggedUser);
    const asignationStore = useAsignationStore();

    // Llamada para obtener listas
    const fetchLists = async () => {
      try {
        const response = await getLists(20, 0, props.exclusions);
        lists.value = response.data;
      } catch (error) {
        console.error("Error fetching lists:", error);
      }
    };

    // Filtrar las asignaciones por usuario
    const filteredAssignments = (asignations: any[]) => {
      return asignations.filter(
        (assignment) => assignment.user?.id === user.value.id
      );
    };

    // Redirige al editor de la lista seleccionada
    const goToEdit = (id: string) => {
      router.push({ name: "EditList", params: { id } });
    };

    // Maneja el checkbox
    const handleCheck = (userId: string, assignment: any) => {
    };

    const toggleDone = async (asignation: any) => {
      const updatedAsignation = {
        ...asignation,
        done: !asignation.done,
      };

      try {
        await asignationStore.updateAsignationStore(updatedAsignation);
        SwalService.success("Asignation updated");
      } catch (error) {
        console.error("Error actualizando la asignación:", error);
      }
    };

    onMounted(() => {
      fetchLists();
    });

    return {
      lists,
      user,
      goToEdit,
      handleCheck,
      filteredAssignments,
      toggleDone
    };
  },
});
</script>

<style scoped></style>
