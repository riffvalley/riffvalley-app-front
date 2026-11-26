<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef } from "vue";
import { useCommunityDashboardStatsQuery } from "@/app/communityDashboardStats";
import { useAuthStore } from "@/modules/identity/auth";
import type { CommunityDashboardStatsResponse } from "@services/community/dashboard";

const props = defineProps<{ year: number }>();
const emit = defineEmits<{ close: [] }>();
const selectedYear = computed(() => props.year);
const isEnabled = computed(() => true);
const query = useCommunityDashboardStatsQuery(selectedYear, isEnabled);
const dialog = useTemplateRef<HTMLElement>("dialog");
const closeButton = useTemplateRef<HTMLButtonElement>("closeButton");
const authStore = useAuthStore();
const hasSession = computed(
  () => authStore.authStatus === "authenticated" && !!authStore.userId && !!authStore.role,
);

const stats = computed<CommunityDashboardStatsResponse | undefined>(() => query.data.value);
const distributionMaximum = computed(() =>
  Math.max(0, ...(stats.value?.ratingDistribution.map(({ count }) => count) ?? [])),
);
const formattedAverage = computed(() => {
  const value = stats.value?.summary.averageRating;
  return value == null
    ? "Sin datos"
    : new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(value);
});

onMounted(async () => {
  await nextTick();
  closeButton.value?.focus();
});

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key !== "Tab" || !dialog.value) return;

  const focusable = [...dialog.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.tabIndex >= 0 && !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
  if (focusable.length === 0) {
    event.preventDefault();
    dialog.value.focus();
    return;
  }

  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (!dialog.value.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="community-stats-overlay">
      <button
        type="button"
        class="community-stats-backdrop"
        aria-hidden="true"
        tabindex="-1"
        @click="emit('close')"
      ></button>
      <dialog
        open
        ref="dialog"
        class="community-stats-dialog"
        aria-modal="true"
        aria-labelledby="community-stats-title"
        tabindex="-1"
      >
        <header class="dialog-header">
          <div>
            <h2 id="community-stats-title">Estadísticas de la comunidad</h2>
            <p class="dialog-subtitle">Resumen del año {{ year }}.</p>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="close-button"
            aria-label="Cerrar estadísticas de la comunidad"
            @keydown="handleKeydown"
            @click="emit('close')"
          >
            <i class="fa-solid fa-xmark close-icon" aria-hidden="true"></i>
          </button>
        </header>

        <div class="dialog-body">
          <p v-if="!hasSession" class="state-message" role="status">La sesión ya no está disponible. Cierra el diálogo para continuar.</p>
          <p v-else-if="query.isPending.value" class="state-message" role="status" aria-live="polite">
            <i class="fa-solid fa-compact-disc fa-spin" aria-hidden="true"></i>
            Cargando estadísticas…
          </p>
          <div v-else-if="query.isError.value" class="state-message error-state" role="alert">
            <p>No se pudieron cargar las estadísticas de la comunidad.</p>
            <button type="button" class="retry-button" @keydown="handleKeydown" @click="query.refetch()">Reintentar</button>
          </div>
          <template v-else-if="stats">
            <section class="metrics-grid" aria-label="Indicadores principales">
              <article class="metric-card">
                <span class="metric-icon"><i class="fa-solid fa-compact-disc" aria-hidden="true"></i></span>
                <div><p>Discos valorados</p><strong>{{ stats.summary.ratedDiscs.toLocaleString("es-ES") }}</strong></div>
              </article>
              <article class="metric-card">
                <span class="metric-icon"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i></span>
                <div><p>Discos publicados <span>· {{ year }}</span></p><strong>{{ stats.summary.releasedDiscs.toLocaleString("es-ES") }}</strong></div>
              </article>
              <article class="metric-card">
                <span class="metric-icon"><i class="fa-solid fa-users" aria-hidden="true"></i></span>
                <div><p>Usuarios participantes</p><strong>{{ stats.summary.participatingUsers.toLocaleString("es-ES") }}</strong></div>
              </article>
              <article class="metric-card">
                <span class="metric-icon"><i class="fa-solid fa-star" aria-hidden="true"></i></span>
                <div><p>Nota media comunitaria</p><strong>{{ formattedAverage }}<small v-if="stats.summary.averageRating !== null"> / 10</small></strong></div>
              </article>
            </section>

            <section class="content-section distribution-section" aria-labelledby="distribution-title">
              <div class="section-heading">
                <div><h3 id="distribution-title">Distribución de notas musicales</h3></div>
                <span class="section-mark"><i class="fa-solid fa-chart-column" aria-hidden="true"></i> {{ stats.ratingDistribution.length }} intervalos</span>
              </div>
              <p v-if="stats.ratingDistribution.length === 0" class="empty-copy">No hay valoraciones en el período seleccionado.</p>
              <ol v-else class="distribution-list" aria-label="Distribución de valoraciones musicales por intervalo">
                <li v-for="(bucket, index) in stats.ratingDistribution" :key="`${bucket.label}-${index}`" class="distribution-item">
                  <div class="bar-track" aria-hidden="true">
                    <span
                      class="bar-fill"
                      :style="{ height: distributionMaximum === 0 ? '0%' : `${(bucket.count / distributionMaximum) * 100}%` }"
                    ></span>
                  </div>
                  <strong class="bucket-count">{{ bucket.count.toLocaleString("es-ES") }}</strong>
                  <span class="bucket-label">{{ bucket.label }}</span>
                </li>
              </ol>
            </section>

            <div class="lower-grid">
              <section class="content-section streak-section" aria-labelledby="streak-title">
                <div class="section-heading">
                  <div><h3 id="streak-title">Rachas actuales</h3></div>
                  <i class="fa-solid fa-fire section-icon" aria-hidden="true"></i>
                </div>
                <p class="section-note">Días consecutivos a día de hoy, sin filtro de año.</p>
                <ol v-if="stats.currentStreaks.length" class="streak-list">
                  <li v-for="(entry, index) in stats.currentStreaks" :key="entry.user.id" class="streak-row">
                    <span class="streak-rank">{{ index + 1 }}</span>
                    <span class="streak-name">{{ entry.user.username }}</span>
                    <span class="streak-days"><i class="fa-solid fa-fire" aria-hidden="true"></i> {{ entry.days }} <small>días</small></span>
                  </li>
                </ol>
                <p v-else class="empty-copy">Todavía no hay rachas activas.</p>
              </section>

              <section class="content-section genre-section" aria-labelledby="genre-title">
                <div class="section-heading">
                  <div><h3 id="genre-title">Géneros más valorados</h3><p class="section-note genre-year">Año seleccionado · {{ year }}</p></div>
                  <i class="fa-solid fa-guitar section-icon" aria-hidden="true"></i>
                </div>
                <ol v-if="stats.topGenres.length" class="top-genres">
                  <li v-for="(genre, index) in stats.topGenres" :key="genre.id" class="top-genre-row">
                    <span class="genre-rank" :class="index < 3 ? `genre-rank--${index + 1}` : undefined">
                      <span class="sr-only">Puesto {{ index + 1 }}</span>
                      <i v-if="index === 0" class="fa-solid fa-trophy" aria-hidden="true"></i>
                      <i v-else-if="index < 3" class="fa-solid fa-medal" aria-hidden="true"></i>
                      <span v-else aria-hidden="true">{{ index + 1 }}</span>
                    </span>
                    <span class="genre-details">
                      <strong>{{ genre.name }}</strong>
                      <small>{{ genre.ratedDiscs.toLocaleString("es-ES") }} discos distintos valorados</small>
                    </span>
                  </li>
                </ol>
                <p v-else class="empty-copy">No hay géneros destacados para {{ year }}.</p>
              </section>
            </div>
          </template>
          <p v-else class="state-message" role="status">No hay información disponible.</p>
        </div>
      </dialog>
    </div>
  </Teleport>
</template>

<style scoped>
/* Paleta corporativa: rv-navy #00021f, rv-pink #e46e8a, rv-purple #b0669f, rv-darkSurface #2a2b3d, rv-darkCard #404157. */
.community-stats-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.community-stats-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: rgb(0 0 0 / 70%); backdrop-filter: blur(4px); cursor: default; }
.community-stats-dialog { position: relative; z-index: 1; width: min(100%, 68rem); max-height: min(92dvh, 58rem); margin: 0; padding: 0; overflow-y: auto; overscroll-behavior: contain; border: 1px solid #e5e7eb; border-radius: 1rem; background: #fff; color: #111827; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 25%); outline: none; }
.dialog-header { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.25rem 1.5rem 1rem; border-bottom: 1px solid #f3f4f6; background: linear-gradient(to right, rgb(228 110 138 / 8%), rgb(176 102 159 / 8%)), #fff; }
.dialog-header h2 { margin: 0 0 .2rem; color: #00021f; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.025em; line-height: 1.75rem; }
@media (min-width: 640px) { .dialog-header h2 { font-size: 1.5rem; line-height: 2rem; } }
.dialog-subtitle { margin: 0; color: #6b7280; font-size: .875rem; }
.close-button { display: inline-flex; width: 2.25rem; height: 2.25rem; flex: 0 0 auto; padding: 0; align-items: center; justify-content: center; border: 0; border-radius: 9999px; background: #00021f; color: #fff; font-size: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 10%); cursor: pointer; transition: background-color .15s ease; }
.close-icon { line-height: 1; }
.close-button:hover { background: #e46e8a; }
.close-button:focus, .retry-button:focus { outline: none; }
.close-button:focus-visible, .retry-button:focus-visible { outline: 2px solid #e46e8a; outline-offset: 2px; }
.dialog-body { display: grid; gap: 1rem; padding: 1.25rem 1.5rem 1.5rem; }
.metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; }
.metric-card { display: flex; min-width: 0; align-items: center; gap: .75rem; padding: .9rem; border: 1px solid #e5e7eb; border-radius: .75rem; background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / 5%); }
.metric-icon { display: grid; width: 2.35rem; height: 2.35rem; flex: 0 0 auto; place-items: center; border-radius: .6rem; background: rgb(228 110 138 / 12%); color: #e46e8a; }
.metric-card p { margin: 0 0 .2rem; color: #6b7280; font-size: .72rem; font-weight: 600; line-height: 1.25; }
.metric-card p span { white-space: nowrap; }
.metric-card strong { color: #00021f; font-size: clamp(1.15rem, 2.7vw, 1.5rem); font-variant-numeric: tabular-nums; font-weight: 800; }
.metric-card strong small { color: #6b7280; font-size: .7rem; font-weight: 700; }
.content-section { min-width: 0; padding: 1.1rem 1.2rem; border: 1px solid #e5e7eb; border-radius: .75rem; background: #fff; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .9rem; }
.section-heading h3 { margin: 0; color: #00021f; font-size: 1rem; font-weight: 700; }
.section-mark { color: #6b7280; font-size: .72rem; font-weight: 600; white-space: nowrap; }
.section-mark i, .section-icon { color: #e46e8a; }
.distribution-list { display: grid; height: 12.75rem; grid-template-columns: repeat(6, minmax(0, 1fr)); align-items: end; gap: .55rem; margin: 0; padding: .25rem 0 0; list-style: none; }
.distribution-item { display: grid; min-width: 0; height: 100%; grid-template-rows: 1fr auto auto; justify-items: center; gap: .3rem; }
.bar-track { display: flex; width: min(100%, 3.15rem); height: 100%; align-items: flex-end; justify-content: center; overflow: hidden; border-radius: .4rem .4rem .15rem .15rem; background: #f3f4f6; }
.bar-fill { display: block; width: 100%; min-height: 0; border-radius: .4rem .4rem 0 0; background: linear-gradient(to top, #b0669f, #e46e8a); transition: height .2s ease; }
.bucket-count { color: #00021f; font-size: .8rem; font-variant-numeric: tabular-nums; }
.bucket-label { max-width: 100%; color: #6b7280; font-size: .68rem; line-height: 1.2; text-align: center; overflow-wrap: anywhere; }
.lower-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: 1rem; }
.section-note { margin: -.55rem 0 .65rem; color: #6b7280; font-size: .73rem; }
.genre-year { margin: .15rem 0 0; }
.streak-list { display: grid; gap: .25rem; margin: 0; padding: 0; list-style: none; }
.streak-row { display: flex; min-width: 0; align-items: center; gap: .65rem; padding: .48rem .25rem; border-top: 1px solid #f3f4f6; }
.streak-rank { display: grid; width: 1.65rem; height: 1.65rem; flex: 0 0 auto; place-items: center; border-radius: .5rem; background: #f3f4f6; color: #374151; font-size: .73rem; font-weight: 800; }
.streak-name { min-width: 0; flex: 1; overflow: hidden; color: #111827; font-size: .83rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.streak-days { flex: 0 0 auto; color: #e46e8a; font-size: .78rem; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
.streak-days small { color: #6b7280; font-size: .68rem; font-weight: 600; }
.top-genres { display: grid; gap: .35rem; margin: 0; padding: 0; list-style: none; }
.top-genre-row { display: flex; min-width: 0; align-items: center; gap: .65rem; padding: .42rem .5rem; border-top: 1px solid #f3f4f6; }
.genre-rank { display: grid; width: 1.9rem; height: 1.9rem; flex: 0 0 auto; place-items: center; border-radius: 50%; background: #f3f4f6; color: #4b5563; font-size: .82rem; font-weight: 800; }
.genre-rank--1 { background: #fef3c7; color: #b45309; }
.genre-rank--2 { background: #e5e7eb; color: #4b5563; }
.genre-rank--3 { background: #fde8d7; color: #9a3412; }
.genre-details { display: flex; min-width: 0; flex: 1; align-items: center; justify-content: space-between; gap: .5rem; }
.genre-details strong { overflow: hidden; color: #111827; font-size: .82rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.genre-details small { color: #6b7280; font-size: .68rem; line-height: 1.25; text-align: right; }
.empty-copy { margin: .35rem 0; color: #6b7280; font-size: .83rem; }
.state-message { display: flex; min-height: 12rem; flex-direction: column; align-items: center; justify-content: center; gap: .8rem; margin: 0; color: #6b7280; text-align: center; }
.error-state { color: #e11d48; }
.retry-button { padding: .5rem 1rem; border: 2px solid #00021f; border-radius: 9999px; background: #00021f; color: #fff; font-size: .875rem; font-weight: 600; cursor: pointer; transition: background-color .15s ease, border-color .15s ease; }
.retry-button:hover { border-color: #e46e8a; background: #e46e8a; }

/* Modo oscuro: superficies corporativas rv-darkSurface / rv-darkCard. */
:global(.dark) .community-stats-dialog { background: #2a2b3d; color: #fff; border-color: rgb(255 255 255 / 10%); }
:global(.dark) .dialog-header { background: linear-gradient(to right, rgb(228 110 138 / 10%), rgb(176 102 159 / 10%)), #2a2b3d; border-color: rgb(255 255 255 / 10%); }
:global(.dark) .metric-card, :global(.dark) .content-section { background: rgb(255 255 255 / 5%); border-color: rgb(255 255 255 / 10%); box-shadow: none; }
:global(.dark) .dialog-header h2, :global(.dark) .section-heading h3, :global(.dark) .metric-card strong, :global(.dark) .streak-name, :global(.dark) .genre-details strong, :global(.dark) .bucket-count { color: #fff; }
:global(.dark) .dialog-subtitle, :global(.dark) .metric-card p, :global(.dark) .metric-card strong small, :global(.dark) .section-note, :global(.dark) .section-mark, :global(.dark) .empty-copy, :global(.dark) .bucket-label, :global(.dark) .genre-details small, :global(.dark) .streak-days small, :global(.dark) .state-message { color: #9ca3af; }
:global(.dark) .metric-icon { background: rgb(228 110 138 / 18%); }
:global(.dark) .distribution-list .bar-track { background: rgb(255 255 255 / 6%); }
:global(.dark) .streak-row, :global(.dark) .top-genre-row { border-color: rgb(255 255 255 / 8%); }
:global(.dark) .streak-rank, :global(.dark) .genre-rank { background: #404157; color: #e5e7eb; }
:global(.dark) .state-message.error-state { color: #fb7185; }
:global(.dark) .retry-button { border-color: #e5e7eb; background: #e5e7eb; color: #00021f; }
:global(.dark) .retry-button:hover { border-color: #e46e8a; background: #e46e8a; color: #fff; }
:global(.dark) .genre-rank--1 { background: rgb(251 191 36 / 18%); color: #fcd34d; }
:global(.dark) .genre-rank--2 { background: #404157; color: #e5e7eb; }
:global(.dark) .genre-rank--3 { background: rgb(234 88 12 / 18%); color: #fdba74; }

@media (max-width: 760px) {
  .community-stats-overlay { padding: .5rem; }
  .community-stats-dialog { max-height: 96dvh; }
  .dialog-header { padding: 1rem 1rem .85rem; }
  .dialog-body { gap: .7rem; padding: .8rem 1rem 1rem; }
  .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; }
  .metric-card { gap: .55rem; padding: .7rem .6rem; }
  .metric-icon { width: 2rem; height: 2rem; border-radius: .55rem; }
  .metric-card p { font-size: .66rem; }
  .lower-grid { grid-template-columns: minmax(0, 1fr); gap: .7rem; }
  .content-section { padding: .9rem; }
  .distribution-list { height: 10rem; gap: .25rem; }
  .bucket-label { font-size: .62rem; }
}
@media (max-width: 390px) {
  .metric-card { align-items: flex-start; flex-direction: column; }
  .metric-card p { min-height: 1.7em; }
  .distribution-list { gap: .15rem; }
  .bucket-label { font-size: .58rem; }
}
</style>
