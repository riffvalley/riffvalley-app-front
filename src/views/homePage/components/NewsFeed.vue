<template>
  <div class="bg-white dark:bg-rv-darkCard shadow-sm rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex-1">
    <div class="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-rv-pink/8 to-rv-purple/8 dark:from-rv-pink/10 dark:to-rv-purple/10 border-b border-gray-100 dark:border-white/10">
      <i class="fa-solid fa-newspaper text-rv-pink"></i>
      <h3 class="font-bold text-gray-900 dark:text-white">Novedades Riff Valley</h3>
    </div>
    <div class="p-4 sm:p-5">

    <!-- ── Barra de filtros ──────────────────────────────────── -->
    <div class="flex flex-wrap gap-1.5 mb-3">
      <button
        type="button"
        @click="resetFilter"
        :aria-pressed="activeFilter === null"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
               transition-all duration-200 border
               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
        :class="activeFilter === null
          ? 'bg-rv-purple text-white border-rv-purple shadow-sm'
          : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/20 hover:border-rv-purple hover:text-rv-purple dark:hover:border-purple-300 dark:hover:text-purple-300'"
      >
        <i class="fa-solid fa-rss text-[9px]"></i>
        Feed
      </button>

      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        @click="toggleFilter(f)"
        :aria-pressed="activeFilter?.key === f.key"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
               transition-all duration-200 border
               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
        :class="activeFilter?.key === f.key ? f.activeClass : f.inactiveClass"
      >
        <i :class="f.icon" class="text-[9px]"></i>
        {{ f.label }}
      </button>
    </div>

    <!-- ── Estados ──────────────────────────────────────────── -->
    <div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-8 text-gray-600 dark:text-gray-300" role="status" aria-live="polite">
      <i class="fa-solid fa-spinner animate-spin text-2xl text-rv-pink" aria-hidden="true"></i>
      <span class="text-sm">Cargando noticias...</span>
    </div>

    <div v-else-if="hasFeedError" class="py-6 text-center" role="alert">
      <p class="mb-2 text-sm text-red-700 dark:text-red-300">No se pudieron cargar las novedades.</p>
      <button type="button" class="rounded px-2 py-1 text-sm font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple" @click="retryFeed">
        Reintentar
      </button>
    </div>

    <div v-else-if="visiblePosts.length === 0" class="py-6 text-center text-sm text-gray-600 dark:text-gray-300" role="status">
      No hay novedades disponibles
    </div>

    <!-- ── Grid ─────────────────────────────────────────────── -->
    <div v-else class="flex flex-col gap-1.5">
      <component
        :is="post.source === 'app' ? 'button' : 'a'"
        v-for="post in visiblePosts"
        :key="post.id"
        v-bind="post.source === 'app' ? {} : { href: post.link, target: '_blank', rel: 'noopener noreferrer' }"
        @click="post.source === 'app' ? openAppPost(post, $event) : undefined"
        class="group text-left w-full min-w-0 block
               bg-transparent border-0 p-0 appearance-none
               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
      >
        <!-- Layout horizontal (todos los tamaños) -->
        <div
          class="flex items-center gap-3 p-3 min-w-0
                 bg-white dark:bg-rv-darkSurface rounded-xl
                 border border-gray-100 dark:border-t-white/10 dark:border-r-white/10 dark:border-b-white/10
                 border-l-4 transition-all duration-200
                 hover:brightness-105 active:scale-[0.98]"
          :class="sourceBorderColor(post.source)"
        >
          <div class="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden">
            <img
              :src="post.image ?? '/news/default.jpg'"
              :alt="post.title"
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div class="flex-1 min-w-0 overflow-hidden">
            <h4 class="text-rv-navy dark:text-white font-bold text-xs leading-snug line-clamp-2 break-words">{{ truncateTitle(post.title) }}</h4>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
              <span class="text-gray-400 text-[9px] shrink-0">{{ post.date }}</span>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0"
                    :class="sourceBadgeClass(post.source)">
                <i :class="sourceBadgeIcon(post.source)" class="text-[7px]"></i>
                {{ sourceLabel(post) }}
              </span>
            </div>
          </div>
          <i
            class="fa-solid text-gray-300 dark:text-white/20 text-xs flex-shrink-0"
            :class="post.source === 'app' ? 'fa-book-open' : 'fa-arrow-up-right-from-square'"
          ></i>
        </div>

      </component>
    </div>

    <!-- ── Modal noticia interna ─────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="selectedNews"
        ref="newsBackdrop"
        class="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/60 z-50 px-4"
      >
        <div
          class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-2xl
                 w-full sm:max-w-2xl relative max-h-[88vh] overflow-y-auto
                 border border-gray-100 dark:border-white/10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="news-dialog-title"
          tabindex="-1"
          ref="newsDialog"
        >
          <!-- Cabecera con imagen -->
          <div class="relative h-40 sm:h-52 flex-shrink-0 overflow-hidden rounded-t-2xl">
            <img
              :src="selectedNews.image"
              :alt="selectedNews.title"
              class="w-full h-full object-cover brightness-75"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

            <!-- Botón cerrar -->
            <button
              @click="closeNewsModal"
              class="absolute top-3 right-3 z-10
                     w-9 h-9 rounded-full bg-black/40 hover:bg-rv-pink backdrop-blur-sm
                     text-white flex items-center justify-center
                     shadow-md transition-all duration-150
                     border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Cerrar"
            >
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>

            <!-- Badge + fecha sobre la imagen -->
            <div class="absolute bottom-3 left-4 flex items-center gap-2">
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-md"
                    :class="typeBadgeClass(selectedNews.type)">
                <i :class="typeBadgeIcon(selectedNews.type)" class="text-[9px]"></i>
                {{ typeLabel(selectedNews.type) }}
              </span>
              <span class="text-white/70 text-[10px]">{{ selectedNews.date }}</span>
            </div>
          </div>

          <!-- Cuerpo -->
          <div class="p-5 sm:p-6">
            <h3 id="news-dialog-title" class="text-lg sm:text-xl font-bold text-rv-navy dark:text-white mb-4 leading-snug">
              {{ selectedNews.title }}
            </h3>
            <div
              ref="newsProse"
              class="news-prose text-gray-700 dark:text-gray-300 text-sm leading-relaxed"
              v-html="selectedNews.body"
            />
          </div>
        </div>
      </div>
    </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { getNewsFeed, getSourceFeed } from '@services/news/news';
