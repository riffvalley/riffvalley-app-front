<template>
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click.self="$emit('close')">
        <div class="bg-white dark:bg-rv-darkCard rounded-lg p-6 w-full max-w-2xl shadow-xl">
            <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-white">Nuevo Contenido</h3>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                    <select v-model="formData.type"
                        class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2">
                        <option value="article">Artículo</option>
                        <option value="photos">Fotos</option>
                        <option value="radar">Radar</option>
                        <option value="best">Mejores Discos</option>
                        <option value="video">Video</option>
                        <option value="reunion">Reunión</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                    <input v-model="formData.name" type="text"
                        class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2"
                        placeholder="Título del contenido" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                    <textarea v-model="formData.notes"
                        class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2"
                        rows="3" placeholder="Descripción o notas..."></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Autor</label>
                    <select v-model="formData.authorId"
                        class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2">
                        <option value="">Seleccionar autor...</option>
                        <option v-for="user in rvUsers" :key="user.id" :value="user.id">
                            {{ user.username }}
                        </option>
                    </select>
                </div>

                <!-- Radar: Year + Month + Week selectors -->
                <div v-if="formData.type === 'radar'" class="space-y-4">
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Año <span class="text-red-600">*</span>
                            </label>
                            <select v-model="formData.selectedYear" @change="handleYearChange"
                                class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2">
                                <option :value="2025">2025</option>
                                <option :value="2026">2026</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mes <span class="text-red-600">*</span>
                            </label>
                            <select v-model="formData.selectedMonth" @change="updateRadarListDate"
                                class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2">
                                <option v-for="month in 12" :key="month" :value="month">
                                    {{ getMonthName(month) }}
                                </option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Semana <span class="text-red-600">*</span>
                            </label>
                            <select v-model="formData.selectedWeek" @change="updateRadarListDate"
                                class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2">
                                <option v-for="week in getWeeksInMonth(formData.selectedMonth, formData.selectedYear)"
                                    :key="week" :value="week">
                                    Semana {{ week }}
                                </option>
                            </select>
                        </div>
                    </div>
                    <div v-if="formData.listDate" class="text-sm text-gray-600 dark:text-gray-400">
                        📅 Fecha de lista: <strong>{{ formatDisplayDate(formData.listDate) }}</strong>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Fecha de Publicación <span class="text-red-600">*</span>
                            </label>
                            <input v-model="formData.publicationDate" type="datetime-local"
                                class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2"
                                :class="{ 'border-red-500': !formData.publicationDate }"
                                :min="formData.listDate ? formatDateTime(formData.listDate) : undefined" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Fecha Cierre
                            </label>
                            <input v-model="formData.closeDate" type="date"
                                class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2"
                                :min="formData.publicationDate ? formData.publicationDate.split('T')[0] : (formData.listDate ? formData.listDate : undefined)" />
                        </div>
                    </div>
                </div>

                <!-- Best/Video: Year + Month selector -->
                <div v-else-if="['best', 'video'].includes(formData.type)" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Año <span class="text-red-600">*</span>
                            </label>
                            <select v-model="formData.selectedYear" @change="handleYearChange"
                                class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2">
                                <option :value="2025">2025</option>
                                <option :value="2026">2026</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mes <span class="text-red-600">*</span>
                            </label>
                            <select v-model="formData.selectedMonth" @change="updateBestVideoListDate"
                                class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2">
                                <option v-for="month in 12" :key="month" :value="month">
                                    {{ getMonthName(month) }}
                                </option>
                            </select>
                        </div>
                    </div>
                    <div v-if="formData.listDate" class="text-sm text-gray-600 dark:text-gray-400">
                        📅 Fecha de lista: <strong>{{ formatDisplayDate(formData.listDate) }}</strong> (día 15 del mes)
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Fecha de Publicación <span v-if="formData.type === 'best'" class="text-red-600">*</span>
                        </label>
                        <input v-model="formData.publicationDate" type="datetime-local"
                            class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2"
                            :class="{ 'border-red-500': formData.type === 'best' && !formData.publicationDate }" />
                        <p v-if="formData.type === 'best'" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Este tipo de contenido requiere una fecha obligatoria
                        </p>
                    </div>
                </div>

                <!-- Other types: Regular publication date -->
                <div v-else>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fecha de Publicación
                        <span v-if="formData.type === 'reunion'" class="text-red-600">*</span>
                    </label>
                    <input v-model="formData.publicationDate" type="datetime-local"
                        class="w-full border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg px-3 py-2"
                        :class="{ 'border-red-500': formData.type === 'reunion' && !formData.publicationDate }" />
                    <p v-if="formData.type === 'reunion'" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Este tipo de contenido requiere una fecha obligatoria
                    </p>
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-6">
                <button @click="$emit('close')"
                    class="px-4 py-2 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-lg transition-colors font-medium">
                    Cancelar
                </button>
                <button @click="handleCreate"
                    class="px-4 py-2 bg-rv-purple text-white rounded-lg hover:bg-rv-pink transition-colors">
                    Crear
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ContentType } from '@services/contents/contents';
import { MONTHS } from '@helpers/dateConstants';

