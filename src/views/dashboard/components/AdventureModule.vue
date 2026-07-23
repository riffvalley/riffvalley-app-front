<template>
  <div class="flex flex-col flex-1 font-serif bg-white dark:bg-rv-darkSurface">

    <!-- Intro -->
    <div v-if="phase === 'intro'" class="flex flex-col items-center justify-center gap-4 flex-1 px-6 py-8 text-center">
      <i class="fa-solid fa-book-open text-5xl text-rv-purple dark:text-rv-pink"></i>
      <p class="text-gray-500 dark:text-gray-400 text-sm italic leading-relaxed max-w-xs">
        El destino baraja las cartas de tu colección. Responde a sus preguntas y descubrirás el disco que te aguarda...
      </p>
      <button @click="startAdventure" type="button"
        class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold tracking-wide shadow-md
               bg-rv-navy dark:bg-rv-purple text-white
               hover:bg-rv-pink hover:-translate-y-0.5 hover:shadow-lg
               active:scale-[0.97] active:translate-y-0
               transition-all duration-200 border-0 outline-none focus:outline-none">
        <i class="fa-solid fa-scroll"></i>
        Comenzar la aventura
      </button>
    </div>

    <!-- Pregunta -->
    <div v-else-if="phase === 'question' && currentQuestion" class="flex flex-col gap-4 flex-1 px-6 py-6">
      <p class="font-sans text-[11px] uppercase tracking-widest text-rv-pink/80 dark:text-rv-pink/70 text-center font-semibold">
        Elección {{ stepIndex + 1 }} de {{ categoryOrder.length }}
      </p>
      <p class="text-gray-500 dark:text-gray-400 text-sm italic leading-relaxed text-center">
        {{ currentQuestion.flavor }}
      </p>
      <p class="text-gray-900 dark:text-white font-bold text-center text-base">{{ currentQuestion.label }}</p>

      <div class="flex flex-col gap-2 max-w-xs mx-auto w-full">
        <button v-for="opt in currentQuestion.options" :key="String(opt.value)" @click="choose(opt)" type="button"
          class="group flex items-center gap-3 pl-3 pr-4 py-3 rounded-md text-left text-sm font-semibold shadow-sm
                 bg-gray-50 dark:bg-white/5 border-l-4 border-rv-purple/50 dark:border-rv-pink/40
                 text-gray-800 dark:text-gray-200
                 hover:bg-rv-navy hover:text-white hover:border-rv-pink dark:hover:bg-rv-pink
                 active:scale-[0.98] transition-all duration-150 outline-none focus:outline-none">
          <i class="fa-solid fa-feather-pointed text-rv-purple/60 dark:text-rv-pink/50 group-hover:text-white text-xs shrink-0 transition-colors"></i>
          <CircleFlags v-if="currentQuestion.category === 'pais' && opt.extra" :country="opt.extra.toLowerCase()"
            :show-flag-name="false" class="w-4 h-4 shrink-0" />
          <span class="truncate flex-1">{{ opt.label }}</span>
          <i class="fa-solid fa-chevron-right text-rv-purple/40 dark:text-rv-pink/30 group-hover:text-white text-xs shrink-0 transition-colors"></i>
        </button>
      </div>
    </div>

    <!-- Consultando el oráculo -->
    <div v-else-if="phase === 'loading'" class="flex flex-col items-center justify-center gap-3 flex-1 px-6 py-16">
      <i class="fa-solid fa-spinner animate-spin text-2xl text-rv-purple dark:text-rv-pink"></i>
      <span class="text-sm text-gray-500 dark:text-gray-400 italic">Consultando el oráculo…</span>
    </div>

    <!-- Resultado -->
    <div v-else-if="phase === 'result' && resultDisc" class="flex flex-col gap-4 flex-1 px-4 py-5">
      <p class="text-gray-500 dark:text-gray-400 text-sm italic leading-relaxed text-center">
        El destino ha hablado. Este es el disco que te esperaba:
      </p>
      <div class="flex justify-center">
        <DiscCard :key="resultDisc.id" :id="resultDisc.id" :ep="resultDisc.ep" :image="resultDisc.image"
          :name="resultDisc.name" :releaseDate="resultDisc.releaseDate" :artistName="resultDisc.artist?.name"
          :genreName="resultDisc.genre?.name" :genreColor="resultDisc.genre?.color" :link="resultDisc.link"
          :averageRate="resultDisc.averageRate" :averageCover="resultDisc.averageCover"
          :rate="resultDisc.userRate?.rate" :cover="resultDisc.userRate?.cover"
          :isNew="!resultDisc.userRate" :userDiscRate="resultDisc.userRate?.id"
          :favoriteId="resultDisc.userFavoriteId" :pendingId="resultDisc.pendingId"
          :comment-count="resultDisc.commentCount" :rateCount="resultDisc.voteCount"
          :artistCountry="resultDisc.artist?.country" :debut="resultDisc.debut" />
      </div>
      <button @click="restart" type="button"
        class="self-center inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold shadow
               bg-rv-navy dark:bg-rv-purple text-white
               hover:bg-rv-pink hover:-translate-y-0.5 hover:shadow-md
               active:scale-[0.97] active:translate-y-0
               transition-all duration-200 border-0 outline-none focus:outline-none">
        <i class="fa-solid fa-arrows-rotate"></i>
        Vivir otra aventura
      </button>
    </div>

    <!-- Sin resultados -->
    <div v-else-if="phase === 'empty'" class="flex flex-col items-center justify-center gap-3 flex-1 px-6 py-10 text-center">
      <i class="fa-solid fa-book-skull text-3xl text-gray-300 dark:text-gray-600"></i>
      <p class="text-gray-500 dark:text-gray-400 text-sm italic leading-relaxed max-w-xs">
        El oráculo permanece en silencio... ningún disco responde a esa combinación del destino.
      </p>
      <button @click="restart" type="button"
        class="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold shadow
               bg-rv-navy dark:bg-rv-purple text-white
               hover:bg-rv-pink hover:-translate-y-0.5 hover:shadow-md
               active:scale-[0.97] active:translate-y-0
               transition-all duration-200 border-0 outline-none focus:outline-none">
        <i class="fa-solid fa-arrows-rotate"></i>
        Reintentar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getRandomDiscs, getDiscOptions, type DiscOptionsFilters } from '@services/discs/discs';