import type { FeedPost, FeedParams, NewsType } from '@services/news/news';

const router = useRouter();

// ── Tipos ────────────────────────────────────────────────────

interface NewsPost {
  id: string;
  title: string;
  link: string | null;
  image: string | null;
  date: string;
  source: 'app' | 'riffvalley.es' | 'telegram';
  newsType?: NewsType;
  appBody?: string | null;
}

interface FilterDef {
  key: string;
  label: string;
  icon: string;
  params: FeedParams;
  activeClass: string;
  inactiveClass: string;
}

// ── Filtros disponibles ──────────────────────────────────────

const FILTERS: FilterDef[] = [
  {
    key: 'telegram',
    label: 'Canal conciertos',
    icon: 'fa-brands fa-telegram',
    params: { source: 'telegram', limit: 6 },
    activeClass:   'bg-yellow-400 text-rv-navy border-yellow-400 shadow-sm',
    inactiveClass: 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/20 hover:border-yellow-400 hover:text-yellow-500 dark:hover:border-yellow-400 dark:hover:text-yellow-400',
  },
  {
    key: 'riffvalley',
    label: 'riffvalley.es',
    icon: 'fa-solid fa-globe',
    params: { source: 'riffvalley.es' },
    activeClass:   'bg-rv-pink text-white border-rv-pink shadow-sm',
    inactiveClass: 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/20 hover:border-rv-pink hover:text-rv-pink dark:hover:border-pink-300 dark:hover:text-pink-300',
  },
  {
    key: 'equipo',
    label: 'Equipo',
    icon: 'fa-solid fa-users',
    params: { source: 'app', type: 'team_notes' },
    activeClass:   'bg-rv-blue text-white border-rv-blue shadow-sm',
    inactiveClass: 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/20 hover:border-rv-blue hover:text-rv-blue dark:hover:border-blue-300 dark:hover:text-blue-300',
  },
];

// ── Estado ───────────────────────────────────────────────────

