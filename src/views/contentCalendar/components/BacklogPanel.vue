<template>
    <div class="w-80 h-full bg-white dark:bg-rv-darkCard border-r border-gray-200 dark:border-white/10 flex flex-col overflow-hidden">
        <div class="p-4 border-b border-gray-200 dark:border-white/10">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-bold text-gray-900 dark:text-white">Backlog</h2>
                <button @click="$emit('close')"
                    class="w-7 h-7 flex items-center justify-center rounded-full bg-rv-pink/10 text-rv-pink hover:bg-rv-pink hover:text-white transition-all"
                    title="Cerrar backlog">
                    <i class="fa-solid fa-chevron-left text-sm"></i>
                </button>
            </div>
            <button @click="$emit('create-new')"
                class="w-full bg-gradient-to-r from-rv-purple to-rv-pink text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all shadow-md text-sm font-semibold">
                + Nuevo Evento
            </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-3" ref="backlogContainerRef">
            <div v-for="content in backlogItems" :key="content.id"
                :data-event='JSON.stringify({ title: content.name, id: content.id, extendedProps: { author: content.author } })'
                class="fc-event p-4 bg-white dark:bg-rv-darkSurface border-2 rounded-lg cursor-move hover:shadow-lg transition-all" :class="[
                    getContentTypeClass(content.type),
                    showOnlyMyEvents && content.author?.id === userId ? 'ring-2 ring-rv-pink ring-offset-2' : '',
                    showOnlyMyEvents && content.author?.id !== userId ? 'opacity-30 grayscale' : ''
                ]" @click="$emit('edit-content', content)">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs font-semibold px-2 py-1 rounded"
                                :class="getContentTypeBadge(content.type)">
                                {{ getContentTypeLabel(content.type) }}
                            </span>
                        </div>
                        <h3 class="font-bold text-base text-gray-900 dark:text-white mb-2">{{ content.name }}</h3>
                        <p v-if="content.notes" class="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{{ content.notes }}</p>

                        <!-- Author/Editor info + Delete -->
                        <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
                            <div class="flex items-center gap-2">
                                <div class="flex items-center -space-x-1.5">
                                    <img v-if="content.author?.image" :src="content.author.image"
                                        :alt="content.author.username"
                                        class="w-6 h-6 rounded-full object-cover border border-white"
                                        :title="content.author.username" />
                                    <img v-if="getEditor(content)?.image" :src="getEditor(content).image"
                                        :alt="getEditor(content).username"
                                        class="w-6 h-6 rounded-full object-cover border border-white"
                                        :title="'Editor: ' + getEditor(content).username" />
                                </div>
                                <span class="text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[120px]">
                                    {{ content.author?.username }}{{ getEditor(content) ? ` / ${getEditor(content).username}` : '' }}
                                </span>
                            </div>
                            <button @click.stop="$emit('delete-content', content)"
                                class="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 transition-colors"
                                title="Eliminar">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="backlogItems.length === 0" class="text-center py-8 text-gray-400 dark:text-gray-500">
                <p class="text-sm">No hay eventos sin programar</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Content } from '@services/contents/contents';

interface Props {
    backlogItems: Content[];
    showOnlyMyEvents: boolean;
    userId: string | null;
}

defineProps<Props>();

defineEmits<{
    'create-new': [];
    'edit-content': [content: Content];
    'delete-content': [content: Content];
    'close': [];
}>();

const backlogContainerRef = ref<HTMLElement | null>(null);

function getContentTypeClass(type: string): string {
    const classes: Record<string, string> = {
        article: 'border-blue-500',
        photos: 'border-pink-500',
        spotify: 'border-green-500',
        radar: 'border-orange-500',
        best: 'border-red-500',
        video: 'border-purple-500',
        reunion: 'border-orange-600'
    };
    return classes[type] || 'border-gray-500';
}

function getContentTypeBadge(type: string): string {
    const badges: Record<string, string> = {
        article: 'bg-blue-100 text-blue-700',
        photos: 'bg-pink-100 text-pink-700',
        spotify: 'bg-green-100 text-green-700',
        radar: 'bg-orange-100 text-orange-700',
        best: 'bg-red-100 text-red-700',
        video: 'bg-purple-100 text-purple-700',
        reunion: 'bg-orange-100 text-orange-700'
    };
    return badges[type] || 'bg-gray-100 text-gray-700';
}

function getEditor(content: any): any {
    return content.article?.editor || content.video?.editor || null;
}

function getContentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        article: 'Artículo',
        photos: 'Fotos',
        spotify: 'Spotify',
        radar: 'Radar',
        best: 'Mejores del Mes',
        video: 'Video',
        reunion: 'Reunión'
    };
    return labels[type] || type;
}

defineExpose({ backlogContainerRef });
</script>
