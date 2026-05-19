<template>
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="$emit('close')">
        <div class="bg-white dark:bg-rv-darkCard rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <!-- Header con botones -->
            <div class="sticky top-0 bg-white dark:bg-rv-darkCard border-b border-gray-200 dark:border-white/10 p-4 md:p-6 flex justify-between items-center z-10">
                <div class="flex-1 min-w-0 mr-3">
                    <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">{{ reunion.title }}</h1>
                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ formatDate(reunion.date) }}</p>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button @click="confirmDeleteReunion"
                        class="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-lg flex items-center gap-1 sm:gap-2 transition-all text-sm font-semibold"
                        title="Eliminar reunión">
                        <i class="fa-regular fa-trash-can"></i>
                        <span class="hidden sm:inline">Borrar</span>
                    </button>
                    <button @click="reloadReunion"
                        class="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-1 sm:gap-2 transition-colors text-sm"
                        title="Recargar datos">
                        <i class="fa-solid fa-rotate-right"></i>
                        <span class="hidden sm:inline">Recargar</span>
                    </button>
                    <button @click="toggleEditReunionForm"
                        class="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                        title="Editar reunión">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button @click="$emit('close')"
                        class="px-3 py-2 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-lg transition-colors text-sm">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            </div>

            <!-- Contenido del modal -->
            <div class="p-4 md:p-6">
                <!-- Formulario para editar reunión -->
                <div v-if="showEditReunionForm" class="bg-gray-100 dark:bg-rv-darkSurface p-4 rounded-lg shadow-md mb-6">
                    <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Editar Reunión</h3>
                    <form @submit.prevent="updateReunionFunction" class="space-y-4">
                        <div>
                            <label for="title-reunion" class="block font-medium text-gray-700 dark:text-gray-300">Título</label>
                            <input v-model="reunion.title" type="text" id="title-reunion"
                                class="w-full p-2 border border-gray-300 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg"
                                placeholder="Ingresa el título de la reunión" required />
                        </div>
                        <div>
                            <label for="date-reunion" class="block font-medium text-gray-700 dark:text-gray-300">Fecha</label>
                            <input v-model="reunion.date" type="datetime-local" id="date-reunion"
                                class="w-full p-2 border border-gray-300 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg" required />
                        </div>
                        <div class="flex justify-end gap-3">
                            <button type="button" @click="toggleEditReunionForm"
                                class="px-4 py-2 bg-gray-100 dark:bg-rv-darkCard text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-lg font-medium transition-colors">
                                Cancelar
                            </button>
                            <button type="submit"
                                class="px-4 py-2 bg-rv-purple text-white rounded-lg hover:bg-rv-pink transition-colors">
                                Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Sección de puntos de la reunión -->
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white">Puntos de la Reunión</h2>
                    <button @click="toggleNewPointForm"
                        class="px-4 py-2 bg-rv-purple text-white rounded-lg hover:bg-rv-pink flex items-center gap-2 transition-colors text-sm">
                        <i class="fa-solid fa-plus"></i>
                        <span class="hidden sm:inline">Añadir punto</span>
                    </button>
                </div>

                <!-- Formulario para añadir un nuevo punto -->
                <div v-if="showNewPointForm" class="bg-gray-100 dark:bg-rv-darkSurface p-4 rounded-lg shadow-md mb-6">
                    <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Añadir Nuevo Punto</h3>
                    <form @submit.prevent="addPoint" class="space-y-4">
                        <div>
                            <label for="new-titulo" class="block font-medium text-gray-700 dark:text-gray-300">Título</label>
                            <input v-model="newPoint.titulo" type="text" id="new-titulo"
                                class="w-full p-2 border border-gray-300 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg"
                                placeholder="Ingresa el título del punto" required />
                        </div>
                        <div>
                            <label for="new-content" class="block font-medium text-gray-700 dark:text-gray-300">Contenido</label>
                            <textarea v-model="newPoint.content" id="new-content"
                                class="w-full p-2 border border-gray-300 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg"
                                placeholder="Ingresa el contenido del punto" rows="3"></textarea>
                        </div>
                        <div class="flex justify-end gap-3">
                            <button type="button" @click="toggleNewPointForm"
                                class="px-4 py-2 bg-gray-100 dark:bg-rv-darkCard text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-lg font-medium transition-colors">
                                Cancelar
                            </button>
                            <button type="submit"
                                class="px-4 py-2 bg-rv-purple text-white rounded-lg hover:bg-rv-pink transition-colors">
                                Añadir Punto
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Listado de puntos -->
                <ul class="space-y-4">
                    <li v-for="(point, index) in points" :key="point.id"
                        class="border border-gray-300 dark:border-white/10 rounded-lg p-4 bg-white dark:bg-rv-darkCard shadow-md">
                        <div class="flex justify-between items-center gap-2">
                            <div class="flex items-center gap-3 min-w-0">
                                <input type="checkbox" :checked="point.done"
                                    @change="togglePointDone(point.id, $event.target.checked)"
                                    class="form-checkbox h-6 w-6 text-blue-600 shrink-0" />
                                <strong class="text-gray-900 dark:text-white truncate">{{ point.titulo }}</strong>
                            </div>
                            <div class="flex gap-2 shrink-0">
                                <button @click="toggleEditPointForm(index)"
                                    class="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                                    title="Editar punto">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button @click="deletePointConfirm(point)"
                                    class="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    title="Eliminar punto">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                                <button @click="toggleContentVisibility(index)"
                                    class="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                    title="Ver contenido">
                                    <i :class="point.showContent ? 'fa-solid fa-minus' : 'fa-solid fa-chevron-down'"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Contenido del punto -->
                        <div v-if="point.showContent" class="mt-4 bg-gray-100 dark:bg-rv-darkSurface p-4 rounded-lg">
                            <p class="text-gray-600 dark:text-gray-300 text-sm" v-html="formatContent(point.content)"></p>
                        </div>

                        <!-- Formulario para editar punto -->
                        <div v-if="editingIndex === index" class="mt-4 bg-gray-100 dark:bg-rv-darkSurface p-4 rounded-lg shadow-md">
                            <h4 class="font-semibold mb-4 text-gray-900 dark:text-white">Editar Punto</h4>
                            <form @submit.prevent="updatePointReunion(editPointData.id, index)" class="space-y-4">
                                <div>
                                    <label for="edit-titulo" class="block font-medium text-gray-700 dark:text-gray-300">Título</label>
                                    <input v-model="editPointData.titulo" type="text" id="edit-titulo"
                                        class="w-full p-2 border border-gray-300 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg" required />
                                </div>
                                <div>
                                    <label for="edit-content" class="block font-medium text-gray-700 dark:text-gray-300">Contenido</label>
                                    <textarea v-model="editPointData.content" id="edit-content"
                                        class="w-full p-2 border border-gray-300 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg" rows="3"></textarea>
                                </div>
                                <div class="flex justify-end gap-3">
                                    <button type="button" @click="cancelEdit"
                                        class="px-4 py-2 bg-gray-100 dark:bg-rv-darkCard text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-lg font-medium transition-colors">
                                        Cancelar
                                    </button>
                                    <button type="submit"
                                        class="px-4 py-2 bg-rv-purple text-white rounded-lg hover:bg-rv-pink transition-colors">
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </li>
                </ul>

                <div v-if="points.length === 0" class="text-center py-8 text-gray-400 dark:text-gray-500">
                    <p>No hay puntos en esta reunión</p>
                </div>
            </div>
        </div>

        <!-- Modal de confirmación para eliminar punto -->
        <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            @click.self="cancelDelete">
            <div class="bg-white dark:bg-rv-darkCard rounded-lg p-6 w-full max-w-md shadow-xl">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-trash text-red-600 dark:text-red-400 text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white">Eliminar Punto</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Esta acción no se puede deshacer</p>
                    </div>
                </div>
                <p class="text-gray-700 dark:text-gray-300 mb-6">¿Estás seguro de que deseas eliminar el punto "<strong>{{ pointToDelete?.titulo }}</strong>"?</p>
                <div class="flex justify-end gap-3">
                    <button @click="cancelDelete"
                        class="px-4 py-2 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-lg font-medium transition-colors">
                        Cancelar
                    </button>
                    <button @click="confirmDelete"
                        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                        <i class="fa-solid fa-trash"></i>
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { defineComponent, ref, watch } from "vue";
import SwalService from "@services/swal/SwalService";
import { getReunionDetails, updateReunion, deleteReunion } from "@services/reunions/reunions";
import { deletePoint, updatePoint, postPoint } from "@services/points/point";