const defaultPosts  = ref<NewsPost[]>([]);
const filteredPosts = ref<NewsPost[]>([]);
const visiblePosts  = ref<NewsPost[]>([]);
const loading       = ref(true);
const activeFilter  = ref<FilterDef | null>(null);
const selectedNews  = ref<{ title: string; type: NewsType; body: string; date: string; image: string } | null>(null);
const hasFeedError = ref(false);
const newsDialog = ref<HTMLElement | null>(null);
const newsBackdrop = ref<HTMLElement | null>(null);
const newsProse = ref<HTMLElement | null>(null);
const newsDialogTrigger = ref<HTMLElement | null>(null);
let initialFeedController: AbortController | null = null;
let sourceFeedController: AbortController | null = null;
let initialFeedCompleted = false;

// ── Lógica de filtros ────────────────────────────────────────

function resetFilter() {
  sourceFeedController?.abort();
  sourceFeedController = null;
  activeFilter.value = null;
  visiblePosts.value = defaultPosts.value;
  loading.value = !initialFeedCompleted;
  hasFeedError.value = false;
}

async function toggleFilter(f: FilterDef) {
  if (activeFilter.value?.key === f.key) {
    resetFilter();
    return;
  }

  sourceFeedController?.abort();
  await loadFilteredPosts(f);
}

async function loadFilteredPosts(filter: FilterDef) {
  sourceFeedController?.abort();
  const controller = new AbortController();
  sourceFeedController = controller;
  activeFilter.value = filter;
  loading.value = true;
  hasFeedError.value = false;
  try {
    const { posts: feedPosts } = await getSourceFeed(filter.params, controller.signal);
    if (controller.signal.aborted) return;
    filteredPosts.value = feedPosts.map(mapFeedPost);
    visiblePosts.value  = filteredPosts.value;
  } catch (e) {
    if (!controller.signal.aborted) {
      console.error('Error filtrando feed:', e);
      visiblePosts.value = [];
      hasFeedError.value = true;
    }
  } finally {
    if (!controller.signal.aborted) loading.value = false;
  }
}

function retryFeed() {
  if (activeFilter.value) {
    void loadFilteredPosts(activeFilter.value);
    return;
  }
  void fetchPosts();
}

// ── Helpers de estilo ────────────────────────────────────────

function sourceBorderColor(source: string) {
  if (source === 'telegram')      return 'border-l-yellow-400';
  if (source === 'riffvalley.es') return 'border-l-rv-pink';
  return 'border-l-rv-blue';
}

function sourceAccentBar(source: string) {
  if (source === 'telegram')      return 'bg-yellow-400';
  if (source === 'riffvalley.es') return 'bg-rv-pink';
  return 'bg-rv-blue';
}

function sourceAccentGlow(source: string) {
  if (source === 'telegram')      return '0 2px 10px 2px rgba(250,204,21,0.6)';
  if (source === 'riffvalley.es') return '0 2px 10px 2px rgba(228,110,138,0.6)';
  return '0 2px 10px 2px rgba(0,100,214,0.6)';
}

function sourceBadgeClass(source: string) {
  if (source === 'telegram')      return 'bg-yellow-400/90 text-rv-navy';
  if (source === 'riffvalley.es') return 'bg-rv-pink/90 text-white';
  return 'bg-rv-blue/90 text-white';
}

function sourceBadgeIcon(source: string) {
  if (source === 'telegram')      return 'fa-brands fa-telegram';
  if (source === 'riffvalley.es') return 'fa-solid fa-globe';
  return 'fa-solid fa-users';
}

function truncateTitle(title: string, max = 70): string {
  if (!title) return '';
  return title.length > max ? title.slice(0, max).trimEnd() + '…' : title;
}

