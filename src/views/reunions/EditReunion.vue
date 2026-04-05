<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Cabecera de la reunión -->
    <div class="flex justify-between items-center mb-4">
      <div>
        <h1 class="text-2xl font-bold">{{ reunion.title }}</h1>
        <!-- Fecha de la reunión formateada -->
        <p class="text-sm text-gray-600">{{ formatDate(reunion.date) }}</p>
      </div>
      <button @click="toggleEditReunionForm"
        class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center">
        <i class="fa-solid fa-pen-to-square"></i>
      </button>
    </div>

    <!-- Formulario para editar reunión -->
    <div v-if="showEditReunionForm" class="bg-gray-100 p-4 rounded-lg shadow-md mb-6">
      <h3 class="text-lg font-semibold mb-4">Editar Reunión</h3>
      <form @submit.prevent="updateReunionFunction" class="space-y-4">
        <div>
          <label for="title-reunion" class="block font-medium">Título</label>
          <input v-model="reunion.title" type="text" id="title-reunion"
            class="w-full p-2 border border-gray-300 rounded-lg" placeholder="Ingresa el título de la reunión"
            required />
        </div>
        <div>
          <label for="date-reunion" class="block font-medium">Fecha</label>
          <input v-model="reunion.date" type="datetime-local" id="date-reunion"
            class="w-full p-2 border border-gray-300 rounded-lg" required />
        </div>
        <div class="flex justify-end space-x-4">
          <button type="button" @click="toggleEditReunionForm"
            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            Cancelar
          </button>
          <button type="submit" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>

    <!-- Sección de puntos de la reunión -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Puntos de la Reunión</h2>
      <button @click="toggleNewPointForm"
        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center">
        <i class="text-sm font-bold">Añadir punto</i>
      </button>
    </div>

    <!-- Formulario para añadir un nuevo punto -->
    <div v-if="showNewPointForm" class="bg-gray-100 p-4 rounded-lg shadow-md mb-6">
      <h3 class="text-lg font-semibold mb-4">Añadir Nuevo Punto</h3>
      <form @submit.prevent="addPoint" class="space-y-4">
        <div>
          <label for="new-titulo" class="block font-medium">Título</label>
          <input v-model="newPoint.titulo" type="text" id="new-titulo"
            class="w-full p-2 border border-gray-300 rounded-lg" placeholder="Ingresa el título del punto" required />
        </div>
        <div>
          <label for="new-content" class="block font-medium">Contenido</label>
          <textarea v-model="newPoint.content" id="new-content" class="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="Ingresa el contenido del punto" rows="3"></textarea>
        </div>
        <div class="flex justify-end space-x-4">
          <button type="button" @click="toggleNewPointForm"
            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            Cancelar
          </button>
          <button type="submit" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            Añadir Punto
          </button>
        </div>
      </form>
    </div>

    <!-- Listado de puntos -->
    <ul class="space-y-4">
      <li v-for="(point, index) in points" :key="point.id"
        class="border border-gray-300 rounded-lg p-4 bg-white shadow-md">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-3">
            <input type="checkbox" :checked="point.done" @change="togglePointDone(point.id, $event.target.checked)"
              class="form-checkbox h-6 w-6 text-blue-600" />
            <strong class="text-ml">{{ point.titulo }}</strong>
          </div>
          <div class="flex space-x-2">
            <button @click="toggleEditPointForm(index)"
              class="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button @click="deletePoint(point.id)"
              class="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center">
              <i class="fa-solid fa-trash"></i>
            </button>
            <button @click="toggleContentVisibility(index)"
              class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center">
              <i :class="point.showContent ? 'fa-solid fa-minus' : 'fa-solid fa-chevron-down'"></i>
            </button>
          </div>
        </div>

        <!-- Contenido del punto -->
        <div v-if="point.showContent" class="mt-4 bg-gray-100 p-4 rounded-lg">
          <p class="text-gray-600" v-html="formatContent(point.content)"></p>
        </div>

        <!-- Formulario para editar punto -->
        <div v-if="editingIndex === index" class="mt-4 bg-gray-100 p-4 rounded-lg shadow-md">
          <h4 class="font-semibold mb-4">Editar Punto</h4>
          <form @submit.prevent="updatePointReunion(editPointData.id, index)" class="space-y-4">
            <div>
              <label for="edit-titulo" class="block font-medium">Título</label>
              <input v-model="editPointData.titulo" type="text" id="edit-titulo"
                class="w-full p-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label for="edit-content" class="block font-medium">Contenido</label>
              <textarea v-model="editPointData.content" id="edit-content"
                class="w-full p-2 border border-gray-300 rounded-lg" rows="3"></textarea>
            </div>
            <div class="flex justify-end space-x-4">
              <button type="button" @click="cancelEdit"
                class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                Cancelar
              </button>
              <button type="submit" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import { defineComponent, ref } from "vue";
