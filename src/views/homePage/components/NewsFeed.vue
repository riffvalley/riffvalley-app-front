<template>
  <div>
    <div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-8 text-gray-400">
      <i class="fa-solid fa-spinner animate-spin text-2xl text-rv-pink"></i>
      <span class="text-sm">Cargando noticias...</span>
    </div>

    <div v-else-if="posts.length === 0" class="text-center text-gray-400 py-6">No hay novedades disponibles</div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-2">
      <component
        :is="post.source === 'app' ? 'button' : 'a'"
        v-for="post in posts"
        :key="post.id"
        v-bind="post.source === 'app' ? {} : { href: post.link, target: '_blank', rel: 'noopener noreferrer' }"
        @click="post.source === 'app' ? openAppPost(post) : undefined"
        class="group text-left
               bg-transparent border-0 p-0 appearance-none
               outline-none focus:outline-none focus-visible:outline-none
               ring-0 focus:ring-0 focus-visible:ring-0
               sm:relative sm:block sm:rounded-xl sm:overflow-hidden sm:aspect-square"
      >
        <!-- ── Mobile: layout horizontal ───────────────────── -->
        <div
          class="sm:hidden flex items-center gap-3 p-3
                 bg-white dark:bg-rv-darkSurface rounded-xl
                 border border-gray-100 dark:border-white/10
                 border-l-4 transition-all duration-200
                 active:scale-[0.98]"
          :class="sourceBorderColor(post.source)"
        >
          <div class="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden">
            <img
              :src="post.image ?? '/news/default.jpg'"
              :alt="post.title"
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          <div class="flex-1 min-w-0">
            <h4 class="text-rv-navy dark:text-white font-bold text-xs leading-snug line-clamp-2" v-html="post.title"></h4>
            <div class="flex items-center gap-2 mt-1">
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

        <!-- ── Desktop: tarjeta cuadrada ───────────────────── -->
        <div class="hidden sm:block h-full relative">

          <!-- Barra de color superior por fuente (solo visible en hover) -->
          <div class="absolute top-0 left-0 right-0 h-[6px] z-20
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-300"
               :class="sourceAccentBar(post.source)"
               :style="{ boxShadow: sourceAccentGlow(post.source) }"></div>

          <!-- Imagen de fondo -->
          <img
            :src="post.image ?? '/news/default.jpg'"
            :alt="post.title"
            class="absolute inset-0 w-full h-full object-cover
                   transition-all duration-500 ease-out
                   brightness-[0.80] group-hover:brightness-[0.45]
                   scale-100 group-hover:scale-105"
            loading="lazy"
          />

          <!-- Degradado permanente -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent
                      transition-opacity duration-300 group-hover:opacity-80"></div>

          <!-- Badge fuente — top left -->
          <div class="absolute top-3 left-3 z-10">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold
                         shadow-md backdrop-blur-sm"
                  :class="sourceBadgeClass(post.source)">
              <i :class="sourceBadgeIcon(post.source)" class="text-[8px]"></i>
              {{ sourceLabel(post) }}
            </span>
          </div>

          <!-- Icono de destino — top right, aparece en hover -->
          <div class="absolute top-3 right-3 z-10
                      opacity-0 group-hover:opacity-100
                      translate-y-[-4px] group-hover:translate-y-0
                      transition-all duration-200">
            <span class="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm
                         flex items-center justify-center">
              <i class="fa-solid text-white text-[9px]"
                 :class="post.source === 'app' ? 'fa-book-open' : 'fa-arrow-up-right-from-square'"></i>
            </span>
          </div>

          <!-- Contenido inferior — slide-up en hover -->
          <div class="absolute bottom-0 left-0 right-0 p-3 z-10
                      translate-y-1 group-hover:translate-y-0
                      transition-transform duration-300 ease-out">
            <h4
              class="text-white font-bold text-[12px] sm:text-[13px] leading-snug line-clamp-3
                     drop-shadow-md"
              v-html="post.title"
            ></h4>
            <div class="flex items-center justify-between mt-1.5
                        opacity-0 group-hover:opacity-100
                        translate-y-1 group-hover:translate-y-0
                        transition-all duration-300 delay-75">
              <span class="text-white/60 text-[9px]">{{ post.date }}</span>
              <span class="text-white/50 text-[9px]">
                {{ post.source === 'app' ? 'Leer más' : 'Abrir' }}
                <i class="fa-solid fa-chevron-right text-[7px] ml-0.5"></i>
              </span>
            </div>
          </div>
        </div>

      </component>
    </div>

    <!-- ── Modal noticia interna ─────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="selectedNews"
        class="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/50 z-50"
        @click.self="selectedNews = null"
      >
        <div
          class="bg-white dark:bg-rv-darkCard p-4 sm:p-6 rounded-2xl shadow-xl
                 w-[93%] sm:w-full sm:max-w-3xl relative max-h-[80vh] overflow-y-auto
                 border border-gray-100 dark:border-white/10"
          role="dialog"
          aria-modal="true"
        >
          <button
            @click="selectedNews = null"
            class="absolute top-3 right-3 text-white bg-rv-navy hover:bg-rv-pink
                   rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all
                   border-0 outline-none focus:outline-none focus-visible:outline-none
                   ring-0 focus:ring-0 focus-visible:ring-0"
            aria-label="Cerrar"
          >
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>

          <div class="flex items-center gap-2 mb-3">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rv-blue/15 text-rv-blue">
              {{ typeLabel(selectedNews.type) }}
            </span>
            <span class="text-gray-500 dark:text-gray-300 text-xs">{{ selectedNews.date }}</span>
          </div>

          <h3 class="text-xl font-bold text-rv-navy dark:text-white mb-4">{{ selectedNews.title }}</h3>

          <div
            class="news-prose text-gray-700 dark:text-gray-200"
            v-html="selectedNews.body"
            @click="handleBodyClick"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getNewsFeed } from '@services/news/news';
