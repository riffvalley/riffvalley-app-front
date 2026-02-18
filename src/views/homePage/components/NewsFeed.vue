<template>
  <div>
    <div v-if="loading" class="text-center text-gray-400 py-6">Cargando novedades...</div>

    <div v-else-if="posts.length === 0" class="text-center text-gray-400 py-6">No hay novedades disponibles</div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-1.5">
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
       sm:relative sm:block sm:rounded-md sm:overflow-hidden sm:aspect-square"
      >
<!-- Mobile: layout horizontal -->
<div class="sm:hidden flex items-center gap-3 p-3 bg-white rounded-md">
  <div class="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
    <img
      v-if="post.image"
      :src="post.image"
      :alt="post.title"
      class="w-full h-full object-cover brightness-[0.85]"
      loading="lazy"
    />
    <div v-else class="w-full h-full bg-rv-navy"></div>
  </div>

  <div class="flex-1 min-w-0">
    <h4
      class="text-rv-navy font-bold text-xs leading-snug line-clamp-2"
      v-html="post.title"
    ></h4>

    <div class="flex items-center gap-2 mt-1">
      <span class="text-gray-400 text-[9px] shrink-0">{{ post.date }}</span>

      <span
        v-if="post.source === 'app'"
        class="inline-flex items-center justify-center min-w-[4.5rem] px-1.5 py-0.5 rounded text-[8px] font-bold bg-rv-blue/90 text-white"
      >
        {{ typeLabel(post.newsType!) }}
      </span>

      <span
        v-else-if="post.source === 'riffvalley.es'"
        class="inline-flex items-center justify-center min-w-[4.5rem] px-1.5 py-0.5 rounded text-[8px] font-bold bg-rv-pink/90 text-white"
      >
        riffvalley.es
      </span>

      <span
        v-else
        class="inline-flex items-center justify-center min-w-[4.5rem] px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-400/90 text-rv-navy"
      >
        <i class="fa-brands fa-telegram mr-0.5"></i>Canal
      </span>
    </div>
  </div>
</div>

        <!-- Desktop/Tablet: layout tarjeta -->
        <div class="hidden sm:block h-full">
          <img v-if="post.image" :src="post.image" :alt="post.title"
            class="absolute inset-0 w-full h-full object-cover transition-all duration-300 brightness-[0.85] group-hover:brightness-[0.55]"
            loading="lazy" />
          <div v-else class="absolute inset-0 bg-rv-navy"></div>
<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent"></div>
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
  <div
    v-if="selectedNews"
    class="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/50 z-50"
    @click.self="selectedNews = null"
  >
    <div
      class="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-[93%] sm:w-full sm:max-w-3xl relative max-h-[80vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <!-- Close button (mismo estilo que ya usáis) -->
      <button
        @click="selectedNews = null"
        class="absolute top-3 right-3 text-white bg-rv-navy hover:bg-[#e46e8a]
               rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all
               border-0 outline-none focus:outline-none focus-visible:outline-none
               ring-0 focus:ring-0 focus-visible:ring-0"
        aria-label="Cerrar"
        title="Cerrar"
      >
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>

      <!-- Header -->
      <div class="flex items-center gap-2 mb-3">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rv-blue/15 text-rv-blue">
          {{ typeLabel(selectedNews.type) }}
        </span>

        <span class="text-gray-500 text-xs">
          {{ selectedNews.date }}
        </span>
      </div>

      <!-- Title -->
      <h3 class="text-xl font-bold text-rv-navy mb-4">
        {{ selectedNews.title }}
      </h3>

      <!-- Body -->
<div
  class="news-prose"
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
  version: '/news/version.jpg',
  new_feature: '/news/funcionalidad.jpg',
  team_notes: '/news/equipo.jpg',
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
:deep(.news-prose a) {
  color: #0c6ddc; /* su rv-blue */
  text-decoration: underline;
  font-weight: 600;
}
:deep(.news-prose a:hover) {
  opacity: 0.85;
}
</style>
