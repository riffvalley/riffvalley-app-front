import { computed, onUnmounted, readonly, ref, shallowRef, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import {
  getDiscOptions,
  getRandomDiscs,
  type Disc,
  type DiscOptionsFilters,
} from "@services/discs/discs";

type Category = "genero" | "pais" | "anio" | "ep" | "debut";
type Phase = "intro" | "question" | "loading" | "error" | "result" | "empty";

interface QuestionOption {
  category: Category;
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

type AdventureError = { kind: "options"; index: number } | { kind: "result" };
type RequestResult<T> = { kind: "success"; value: T } | { kind: "error" } | { kind: "stale" };

const FLAVOR: Record<Category, string[]> = {
  genero: [
    "Te adentras en una taberna en penumbra. La música que suena marcará tu destino...",
    "Un viejo trovador te tiende un pergamino con símbolos extraños. ¿Qué sonido buscas?",
    "Las runas del suelo brillan al ritmo de un género aún desconocido para ti...",
  ],
  pais: [
    "Un mapa desgastado se despliega ante ti. ¿Hacia qué tierras viaja tu búsqueda?",
    "El viento trae ecos de tierras lejanas. ¿Cuál escuchas con más claridad?",
    "Un mercader errante conoce leyendas de tierras distintas. ¿Cuál te interesa?",
  ],
  anio: [
    "Un reloj de arena roto marca épocas distintas. ¿En cuál decides detenerte?",
    "Las páginas de un grimorio muestran fechas grabadas en oro. ¿Cuál eliges?",
    "El oráculo te muestra varios años posibles. ¿Cuál sientes que es el tuyo?",
  ],
  ep: [
    "El bardo afina su instrumento: ¿una canción breve, o una historia larga?",
    "Ante ti se abren dos caminos: el atajo... o el viaje completo.",
    "Un pergamino corto o una saga entera — ¿cuál desenrollas?",
  ],
  debut: [
    "El oráculo pregunta: ¿una voz que nace ahora, o una ya forjada por el tiempo?",
    "¿Prefieres presenciar un nacimiento, o rendir homenaje a una leyenda?",
    "Un nombre nuevo aún sin escribir, o uno ya grabado en piedra — ¿cuál eliges?",
  ],
};

const LABEL: Record<Category, string> = {
  genero: "Elige un género",
  pais: "Elige un país",
  anio: "Elige un año",
  ep: "EP o álbum completo",
  debut: "Debut o banda consagrada",
};

const BOOL_OPTION_LABEL: Record<"ep" | "debut", Record<"true" | "false", string>> = {
  ep: { true: "Un EP", false: "Un álbum" },
  debut: { true: "Un debut", false: "Una banda ya consagrada" },
};

function sample<T>(items: T[], count: number): T[] {
  const remaining = [...items];
  const selected: T[] = [];
  while (selected.length < count && remaining.length) {
    const index = Math.floor(Math.random() * remaining.length);
    selected.push(remaining.splice(index, 1)[0]);
  }
  return selected;
}

export function useAdventureFlow() {
  const phase = shallowRef<Phase>("intro");
  const isBusy = shallowRef(false);
  const categoryOrder = ref<Category[]>([]);
  const stepIndex = shallowRef(0);
  const answers = ref<Partial<Record<Category, string | boolean>>>({});
  const currentQuestion = shallowRef<Question | null>(null);
  const resultDisc = shallowRef<Disc | null>(null);
  const errorContext = shallowRef<AdventureError | null>(null);

  const authStore = useAuthStore();
  const sessionKey = computed(
    () => `${authStore.authStatus}:${authStore.userId ?? ""}:${authStore.authSessionGeneration}`,
  );
  let lastSessionKey = sessionKey.value;
  let operationId = 0;
  let activeController: AbortController | null = null;
  let isUnmounted = false;

  function currentFilters(): DiscOptionsFilters {
    return {
      country: typeof answers.value.pais === "string" ? answers.value.pais : undefined,
      genre: typeof answers.value.genero === "string" ? answers.value.genero : undefined,
      year: typeof answers.value.anio === "string" ? Number(answers.value.anio) : undefined,
      ep: typeof answers.value.ep === "boolean" ? answers.value.ep : undefined,
      debut: typeof answers.value.debut === "boolean" ? answers.value.debut : undefined,
    };
  }

  function invalidateOperation(): void {
    operationId += 1;
    activeController?.abort();
    activeController = null;
    isBusy.value = false;
  }

  function clearAdventure(): void {
    phase.value = "intro";
    categoryOrder.value = [];
    stepIndex.value = 0;
    answers.value = {};
    currentQuestion.value = null;
    resultDisc.value = null;
    errorContext.value = null;
  }

  function restart(): void {
    if (isBusy.value || !["error", "result", "empty"].includes(phase.value)) return;
    invalidateOperation();
    clearAdventure();
  }

  function operationIsCurrent(id: number, startedInSession: string): boolean {
    return !isUnmounted && id === operationId && startedInSession === sessionKey.value;
  }

  async function request<T>(
    id: number,
    startedInSession: string,
    action: (signal: AbortSignal) => Promise<T>,
  ): Promise<RequestResult<T>> {
    const controller = new AbortController();
    activeController = controller;

    try {
      const value = await action(controller.signal);
      if (controller.signal.aborted || !operationIsCurrent(id, startedInSession)) {
        return { kind: "stale" };
      }
      return { kind: "success", value };
    } catch {
      if (controller.signal.aborted || !operationIsCurrent(id, startedInSession)) {
        return { kind: "stale" };
      }
      return { kind: "error" };
    } finally {
      if (activeController === controller) activeController = null;
    }
  }

  function optionRequest(category: Category, filters: DiscOptionsFilters, signal: AbortSignal) {
    if (category === "genero") {
      return getDiscOptions("genre", filters, 3, { signal }).then((options) =>
        options.map((genre) => ({ category, value: genre.id, label: genre.name })),
      );
    }
    if (category === "pais") {
      return getDiscOptions("country", filters, 3, { signal }).then((options) =>
        options.map((country) => ({ category, value: country.id, label: country.name, extra: country.isoCode })),
      );
    }
    if (category === "anio") {
      return getDiscOptions("year", filters, 3, { signal }).then((options) =>
        options.map((year) => ({ category, value: String(year), label: String(year) })),
      );
    }
    return getDiscOptions(category, filters, 2, { signal }).then((options) =>
      options.map((value) => ({
        category,
        value,
        label: BOOL_OPTION_LABEL[category][String(value) as "true" | "false"],
      })),
    );
  }

  async function loadQuestion(index: number, id: number, startedInSession: string): Promise<void> {
    const questionIndex = index;

    while (questionIndex < categoryOrder.value.length) {
      const category = categoryOrder.value[questionIndex];
      const filters = currentFilters();
      const response = await request(id, startedInSession, (signal) =>
        optionRequest(category, filters, signal),
      );
      if (response.kind === "stale") return;
      if (response.kind === "error" || !Array.isArray(response.value)) {
        isBusy.value = false;
        errorContext.value = { kind: "options", index: questionIndex };
        phase.value = "error";
        return;
      }

      if (response.value.length === 0) {
        categoryOrder.value.splice(questionIndex, 1);
        continue;
      }

      const flavor = FLAVOR[category][Math.floor(Math.random() * FLAVOR[category].length)];
      currentQuestion.value = { category, flavor, label: LABEL[category], options: response.value };
      stepIndex.value = questionIndex;
      errorContext.value = null;
      isBusy.value = false;
      phase.value = "question";
      return;
    }

    await revealResult(id, startedInSession);
  }

  function beginOperation() {
    operationId += 1;
    activeController?.abort();
    activeController = null;
    isBusy.value = true;
    errorContext.value = null;
    phase.value = "loading";
    return { id: operationId, session: sessionKey.value };
  }

  async function startAdventure(): Promise<void> {
    if (isBusy.value || phase.value !== "intro") return;

    const allCategories: Category[] = ["genero", "pais", "anio", "ep", "debut"];
    const count = Math.floor(Math.random() * (allCategories.length - 1)) + 2;
    categoryOrder.value = sample(allCategories, count);
    answers.value = {};
    currentQuestion.value = null;
    resultDisc.value = null;

    const operation = beginOperation();
    await loadQuestion(0, operation.id, operation.session);
  }

  async function choose(option: QuestionOption): Promise<void> {
    if (isBusy.value || phase.value !== "question") return;
    const question = currentQuestion.value;
    if (
      !question ||
      option.category !== question.category ||
      !question.options.some(({ value, label, extra }) =>
        value === option.value && label === option.label && extra === option.extra,
      ) ||
      Object.hasOwn(answers.value, question.category)
    ) return;

    answers.value[question.category] = option.value;
    currentQuestion.value = null;
    const operation = beginOperation();
    await loadQuestion(stepIndex.value + 1, operation.id, operation.session);
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  function isDisplayableDisc(disc: unknown): boolean {
    if (!isRecord(disc) || !isRecord(disc.artist)) return false;
    return (
      typeof disc.id === "string" && disc.id.trim().length > 0 &&
      typeof disc.name === "string" && disc.name.trim().length > 0 &&
      typeof disc.artist.name === "string" && disc.artist.name.trim().length > 0
    );
  }

  function transformDisc(disc: Disc): Disc {
    return {
      ...disc,
      artist: { ...disc.artist, country: disc.artist?.country ?? null },
      userRate: disc.userRate
        ? {
            ...disc.userRate,
            rate: disc.userRate.rate != null ? parseFloat(String(disc.userRate.rate)) : null,
            cover: disc.userRate.cover != null ? parseFloat(String(disc.userRate.cover)) : null,
          }
        : null,
    };
  }

  async function revealResult(id: number, startedInSession: string): Promise<void> {
    const filters = currentFilters();
    const response = await request(id, startedInSession, (signal) =>
      getRandomDiscs(
        {
          genre: filters.genre,
          countryId: filters.country,
          year: filters.year,
          ep: filters.ep,
          debut: filters.debut,
          limit: 1,
        },
        { signal },
      ),
    );

    if (response.kind === "stale") return;
    isBusy.value = false;
    if (response.kind === "error" || !Array.isArray(response.value)) {
      errorContext.value = { kind: "result" };
      phase.value = "error";
      return;
    }

    if (response.value.length === 0) {
      resultDisc.value = null;
      phase.value = "empty";
      return;
    }

    const disc = response.value[0];
    if (!isDisplayableDisc(disc)) {
      errorContext.value = { kind: "result" };
      phase.value = "error";
      return;
    }

    resultDisc.value = transformDisc(disc);
    phase.value = "result";
  }

  async function retry(): Promise<void> {
    if (isBusy.value || phase.value !== "error" || !errorContext.value) return;

    const failedOperation = errorContext.value;
    const operation = beginOperation();
    if (failedOperation.kind === "options") {
      await loadQuestion(failedOperation.index, operation.id, operation.session);
    } else {
      await revealResult(operation.id, operation.session);
    }
  }

  watch(
    sessionKey,
    (nextSession) => {
      if (nextSession === lastSessionKey) return;
      lastSessionKey = nextSession;
      invalidateOperation();
      clearAdventure();
    },
    { flush: "sync" },
  );

  onUnmounted(() => {
    isUnmounted = true;
    invalidateOperation();
  });

  return {
    phase: readonly(phase),
    isBusy: readonly(isBusy),
    categoryOrder: readonly(categoryOrder),
    stepIndex: readonly(stepIndex),
    currentQuestion: readonly(currentQuestion),
    resultDisc: readonly(resultDisc),
    startAdventure,
    choose,
    retry,
    restart,
  };
}
