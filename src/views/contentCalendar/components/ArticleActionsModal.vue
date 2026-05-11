<template>
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click.self="$emit('close')">
        <div class="bg-white dark:bg-rv-darkCard rounded-2xl p-8 w-full max-w-2xl shadow-2xl relative overflow-hidden">
            <div class="absolute top-0 right-0 w-64 h-64 bg-blue-50 dark:bg-rv-blue/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div class="relative z-10">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider rounded-md">
                            Artículo
                        </span>
                        <span v-if="articleData?.type"
                            class="px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-md"
                            :class="getArticleTypeColor(articleData.type)">
                            {{ articleData.type }}
                        </span>
                    </div>
                    <button @click="$emit('close')"
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-rv-darkSurface">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div class="space-y-6">
                    <div>
                        <input v-model="formData.name" type="text"
                            class="w-full text-3xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-none focus:ring-0 p-0 bg-transparent"
                            placeholder="Título del artículo..." />
                        <button @click="$emit('navigate-kanban')"
                            class="mt-2 text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                            <span>Ver en tablero de artículos</span>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Notas</label>
                                <textarea v-model="formData.notes"
                                    class="w-full border-0 bg-gray-50 dark:bg-rv-darkSurface rounded-xl px-4 py-3 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-100 dark:focus:ring-rv-blue/20 focus:bg-white dark:focus:bg-rv-darkBg transition-all resize-none text-sm leading-relaxed"
                                    rows="4"
                                    placeholder="Notas sobre el artículo..."></textarea>
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tipo de artículo</label>
                                <select v-model="formData.articleType"
                                    class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg text-sm">
                                    <option v-for="t in ARTICLE_TYPES" :key="t" :value="t">{{ t }}</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Enlace</label>
                                <input v-model="formData.link" type="url"
                                    class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg text-sm"
                                    placeholder="https://..." />
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Estado</label>
                                <select v-model="formData.articleStatus"
                                    class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg text-sm">
                                    <option v-for="s in ARTICLE_STATES" :key="s" :value="s">{{ getStatusLabel(s) }}</option>
                                </select>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div class="bg-gray-50 dark:bg-rv-darkSurface rounded-xl p-5 space-y-5">
                                <div>
                                    <label class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                        <i class="fa-regular fa-calendar"></i> Fecha de Publicación
                                    </label>
                                    <input v-model="formData.publicationDate" type="datetime-local"
                                        class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg text-sm" />
                                    <button v-if="formData.publicationDate" @click="formData.publicationDate = ''"
                                        class="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mt-2 flex items-center gap-1 transition-colors">
                                        <i class="fa-solid fa-arrow-rotate-left"></i> Mover a backlog
                                    </button>
                                </div>

                                <div>
                                    <label class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                        <i class="fa-regular fa-user"></i> Autor (Calendario)
                                    </label>
                                    <select v-model="formData.authorId"
                                        class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg text-sm">
                                        <option value="">Seleccionar autor...</option>
                                        <option v-for="user in rvUsers" :key="user.id" :value="user.id">
                                            {{ user.username }}
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                        <i class="fa-solid fa-user"></i> Usuario asignado
                                    </label>
                                    <select v-model="formData.userId"
                                        class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg text-sm">
                                        <option value="">Sin asignar</option>
                                        <option v-for="user in rvUsers" :key="user.id" :value="user.id">
                                            {{ user.username }}
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                        <i class="fa-solid fa-pen-nib"></i> Editor
                                    </label>
                                    <select v-model="formData.editorId"
                                        class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg text-sm">
                                        <option value="">Sin editor</option>
                                        <option v-for="user in rvUsers" :key="user.id" :value="user.id">
                                            {{ user.username }}
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-between items-center mt-8 pt-6 border-t border-gray-100 dark:border-white/10">
                    <button @click="$emit('delete')"
                        class="group flex items-center gap-2 text-gray-400 hover:text-red-600 transition-colors px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Eliminar permanentemente">
                        <i class="fa-regular fa-trash-can text-lg group-hover:scale-110 transition-transform"></i>
                        <span class="text-sm font-medium">Eliminar</span>
                    </button>

                    <div class="flex gap-3">
                        <button @click="$emit('close')"
                            class="px-6 py-2.5 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg font-medium rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button @click="handleUpdate"
                            class="px-6 py-2.5 bg-rv-purple text-white font-medium rounded-xl hover:bg-rv-pink shadow-lg transition-all transform hover:-translate-y-0.5">
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Content } from '@services/contents/contents';
import { ARTICLE_TYPES, ARTICLE_STATES, type ArticleState, type ArticleType } from '@services/articles/articles';

interface Props {
    show: boolean;
    content: Content;
    rvUsers: any[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
    close: [];
    update: [data: any];
    'update-article': [data: any];
    delete: [];
    'navigate-kanban': [];
}>();

const articleData = ref(props.content.article);

function formatForInput(dateStr: string): string {
    if (!dateStr) return '';
    if (dateStr.endsWith('Z')) {
        if (dateStr.endsWith('T00:00:00.000Z') || dateStr.endsWith('T00:00:00Z')) {
            return dateStr.slice(0, 16);
        }
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    if (dateStr.length >= 16) return dateStr.slice(0, 16);
    if (dateStr.length === 10) return dateStr + 'T00:00';
    return dateStr;
}

function getStatusLabel(status: ArticleState): string {
    const labels: Record<ArticleState, string> = {
        not_started: 'Not Started',
        in_progress: 'In Progress',
        editing: 'Reviewing',
        ready: 'Ready',
        published: 'Published'
    };
    return labels[status];
}

function getArticleTypeColor(type: ArticleType): string {
    switch (type) {
        case 'cronica': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        case 'festival': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
        case 'review': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
        case 'entrevista': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
        case 'articulo':
        default: return 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300';
    }
}

const formData = ref({
    type: 'article' as const,
    name: props.content.name,
    notes: props.content.notes || '',
    publicationDate: formatForInput(props.content.publicationDate || ''),
    authorId: (props.content as any).authorId || props.content.author?.id || '',
    articleType: props.content.article?.type || 'articulo' as ArticleType,
    articleStatus: props.content.article?.status || 'not_started' as ArticleState,
    link: props.content.article?.link || '',
    userId: props.content.article?.userId || props.content.article?.user?.id || '',
    editorId: props.content.article?.editorId || props.content.article?.editor?.id || ''
});

watch(() => props.content, (newContent) => {
    articleData.value = newContent.article;
    formData.value = {
        type: 'article',
        name: newContent.name,
        notes: newContent.notes || '',
        publicationDate: formatForInput(newContent.publicationDate || ''),
        authorId: (newContent as any).authorId || newContent.author?.id || '',
        articleType: newContent.article?.type || 'articulo',
        articleStatus: newContent.article?.status || 'not_started',
        link: newContent.article?.link || '',
        userId: newContent.article?.userId || newContent.article?.user?.id || '',
        editorId: newContent.article?.editorId || newContent.article?.editor?.id || ''
    };
}, { deep: true });

function handleUpdate() {
    emit('update', {
        type: formData.value.type,
        name: formData.value.name,
        notes: formData.value.notes,
        publicationDate: formData.value.publicationDate,
        authorId: formData.value.authorId
    });

    if (props.content.article?.id) {
        emit('update-article', {
            articleId: props.content.article.id,
            name: formData.value.name,
            type: formData.value.articleType,
            status: formData.value.articleStatus,
            link: formData.value.link || undefined,
            userId: formData.value.userId || undefined,
            editorId: formData.value.editorId || undefined
        });
    }
}
</script>
