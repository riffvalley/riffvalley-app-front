<template>
    <div v-if="show"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
        @click.self="$emit('close')">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 flex flex-col max-h-[90vh]">
            <div class="flex justify-between items-center mb-6 border-b pb-4">
                <div>
                    <h3 class="text-2xl font-bold text-gray-800">{{ content?.name }}</h3>
                    <div class="flex items-center gap-3 mt-1">
                        <p class="text-gray-500 text-sm">Gestión de asignaciones y detalles</p>
                        <div v-if="content?.publicationDate" class="flex items-center gap-1.5 text-xs text-gray-500">
                            <i class="fa-solid fa-calendar-check text-indigo-400"></i>
                            <span>{{ formatContentDate(content.publicationDate) }}</span>
                            <template v-if="content?.closeDate">
                                <span class="text-gray-300">→</span>
                                <span>{{ formatContentDate(content.closeDate) }}</span>
                            </template>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-4">
                    <div v-if="radarDetails"
                        class="flex items-center gap-2 bg-indigo-900/10 p-1 rounded-lg border border-indigo-500/20 mr-2">
                        <div class="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/80 rounded-md text-white border border-indigo-500/30 shadow-sm"
                            title="Fecha Lista">
                            <i class="fa-regular fa-calendar text-indigo-300 text-xs"></i>
                            <input type="date" :value="formatRadarDate(radarDetails.listDate)" :min="radarMinListDate"
                                :max="radarMaxListDate"
                                @change="(e) => $emit('update-field', 'listDate', (e.target as HTMLInputElement).value)"
                                class="bg-transparent border-none p-0 text-white text-xs font-bold focus:ring-0 cursor-pointer w-[80px]" />
                        </div>
                        <div v-if="content?.type !== 'best'"
                            class="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/80 rounded-md text-white border border-indigo-500/30 shadow-sm"
                            title="Fecha Cierre">
                            <i class="fa-regular fa-clock text-indigo-300 text-xs"></i>
                            <input type="date" :value="formatRadarDate(radarDetails.closeDate)" :min="radarMinCloseDate"
                                :max="radarMaxCloseDate"
                                @change="(e) => $emit('update-field', 'closeDate', (e.target as HTMLInputElement).value)"
                                class="bg-transparent border-none p-0 text-white text-xs font-bold focus:ring-0 cursor-pointer w-[80px]" />
                        </div>
                    </div>

                    <div v-if="radarDetails" class="relative">
                        <select v-model="radarDetails.status" @change="$emit('update-status', radarDetails)"
                            :class="getStatusClass(radarDetails.status)"
                            class="appearance-none pl-4 pr-8 py-2 border rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors focus:ring-1 focus:ring-indigo-200 shadow-sm">
                            <option value="new" class="text-gray-900">Nueva</option>
                            <option value="assigned" class="text-gray-900">Asignada</option>
                            <option value="published" class="text-gray-900">Publicada</option>
                        </select>
                        <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none"
                            :class="radarDetails.status === 'new' ? 'text-red-100' : (radarDetails.status === 'assigned' ? 'text-orange-100' : 'text-green-100')"></i>
                    </div>

                    <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto mb-6 custom-scrollbar">
                <div v-if="loading" class="flex justify-center py-10">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>

                <div v-else-if="radarDetails && radarDetails.asignations && radarDetails.asignations.length > 0">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-gray-200">
                                <th class="py-3 px-4 text-sm font-semibold text-gray-600">Álbum / Artista</th>
                                <th class="py-3 px-4 text-sm font-semibold text-gray-600 text-center">Acciones</th>
                                <th class="py-3 px-4 text-sm font-semibold text-gray-600">Usuario</th>
                                <th class="py-3 px-4 text-sm font-semibold text-gray-600 text-center">#</th>
                                <th class="py-3 px-4 text-sm font-semibold text-gray-600 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="asig in radarDetails.asignations" :key="asig.id"
                                class="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                <td class="py-3 px-4">
                                    <div class="flex flex-col">
                                        <span class="font-medium text-gray-800">{{ asig.disc?.name || "Desconocido" }}</span>
                                        <span class="text-xs text-gray-500">{{ asig.disc?.artist?.name || "Artista desconocido" }}</span>
                                    </div>
                                </td>
                                <td class="py-3 px-4 text-center">
                                    <div class="flex items-center justify-center gap-2">
                                        <a v-if="asig.disc?.link" :href="asig.disc.link" target="_blank"
                                            class="w-8 h-8 flex items-center justify-center bg-gray-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                                            title="Spotify">
                                            <i class="fa-brands fa-spotify text-sm"></i>
                                        </a>
                                        <button
                                            @click="$emit('copy-artist-disc', asig.disc?.artist?.name || '', asig.disc?.name || '')"
                                            class="w-8 h-8 flex items-center justify-center bg-gray-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                                            title="Copiar Info">
                                            <i class="fa-solid fa-clipboard text-sm"></i>
                                        </button>
                                        <button @click="$emit('copy-image', asig.disc?.image || '')"
                                            class="w-8 h-8 flex items-center justify-center bg-gray-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                                            title="Copiar Imagen">
                                            <i class="fa-solid fa-image text-sm"></i>
                                        </button>
                                    </div>
                                </td>
                                <td class="py-3 px-4">
                                    <div class="flex items-center gap-2">
                                        <img v-if="asig.user?.image" :src="asig.user.image"
                                            class="w-6 h-6 rounded-full object-cover" />
                                        <div v-else
                                            class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                            {{ asig.user?.username?.charAt(0).toUpperCase() || '?' }}
                                        </div>
                                        <span class="text-sm text-gray-700">{{ asig.user?.username || 'Sin asignar'
                                            }}</span>
                                    </div>
                                </td>
                                <td class="py-3 px-4 text-center">
                                    <span v-if="asig.position > 0"
                                        class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                                        {{ asig.position }}
                                    </span>
                                    <span v-else class="text-gray-400">-</span>
                                </td>
                                <td class="py-3 px-4 text-center">
                                    <label class="inline-flex items-center cursor-pointer">
                                        <input type="checkbox" :checked="asig.done"
                                            @change="$emit('toggle-asignation', asig)"
                                            class="form-checkbox h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 transition duration-150 ease-in-out">
                                    </label>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-else class="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
                    No hay asignaciones en esta lista.
                </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button v-if="content?.list" @click="$emit('delete-list')"
                    class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2 transition-colors">
                    <i class="fa-solid fa-trash"></i>
                    Borrar Lista
                </button>
                <button v-else @click="$emit('delete')"
                    class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2 transition-colors">
                    <i class="fa-solid fa-trash"></i>
                    Borrar Evento
                </button>
                <button v-if="content?.list" @click="$emit('navigate-detail')"
                    class="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 flex items-center gap-2 transition-colors">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    Ir al Detalle
                </button>
                <button @click="$emit('close')"
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    Cerrar
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Content } from '@services/contents/contents';

