<template>
  <div>
    <h3 class="text-2xl md:text-3xl font-bold text-rv-navy mb-4 text-center">Novedades Riff Valley</h3>

    <div v-if="loading" class="text-center text-gray-400 py-6">Cargando novedades...</div>

    <div v-else-if="posts.length === 0" class="text-center text-gray-400 py-6">No hay novedades disponibles</div>

    <div v-else class="flex flex-col gap-2 sm:grid sm:grid-cols-2 md:grid-cols-3 sm:gap-1.5">
      <component
        :is="post.source === 'app' ? 'button' : 'a'"
        v-for="post in posts"
        :key="post.id"
        v-bind="post.source === 'app' ? {} : { href: post.link, target: '_blank', rel: 'noopener noreferrer' }"
        @click="post.source === 'app' ? openAppPost(post) : undefined"
        class="group relative block rounded-md overflow-hidden sm:aspect-square md:aspect-square text-left"
      >
        <!-- Mobile: layout horizontal -->
        <div class="flex items-center gap-4 sm:hidden">
          <div class="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
            <img v-if="post.image" :src="post.image" :alt="post.title"
              class="w-full h-full object-cover brightness-[0.5]" loading="lazy" />
            <div v-else class="w-full h-full bg-rv-navy"></div>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-rv-navy font-bold text-xs leading-snug line-clamp-2" v-html="post.title"></h4>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-gray-400 text-[9px]">{{ post.date }}</span>
              <span v-if="post.source === 'app'"
                class="inline-flex items-center justify-center min-w-[4.5rem] px-1.5 py-0.5 rounded text-[8px] font-bold bg-rv-blue/90 text-white">
                {{ typeLabel(post.newsType!) }}
              </span>
              <span v-else-if="post.source === 'riffvalley.es'"
                class="inline-flex items-center justify-center min-w-[4.5rem] px-1.5 py-0.5 rounded text-[8px] font-bold bg-rv-pink/90 text-white">
                riffvalley.es
              </span>
              <span v-else
                class="inline-flex items-center justify-center min-w-[4.5rem] px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-400/90 text-rv-navy">
                <i class="fa-brands fa-telegram mr-0.5"></i>Canal
              </span>
            </div>
          </div>
        </div>

        <!-- Desktop/Tablet: layout tarjeta -->
        <div class="hidden sm:block h-full">
          <img v-if="post.image" :src="post.image" :alt="post.title"
            class="absolute inset-0 w-full h-full object-cover transition-all duration-300 brightness-[0.4] group-hover:brightness-[0.6]"
            loading="lazy" />
          <div v-else class="absolute inset-0 bg-rv-navy"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
          <div class="absolute top-1.5 left-1.5">
            <span v-if="post.source === 'app'"
              class="inline-flex items-center justify-center min-w-[4.5rem] px-1.5 py-0.5 rounded text-[8px] font-bold bg-rv-blue/90 text-white">
              {{ typeLabel(post.newsType!) }}
            </span>
            <span v-else-if="post.source === 'riffvalley.es'" class="inline-flex items-center justify-center min-w-[4.5rem] px-1.5 py-0.5 rounded text-[8px] font-bold bg-rv-pink/90 text-white">
              riffvalley.es
            </span>
            <span v-else class="inline-flex items-center justify-center min-w-[4.5rem] px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-400/90 text-rv-navy">
              <i class="fa-brands fa-telegram mr-0.5"></i>
              Canal conciertos
            </span>
          </div>
          <div class="relative h-full flex flex-col justify-end p-2">
            <h4 class="text-white font-bold text-[11px] sm:text-xs leading-snug line-clamp-3" v-html="post.title"></h4>
            <span class="text-white/50 text-[8px] sm:text-[9px] mt-0.5">{{ post.date }}</span>
          </div>
        </div>
      </component>
    </div>

    <!-- Modal de noticia de la app -->
    <Teleport to="body">
      <div v-if="selectedNews" class="news-modal-overlay" @click.self="selectedNews = null">
        <div class="news-modal-content">
          <button @click="selectedNews = null" class="news-modal-close">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div class="flex items-center gap-2 mb-3">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rv-blue/15 text-rv-blue">
              {{ typeLabel(selectedNews.type) }}
            </span>
            <span class="text-gray-400 text-xs">
              {{ selectedNews.date }}
            </span>
          </div>

          <h3 class="text-xl font-bold text-white mb-4">{{ selectedNews.title }}</h3>

          <div class="news-body-content" v-html="selectedNews.body" @click="handleBodyClick"></div>
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

function typeLabel(type: NewsType): string {
  const labels: Record<NewsType, string> = {
    version: 'Versión',
    new_feature: 'Novedad',
    team_notes: 'Equipo',
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
  const target = e.target as HTMLElement;
  const anchor = target.closest('a');
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
  version: '/news/version.png',
  new_feature: '/news/funcionalidad.png',
  team_notes: '/news/equipo.png',
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
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Modal */
.news-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.news-modal-content {
  position: relative;
  background: #00021f;
  border: 1px solid rgba(176, 102, 159, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 42rem;
  max-height: 85vh;
  overflow-y: auto;
}

.news-modal-close {
  position: absolute;
  right: 1rem;
  top: 1rem;
  color: #e46e8a;
  transition: opacity 0.2s;
}

.news-modal-close:hover {
  opacity: 0.7;
}

/* Estilos para el contenido HTML de la noticia */
.news-body-content {
  color: #d1d5db;
  font-size: 0.95rem;
  line-height: 1.7;
}

.news-body-content :deep(h1),
.news-body-content :deep(h2),
.news-body-content :deep(h3) {
  color: #fff;
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.news-body-content :deep(h1) { font-size: 1.5rem; }
.news-body-content :deep(h2) { font-size: 1.25rem; }
.news-body-content :deep(h3) { font-size: 1.1rem; }

.news-body-content :deep(p) {
  margin-bottom: 0.75rem;
}

.news-body-content :deep(ul),
.news-body-content :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.news-body-content :deep(ul) { list-style: disc; }
.news-body-content :deep(ol) { list-style: decimal; }

.news-body-content :deep(li) {
  margin-bottom: 0.25rem;
}

.news-body-content :deep(a) {
  color: #e46e8a;
  text-decoration: underline;
}

.news-body-content :deep(a:hover) {
  color: #b0669f;
}

.news-body-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 0.75rem 0;
}

.news-body-content :deep(blockquote) {
  border-left: 3px solid #e46e8a;
  padding-left: 1rem;
  margin: 0.75rem 0;
  color: #9ca3af;
  font-style: italic;
}

.news-body-content :deep(strong) {
  color: #fff;
}
</style>