interface Props {
    show: boolean;
    rvUsers: any[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
    close: [];
    create: [data: any];
}>();

const formData = ref({
    type: 'article' as ContentType,
    name: '',
    notes: '',
    publicationDate: '',
    closeDate: '',
    authorId: '',
    listDate: '',
    selectedMonth: new Date().getMonth() + 1,
    selectedWeek: 1,
    selectedYear: new Date().getFullYear()
});

// Watch for modal opening or type change to auto-fill name
watch([() => props.show, () => formData.value.type], ([isOpen, type]) => {
    if (isOpen) {
        // Reset dates that might have been set by other types
        formData.value.listDate = '';
        formData.value.closeDate = '';

        if (type === 'radar') {
            updateRadarListDate();
        } else if (['best', 'video'].includes(type)) {
            updateBestVideoListDate();
        }

        // Auto-select RiffValley user
        const riffValleyUser = props.rvUsers.find(u => u.username === 'RiffValley');
        if (riffValleyUser && !formData.value.authorId) {
            formData.value.authorId = riffValleyUser.id;
        }
    }
});

function getMonthName(month: number): string {
    return MONTHS[month - 1];
}

function getWeeksInMonth(month: number, year: number): number {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    let current = new Date(firstDay);
    const dayOfWeek = current.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
    if (daysUntilMonday > 0) {
        current.setDate(current.getDate() + daysUntilMonday);
    }

    let weekCount = 0;
    while (current <= lastDay) {
        weekCount++;
        current.setDate(current.getDate() + 7);
    }

    return weekCount || 1;
}

function getFridayOfWeek(month: number, week: number, year: number): string {
    const firstDay = new Date(year, month - 1, 1);

    let monday = new Date(firstDay);
    const dayOfWeek = monday.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
    monday.setDate(monday.getDate() + daysUntilMonday);

    monday.setDate(monday.getDate() + (week - 1) * 7);

    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);

    return friday.toISOString().split('T')[0];
}

function updateRadarListDate() {
    formData.value.listDate = getFridayOfWeek(formData.value.selectedMonth, formData.value.selectedWeek, formData.value.selectedYear);

    const monthName = getMonthName(formData.value.selectedMonth);
    formData.value.name = `Discos ${monthName} Semana ${formData.value.selectedWeek}`;

    const listDateObj = new Date(formData.value.listDate);
    const saturday = new Date(listDateObj);
    saturday.setDate(saturday.getDate() + 1);
    formData.value.publicationDate = saturday.toISOString().split('T')[0] + 'T12:00';

    const sunday = new Date(listDateObj);
    sunday.setDate(sunday.getDate() + 2);
    formData.value.closeDate = sunday.toISOString().split('T')[0];
}

function formatDateTime(dateStr: string): string {
    if (!dateStr) return '';
    return dateStr + 'T00:00';
}

function updateBestVideoListDate() {
    const date = new Date(formData.value.selectedYear, formData.value.selectedMonth - 1, 15);
    formData.value.listDate = date.toISOString().split('T')[0];

    if (formData.value.type === 'best') {
        const monthName = getMonthName(formData.value.selectedMonth);
        formData.value.name = `Mejores Discos de ${monthName}`;

        const nextMonth = new Date(formData.value.selectedYear, formData.value.selectedMonth, 1);
        const dayOfWeek = nextMonth.getDay();
        const daysUntilThursday = (4 - dayOfWeek + 7) % 7;

        nextMonth.setDate(nextMonth.getDate() + daysUntilThursday);
        nextMonth.setHours(19, 0, 0, 0);

        const localDate = new Date(nextMonth.getTime() - nextMonth.getTimezoneOffset() * 60000);
        formData.value.publicationDate = localDate.toISOString().slice(0, 16);
    }
}

function handleYearChange() {
    formData.value.selectedMonth = 1;
    formData.value.selectedWeek = 1;

    if (formData.value.type === 'radar') {
        updateRadarListDate();
    } else if (['best', 'video'].includes(formData.value.type)) {
        updateBestVideoListDate();
    }
}

function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function handleCreate() {
    emit('create', { ...formData.value });
}

// Initialize listDate on mount
if (props.show) {
    updateBestVideoListDate();
    updateRadarListDate();
}
</script>