import type { FeedPost, NewsType } from '@services/news/news';

const router = useRouter();

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

const posts = ref<NewsPost[]>([]);
const loading = ref(true);
const selectedNews = ref<{ title: string; type: NewsType; body: string; date: string } | null>(null);

// ── Helpers de estilo por fuente ─────────────────────────────

function sourceBorderColor(source: string) {
  if (source === 'telegram')     return 'border-l-yellow-400';
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
  if (source === 'telegram')
    return 'bg-yellow-400/90 text-rv-navy';
  if (source === 'riffvalley.es')
    return 'bg-rv-pink/90 text-white';
  return 'bg-rv-blue/90 text-white';
}

function sourceBadgeIcon(source: string) {
  if (source === 'telegram')     return 'fa-brands fa-telegram';
  if (source === 'riffvalley.es') return 'fa-solid fa-globe';
  return 'fa-solid fa-bell';
}

function sourceLabel(post: NewsPost) {
  if (post.source === 'app')          return typeLabel(post.newsType!);
  if (post.source === 'riffvalley.es') return 'riffvalley.es';
  return 'Canal conciertos';
}

// ── Tipos y lógica ───────────────────────────────────────────

function typeLabel(type: NewsType): string {
  const labels: Record<NewsType, string> = {
    version:      'Versión',
    new_feature:  'Novedad',
    team_notes:   'Equipo',
  };
  return labels[type] ?? type;
}

function openAppPost(post: NewsPost) {
  selectedNews.value = {
    title: post.title,
    type: post.newsType!,
    body: post.appBody!,
    date: post.date,
  };
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

const appTypeImages: Record<string, string> = {
  version:     '/news/version.jpg',
  new_feature: '/news/funcionalidad.jpg',
  team_notes:  '/news/equipo.jpg',
};

function mapFeedPost(fp: FeedPost): NewsPost {
  const postDate = new Date(fp.date);
  const image = fp.source === 'app' && fp.type
    ? appTypeImages[fp.type] ?? fp.image
    : fp.image;
  return {
    id: fp.id,
    title: fp.title,
    link: fp.link,
    image,
    date: postDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }),
    source: fp.source,
    newsType: fp.type ?? undefined,
    appBody: fp.body,
  };
}

async function fetchPosts() {
  try {
    const { posts: feedPosts } = await getNewsFeed();
    posts.value = feedPosts.map(mapFeedPost);
  } catch (error) {
    console.error('Error fetching news feed:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchPosts);
</script>

<style scoped>
:deep(.news-prose a) {
  color: #0c6ddc;
  text-decoration: underline;
  font-weight: 600;
}
:deep(.news-prose a:hover) {
  opacity: 0.85;
}
:deep(.dark .news-prose a) {
  color: #93c5fd;
}
</style>