import SwalService from "@services/swal/SwalService";
import { getReunionDetails, updateReunion } from "@services/reunions/reunions";
import { deletePoint, updatePoint, postPoint } from "@services/points/point";

export default defineComponent({
  name: "PointsManager",
  props: {
    id: {
      type: String,
      required: true, // ID de la reunión
    },
  },
  setup(props) {
    // Estado para la reunión
    const reunion = ref({
      title: "",
      date: "",
    });

    const showEditReunionForm = ref(false);

    // Estado para los puntos
    const newPoint = ref({
      titulo: "",
      content: "",
    });

    const points = ref([]);
    const showNewPointForm = ref(false);
    const editingIndex = ref(null);
    const editPointData = ref({
      titulo: "",
      content: "",
    });

    const formatContent = (text) => {
      return text.replace(/\n/g, "<br>");
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString();
    };

    // Obtener la información de la reunión
    const fetchReunion = async () => {
      try {
        const response = await getReunionDetails(props.id);
        reunion.value = {
          title: response.title,
          date: new Date(response.date).toISOString().slice(0, 16),
        };
        points.value = response.points.map((point) => ({
          ...point,
          showContent: false,
        }));
      } catch (error) {
        console.error("Error al obtener la reunión:", error);
        SwalService.error("No se pudo cargar la reunión.");
      }
    };

    // Actualizar la reunión
    const updateReunionFunction = async () => {
      try {
        await updateReunion(props.id, {
          title: reunion.value.title,
          date: reunion.value.date,
        });
        SwalService.success('Reunión actualizada con éxito.');
        showEditReunionForm.value = false;
      } catch (error) {
        console.error("Error al actualizar la reunión:", error);
        SwalService.error('No se pudo actualizar la reunión.');
      }
    };

    const toggleEditReunionForm = () => {
      showEditReunionForm.value = !showEditReunionForm.value;
    };

    const addPoint = async () => {
      try {
        const response = await postPoint({
          titulo: newPoint.value.titulo,
          content: newPoint.value.content,
          reunionId: props.id,
        });
        points.value.push({ ...response, showContent: false });
        newPoint.value = { titulo: "", content: "" };
        showNewPointForm.value = false;
        SwalService.success("Punto añadido con éxito.");
      } catch (error) {
        console.error("Error al añadir el punto:", error);
        SwalService.error("No se pudo añadir el punto.");
      }
    };

    const toggleNewPointForm = () => {
      showNewPointForm.value = !showNewPointForm.value;
    };

    const toggleEditPointForm = (index) => {
      if (editingIndex.value === index) {
        cancelEdit();
      } else {
        editingIndex.value = index;
        editPointData.value = { ...points.value[index] };
      }
    };

    const toggleContentVisibility = (index) => {
      points.value[index].showContent = !points.value[index].showContent;
    };

    const updatePointReunion = async (id, index) => {
      try {
        const response = await updatePoint(id, {
          titulo: editPointData.value.titulo,
          content: editPointData.value.content,
        });
        points.value[index].content = editPointData.value.content
        editingIndex.value = null;
        SwalService.success("Punto actualizado con éxito.");
      } catch (error) {
        console.error("Error al actualizar el punto:", error);
        SwalService.error("No se pudo actualizar el punto.");
      }
    };

    const cancelEdit = () => {
      editingIndex.value = null;
      editPointData.value = { titulo: "", content: "" };
    };

    const deletePoint = async (id) => {
      if (!confirm("¿Estás seguro de que deseas eliminar este punto?")) return;
      try {
        await deletePoint(id);
        points.value = points.value.filter((point) => point.id !== id);
        SwalService.success("Punto eliminado con éxito.");
      } catch (error) {
        console.error("Error al eliminar el punto:", error);
        SwalService.error("No se pudo eliminar el punto.");
      }
    };

    const togglePointDone = async (id, done) => {
      try {
        const response = await updatePoint(id, {
          done,
        });
        const updatedPoint = points.value.find((point) => point.id === id);
      } catch (error) {
        console.error("Error al actualizar el estado del punto:", error);
        SwalService.error("No se pudo actualizar el estado del punto.");
      }
    };


    // Fetch inicial de datos
    fetchReunion();

    return {
      formatDate,
      formatContent,
      reunion,
      showEditReunionForm,
      newPoint,
      points,
      showNewPointForm,
      editingIndex,
      editPointData,
      addPoint,
      toggleEditReunionForm,
      updateReunionFunction,
      toggleNewPointForm,
      toggleEditPointForm,
      toggleContentVisibility,
      updatePointReunion,
      cancelEdit,
      deletePoint,
      togglePointDone,
    };
  },
});
</script>

<style scoped>
.form-checkbox {
  appearance: none;
  display: inline-block;
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid #cbd5e0;
  border-radius: 0.375rem;
  background-color: #ffffff;
  cursor: pointer;
  transition: background-color 0.2s;
}

.form-checkbox:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}
</style>