import DiscCard from '@components/DiscCardComponent.vue';

type Category = 'genero' | 'pais' | 'anio' | 'ep' | 'debut';

interface QuestionOption {
  value: string | boolean;
  label: string;
  extra?: string;
}

interface Question {
  category: Category;
  flavor: string;
  label: string;
  options: QuestionOption[];
}

const FLAVOR: Record<Category, string[]> = {
  genero: [
    'Te adentras en una taberna en penumbra. La música que suena marcará tu destino...',
    'Un viejo trovador te tiende un pergamino con símbolos extraños. ¿Qué sonido buscas?',
    'Las runas del suelo brillan al ritmo de un género aún desconocido para ti...',
  ],
  pais: [
    'Un mapa desgastado se despliega ante ti. ¿Hacia qué tierras viaja tu búsqueda?',
    'El viento trae ecos de tierras lejanas. ¿Cuál escuchas con más claridad?',
    'Un mercader errante conoce leyendas de tierras distintas. ¿Cuál te interesa?',
  ],
  anio: [
    'Un reloj de arena roto marca épocas distintas. ¿En cuál decides detenerte?',
    'Las páginas de un grimorio muestran fechas grabadas en oro. ¿Cuál eliges?',
    'El oráculo te muestra varios años posibles. ¿Cuál sientes que es el tuyo?',
  ],
  ep: [
    'El bardo afina su instrumento: ¿una canción breve, o una historia larga?',
    'Ante ti se abren dos caminos: el atajo... o el viaje completo.',
    'Un pergamino corto o una saga entera — ¿cuál desenrollas?',
  ],
  debut: [
    'El oráculo pregunta: ¿una voz que nace ahora, o una ya forjada por el tiempo?',
    '¿Prefieres presenciar un nacimiento, o rendir homenaje a una leyenda?',
    'Un nombre nuevo aún sin escribir, o uno ya grabado en piedra — ¿cuál eliges?',
  ],
};

const LABEL: Record<Category, string> = {
  genero: 'Elige un género',
  pais: 'Elige un país',
  anio: 'Elige un año',
  ep: 'EP o álbum completo',
  debut: 'Debut o banda consagrada',
};

const BOOL_OPTION_LABEL: Record<'ep' | 'debut', Record<'true' | 'false', string>> = {
  ep: { true: 'Un EP', false: 'Un álbum completo' },
  debut: { true: 'Un debut', false: 'Una banda ya consagrada' },
};

// Extrae `n` elementos al azar y sin repetir de `arr`.
function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