interface RadarDetails {
    listDate: string;
    closeDate: string;
    status: string;
    asignations: any[];
}

interface Props {
    show: boolean;
    content: Content | null;
    radarDetails: RadarDetails | null;
    loading: boolean;
}

const props = defineProps<Props>();

defineEmits<{
    close: [];
    'update-field': [field: string, value: string];
    'update-status': [details: RadarDetails];
    'toggle-asignation': [asig: any];
    'delete-list': [];
    'delete': [];
    'navigate-detail': [];
    'copy-artist-disc': [artist: string, disc: string];
    'copy-image': [image: string];
}>();

const radarMinListDate = computed(() => {
    if (!props.radarDetails?.listDate) return undefined;
    const d = new Date(props.radarDetails.listDate);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
});

const radarMaxListDate = computed(() => {
    if (!props.radarDetails?.listDate) return undefined;
    const d = new Date(props.radarDetails.listDate);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
});

const radarMinCloseDate = computed(() => {
    if (!props.radarDetails?.listDate) return undefined;
    return formatRadarDate(props.radarDetails.listDate);
});

const radarMaxCloseDate = computed(() => {
    if (!props.radarDetails?.closeDate) return undefined;
    const d = new Date(props.radarDetails.closeDate);
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
});

function formatRadarDate(dateStr: string): string {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
}

function formatContentDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getStatusClass(status: string): string {
    const classes: Record<string, string> = {
        new: 'bg-red-600 text-white border-red-700',
        assigned: 'bg-orange-500 text-white border-orange-600',
        published: 'bg-green-600 text-white border-green-700'
    };
    return classes[status] || 'bg-gray-500 text-white border-gray-600';
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #555;
}
</style>