function decodeHtmlEntities(value: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function sourceLabel(post: NewsPost) {
  if (post.source === 'app')           return typeLabel(post.newsType!);
  if (post.source === 'riffvalley.es') return 'riffvalley.es';
  return 'Canal conciertos';
}

function typeLabel(type: NewsType): string {
  const labels: Record<NewsType, string> = {
    version:     'Versión',
    new_feature: 'Novedad',
    team_notes:  'Equipo',
  };
  return labels[type] ?? type;
}

// ── Modal ────────────────────────────────────────────────────

const appTypeImages: Record<string, string> = {
  version:     '/news/version.jpg',
  new_feature: '/news/funcionalidad.jpg',
  team_notes:  '/news/equipo.jpg',
};

async function openAppPost(post: NewsPost, event: MouseEvent) {
  newsDialogTrigger.value = event.currentTarget as HTMLElement;
  selectedNews.value = {
    title: post.title,
    type:  post.newsType!,
    body:  post.appBody!,
    date:  post.date,
    image: post.image ?? appTypeImages[post.newsType!] ?? '/news/default.jpg',
  };
  await nextTick();
  newsDialog.value?.addEventListener('keydown', handleNewsDialogKeydown);
  newsProse.value?.addEventListener('click', handleBodyClick);
  newsDialog.value?.focus();
}

async function closeNewsModal() {
  newsDialog.value?.removeEventListener('keydown', handleNewsDialogKeydown);
  newsProse.value?.removeEventListener('click', handleBodyClick);
  selectedNews.value = null;
  await nextTick();
  newsDialogTrigger.value?.focus();
  newsDialogTrigger.value = null;
}

function handleNewsDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    void closeNewsModal();
    return;
  }
  if (event.key !== 'Tab') return;

  const focusable = newsDialog.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (!focusable?.length) {
    event.preventDefault();
    newsDialog.value?.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === newsBackdrop.value) void closeNewsModal();
}

function typeBadgeClass(type: NewsType) {
  if (type === 'version')     return 'bg-rv-purple/90 text-white';
  if (type === 'new_feature') return 'bg-rv-pink/90 text-white';
  return 'bg-rv-blue/90 text-white';
}

function typeBadgeIcon(type: NewsType) {
  if (type === 'version')     return 'fa-solid fa-code-branch';
  if (type === 'new_feature') return 'fa-solid fa-star';
  return 'fa-solid fa-users';
}

function handleBodyClick(e: MouseEvent) {
  const anchor = (e.target as HTMLElement).closest('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href) return;
  if (href.startsWith('/')) {
    e.preventDefault();
    selectedNews.value = null;
    router.push(href);
  }
}

// ── Fetch inicial ────────────────────────────────────────────

function mapFeedPost(fp: FeedPost): NewsPost {
  const postDate = new Date(fp.date);
  const image = fp.source === 'app' && fp.type
    ? appTypeImages[fp.type] ?? fp.image
    : fp.image;
  return {
    id:       fp.id,
    title:
      fp.source === 'riffvalley.es'
        ? decodeHtmlEntities(fp.title)
        : fp.title,
    link:     fp.link,
    image,
    date:     postDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }),
    source:   fp.source,
    newsType: fp.type ?? undefined,
    appBody:  fp.body,
  };
}

async function fetchPosts() {
  const controller = new AbortController();
  initialFeedController = controller;
  loading.value = true;
  hasFeedError.value = false;
  try {
    const { posts: feedPosts } = await getNewsFeed(controller.signal);
    if (controller.signal.aborted) return;
    defaultPosts.value = feedPosts.map(mapFeedPost);
    visiblePosts.value = defaultPosts.value;
  } catch (error) {
    if (!controller.signal.aborted) {
      console.error('Error fetching news feed:', error);
      hasFeedError.value = true;
      visiblePosts.value = [];
    }
  } finally {
    if (!controller.signal.aborted) {
      loading.value = false;
      initialFeedCompleted = true;
    }
  }
}

onMounted(fetchPosts);
onMounted(() => {
  document.addEventListener('click', handleBackdropClick);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', handleBackdropClick);
  newsDialog.value?.removeEventListener('keydown', handleNewsDialogKeydown);
  newsProse.value?.removeEventListener('click', handleBodyClick);
  initialFeedController?.abort();
  sourceFeedController?.abort();
});
</script>

<style scoped>
:deep(.news-prose p + p) {
  margin-top: 0.75em;
}

:deep(.news-prose a) {
  color: #0c6ddc;
  text-decoration: underline;
  font-weight: 600;
}
:deep(.news-prose a:hover) { opacity: 0.85; }
:deep(.dark .news-prose a) { color: #93c5fd; }
</style>