const phase = ref<'intro' | 'question' | 'loading' | 'result' | 'empty'>('intro');
const categoryOrder = ref<Category[]>([]);
const stepIndex = ref(0);
const answers = ref<Partial<Record<Category, string | boolean>>>({});
const currentQuestion = ref<Question | null>(null);
const resultDisc = ref<any>(null);

// Construye los filtros ya elegidos hasta ahora, en la forma que espera
// /discs/options y /discs/random. Se reutiliza en cada pregunta y en el
// resultado final.
function currentFilters(): DiscOptionsFilters {
  return {
    country: typeof answers.value.pais === 'string' ? answers.value.pais : undefined,
    genre: typeof answers.value.genero === 'string' ? answers.value.genero : undefined,
    year: typeof answers.value.anio === 'string' ? Number(answers.value.anio) : undefined,
    ep: typeof answers.value.ep === 'boolean' ? answers.value.ep : undefined,
    debut: typeof answers.value.debut === 'boolean' ? answers.value.debut : undefined,
  };
}

// Pide al backend las opciones para la categoría en `index`, ya filtradas por
// lo respondido hasta ahora — así cada pregunta viene garantizada con datos
// reales, en vez de un muestreo a ciegas del catálogo entero.
async function loadQuestion(index: number) {
  if (index >= categoryOrder.value.length) {
    await revealResult();
    return;
  }
  const cat = categoryOrder.value[index];
  phase.value = 'loading';
  const filters = currentFilters();
  try {
    let options: QuestionOption[];
    if (cat === 'genero') {
      const opts = await getDiscOptions('genre', filters, 3);
      options = opts.map(g => ({ value: g.id, label: g.name }));
    } else if (cat === 'pais') {
      const opts = await getDiscOptions('country', filters, 3);
      options = opts.map(c => ({ value: c.id, label: c.name, extra: c.isoCode }));
    } else if (cat === 'anio') {
      const opts = await getDiscOptions('year', filters, 3);
      options = opts.map(y => ({ value: String(y), label: String(y) }));
    } else {
      const opts = await getDiscOptions(cat, filters, 2); // ep/debut: como mucho true y false
      options = opts.map(v => ({ value: v, label: BOOL_OPTION_LABEL[cat][String(v) as 'true' | 'false'] }));
    }
    if (!options.length) {
      // Esta rama no tiene datos con los filtros ya elegidos: se descarta y
      // se sigue con la siguiente categoría en vez de dejar una pregunta vacía.
      categoryOrder.value.splice(index, 1);
      await loadQuestion(index);
      return;
    }
    const flavor = FLAVOR[cat][Math.floor(Math.random() * FLAVOR[cat].length)];
    currentQuestion.value = { category: cat, flavor, label: LABEL[cat], options };
    stepIndex.value = index;
    phase.value = 'question';
  } catch {
    phase.value = 'empty';
  }
}

async function startAdventure() {
  const allCategories: Category[] = ['genero', 'pais', 'anio', 'ep', 'debut'];
  const count = Math.floor(Math.random() * (allCategories.length - 1)) + 2; // 2..5 (todas las categorías), nunca menos de 2
  categoryOrder.value = sample(allCategories, count);
  answers.value = {};
  await loadQuestion(0);
}

async function choose(option: QuestionOption) {
  const q = currentQuestion.value;
  if (!q) return;
  answers.value[q.category] = option.value;
  await loadQuestion(stepIndex.value + 1);
}

function transformDisc(disc: any) {
  return {
    ...disc,
    artist: { ...disc.artist, country: disc.artist?.country ?? null },
    userRate: disc.userRate
      ? {
          ...disc.userRate,
          rate: disc.userRate.rate != null ? parseFloat(disc.userRate.rate) : null,
          cover: disc.userRate.cover != null ? parseFloat(disc.userRate.cover) : null,
        }
      : null,
  };
}

async function revealResult() {
  phase.value = 'loading';
  try {
    const filters = currentFilters();
    const discs = await getRandomDiscs({
      genre: filters.genre,
      countryId: filters.country,
      year: filters.year,
      ep: filters.ep,
      debut: filters.debut,
      limit: 1,
    });
    if (discs.length) {
      resultDisc.value = transformDisc(discs[0]);
      phase.value = 'result';
    } else {
      phase.value = 'empty';
    }
  } catch {
    phase.value = 'empty';
  }
}

function restart() {
  phase.value = 'intro';
  categoryOrder.value = [];
  stepIndex.value = 0;
  answers.value = {};
  currentQuestion.value = null;
  resultDisc.value = null;
}
</script>