export default defineComponent({
    name: "ReunionEditModal",
    props: {
        show: { type: Boolean, required: true },
        reunionId: { type: String, default: null },
    },
    emits: ['close', 'updated', 'deleted'],
    setup(props, { emit }) {
        const reunion = ref({ title: "", date: "" });
        const showEditReunionForm = ref(false);
        const newPoint = ref({ titulo: "", content: "" });
        const points = ref([]);
        const showNewPointForm = ref(false);
        const editingIndex = ref(null);
        const editPointData = ref({ titulo: "", content: "" });
        const showDeleteConfirm = ref(false);
        const pointToDelete = ref(null);

        const formatContent = (text) => text ? text.replace(/\n/g, "<br>") : '';
        const formatDate = (dateString) => new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const fetchReunion = async () => {
            if (!props.reunionId) return;
            try {
                const response = await getReunionDetails(props.reunionId);
                reunion.value = {
                    title: response.title,
                    date: new Date(response.date).toISOString().slice(0, 16),
                };
                points.value = response.points.map((point) => ({ ...point, showContent: false }));
            } catch (error) {
                SwalService.error("No se pudo cargar la reunión.");
            }
        };

        const reloadReunion = async () => {
            await fetchReunion();
            SwalService.success("Datos recargados correctamente");
        };

        const updateReunionFunction = async () => {
            try {
                await updateReunion(props.reunionId, { title: reunion.value.title, date: reunion.value.date });
                SwalService.success('Reunión actualizada con éxito.');
                showEditReunionForm.value = false;
                emit('updated');
            } catch (error) {
                SwalService.error('No se pudo actualizar la reunión.');
            }
        };

        const toggleEditReunionForm = () => { showEditReunionForm.value = !showEditReunionForm.value; };

        const addPoint = async () => {
            try {
                const response = await postPoint({
                    titulo: newPoint.value.titulo,
                    content: newPoint.value.content,
                    reunionId: props.reunionId,
                });
                points.value.push({ ...response, showContent: false });
                newPoint.value = { titulo: "", content: "" };
                showNewPointForm.value = false;
                SwalService.success("Punto añadido con éxito.");
            } catch (error) {
                SwalService.error("No se pudo añadir el punto.");
            }
        };

        const toggleNewPointForm = () => { showNewPointForm.value = !showNewPointForm.value; };

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
                await updatePoint(id, { titulo: editPointData.value.titulo, content: editPointData.value.content });
                points.value[index].titulo = editPointData.value.titulo;
                points.value[index].content = editPointData.value.content;
                editingIndex.value = null;
                SwalService.success("Punto actualizado con éxito.");
            } catch (error) {
                SwalService.error("No se pudo actualizar el punto.");
            }
        };

        const cancelEdit = () => {
            editingIndex.value = null;
            editPointData.value = { titulo: "", content: "" };
        };

        const deletePointConfirm = (point) => {
            pointToDelete.value = point;
            showDeleteConfirm.value = true;
        };

        const confirmDelete = async () => {
            try {
                await deletePoint(pointToDelete.value.id);
                points.value = points.value.filter((p) => p.id !== pointToDelete.value.id);
                SwalService.success("Punto eliminado con éxito.");
                showDeleteConfirm.value = false;
                pointToDelete.value = null;
            } catch (error) {
                SwalService.error("No se pudo eliminar el punto.");
            }
        };

        const cancelDelete = () => {
            showDeleteConfirm.value = false;
            pointToDelete.value = null;
        };

        const confirmDeleteReunion = async () => {
            const result = await SwalService.confirm(
                '¿Eliminar reunión?',
                `Vas a eliminar "${reunion.value.title}" y todos sus puntos. Esta acción no se puede deshacer.`,
                'Sí, eliminar', 'Cancelar'
            );
            if (result.isConfirmed) {
                try {
                    await deleteReunion(props.reunionId);
                    SwalService.success('Reunión eliminada');
                    emit('deleted', props.reunionId);
                    emit('close');
                } catch (error) {
                    SwalService.error('No se pudo eliminar la reunión');
                }
            }
        };

        const togglePointDone = async (id, done) => {
            try {
                await updatePoint(id, { done });
                const updatedPoint = points.value.find((p) => p.id === id);
                if (updatedPoint) updatedPoint.done = done;
            } catch (error) {
                SwalService.error("No se pudo actualizar el estado del punto.");
            }
        };

        watch(() => props.show, (newVal) => {
            if (newVal && props.reunionId) fetchReunion();
        }, { immediate: true });

        return {
            formatDate, formatContent, reunion, showEditReunionForm, newPoint, points,
            showNewPointForm, editingIndex, editPointData, addPoint, toggleEditReunionForm,
            updateReunionFunction, toggleNewPointForm, toggleEditPointForm, toggleContentVisibility,
            updatePointReunion, cancelEdit, deletePointConfirm, confirmDelete, cancelDelete,
            showDeleteConfirm, pointToDelete, togglePointDone, reloadReunion, confirmDeleteReunion,
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

.dark .form-checkbox {
    background-color: #2a2b3d;
    border-color: rgba(255, 255, 255, 0.2);
}

.form-checkbox:checked {
    background-color: #3b82f6;
    border-color: #3b82f6;
}
</style>
