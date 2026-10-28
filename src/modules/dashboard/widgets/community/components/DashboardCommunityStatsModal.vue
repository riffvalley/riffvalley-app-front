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
.community-stats-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.community-stats-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: rgb(8 14 29 / 72%); backdrop-filter: blur(5px); cursor: default; }
.community-stats-dialog { position: relative; z-index: 1; width: min(100%, 68rem); max-height: min(92vh, 58rem); margin: 0; padding: 0; overflow-y: auto; overscroll-behavior: contain; border: 1px solid rgb(148 163 184 / 22%); border-radius: 1.15rem; background: #f7f8fb; color: #1c2942; box-shadow: 0 24px 80px rgb(0 0 0 / 35%); outline: none; }
.dialog-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.45rem 1.6rem 1.25rem; border-bottom: 1px solid #e2e6ee; background: #fff; }
.dialog-header h2 { margin: .15rem 0 .25rem; color: #152442; font-size: clamp(1.3rem, 3vw, 1.75rem); font-weight: 800; letter-spacing: -.035em; line-height: 1.15; }
.dialog-subtitle { margin: 0; color: #647084; font-size: .88rem; }
.close-button { position: relative; display: grid; width: 2.55rem; height: 2.55rem; flex: 0 0 auto; padding: 0; place-items: center; border: 0; border-radius: 50%; background: #182746; color: white; font-size: 1.15rem; cursor: pointer; transition: background .15s ease, transform .15s ease; }
.close-icon { position: absolute; top: 50%; left: 50%; display: flex; width: 1.15rem; height: 1.15rem; align-items: center; justify-content: center; margin: 0; line-height: 1; text-align: center; transform: translate(-50%, -50%); }
.close-button:hover { transform: rotate(4deg); background: #a44462; }
.close-button:focus-visible, .retry-button:focus-visible { outline: 3px solid #d67c96; outline-offset: 3px; }
.dialog-body { display: grid; gap: 1rem; padding: 1.25rem 1.6rem 1.6rem; }
.metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .7rem; }
.metric-card { display: flex; min-width: 0; align-items: center; gap: .8rem; padding: .9rem; border: 1px solid #e1e5ed; border-radius: .8rem; background: #fff; box-shadow: 0 2px 8px rgb(20 35 62 / 4%); }
.metric-icon { display: grid; width: 2.35rem; height: 2.35rem; flex: 0 0 auto; place-items: center; border-radius: .7rem; background: #f2e8ed; color: #9e4e69; }
.metric-card p { margin: 0 0 .22rem; color: #657086; font-size: .72rem; font-weight: 650; line-height: 1.25; }
.metric-card p span { white-space: nowrap; }
.metric-card strong { color: #172847; font-size: clamp(1.18rem, 2.7vw, 1.55rem); font-variant-numeric: tabular-nums; font-weight: 800; letter-spacing: -.04em; }
.metric-card strong small { color: #758095; font-size: .7rem; font-weight: 700; letter-spacing: 0; }
.content-section { min-width: 0; padding: 1.1rem 1.2rem; border: 1px solid #e1e5ed; border-radius: .9rem; background: #fff; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .9rem; }
.section-heading h3 { margin: .1rem 0 0; color: #172847; font-size: 1.05rem; font-weight: 800; letter-spacing: -.02em; }
.section-mark { color: #778196; font-size: .72rem; font-weight: 650; white-space: nowrap; }
.section-mark i, .section-icon { color: #a34b68; }
.distribution-list { display: grid; height: 12.75rem; grid-template-columns: repeat(6, minmax(0, 1fr)); align-items: end; gap: .55rem; margin: 0; padding: .25rem 0 0; list-style: none; }
.distribution-item { display: grid; min-width: 0; height: 100%; grid-template-rows: 1fr auto auto; justify-items: center; gap: .3rem; }
.bar-track { display: flex; width: min(100%, 3.15rem); height: 100%; align-items: flex-end; justify-content: center; overflow: hidden; border-radius: .4rem .4rem .15rem .15rem; background: linear-gradient(to top, #f4f5f8, #fafbfc); }
.bar-fill { display: block; width: 100%; min-height: 0; border-radius: .4rem .4rem 0 0; background: linear-gradient(to top, #293e62, #bb5c78); transition: height .2s ease; }
.bucket-count { color: #263754; font-size: .8rem; font-variant-numeric: tabular-nums; }
.bucket-label { max-width: 100%; color: #69758a; font-size: .68rem; line-height: 1.2; text-align: center; overflow-wrap: anywhere; }
.lower-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: 1rem; }
.section-note { margin: -.55rem 0 .65rem; color: #778196; font-size: .73rem; }
.genre-year { margin: .15rem 0 0; }
.streak-list { display: grid; gap: .25rem; margin: 0; padding: 0; list-style: none; }
.streak-row { display: flex; min-width: 0; align-items: center; gap: .65rem; padding: .48rem .25rem; border-top: 1px solid #edf0f4; }
.streak-rank { display: grid; width: 1.65rem; height: 1.65rem; flex: 0 0 auto; place-items: center; border-radius: .5rem; background: #f0f2f6; color: #52627e; font-size: .73rem; font-weight: 800; }
.streak-name { min-width: 0; flex: 1; overflow: hidden; color: #293954; font-size: .83rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.streak-days { flex: 0 0 auto; color: #a64b48; font-size: .78rem; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
.streak-days small { color: #778196; font-size: .68rem; font-weight: 600; }
.top-genres { display: grid; gap: .35rem; margin: 0; padding: 0; list-style: none; }
.top-genre-row { display: flex; min-width: 0; align-items: center; gap: .65rem; padding: .42rem .5rem; border-top: 1px solid #edf0f4; }
.genre-rank { display: grid; width: 1.9rem; height: 1.9rem; flex: 0 0 auto; place-items: center; border-radius: 50%; background: #eef1f5; color: #657086; font-size: .82rem; font-weight: 800; }
.genre-rank--1 { background: #fff2cd; color: #90600b; }
.genre-rank--2 { background: #e9edf2; color: #59677b; }
.genre-rank--3 { background: #f3e0d5; color: #8a4c2c; }
.genre-details { display: flex; min-width: 0; flex: 1; align-items: center; justify-content: space-between; gap: .5rem; }
.genre-details strong { overflow: hidden; color: #293954; font-size: .82rem; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.genre-details small { color: #68758b; font-size: .68rem; line-height: 1.25; text-align: right; }
.empty-copy { margin: .35rem 0; color: #758095; font-size: .83rem; }
.state-message { display: flex; min-height: 12rem; flex-direction: column; align-items: center; justify-content: center; gap: .8rem; margin: 0; color: #5e6c84; text-align: center; }
.error-state { color: #a33149; }
.retry-button { padding: .55rem .9rem; border: 0; border-radius: 999px; background: #182746; color: #fff; font-weight: 700; cursor: pointer; }
:global(.dark) .community-stats-dialog {
  background: #111827; color: #e5e9f0; border-color: rgb(255 255 255 / 10%);
}
:global(.dark) .dialog-header, :global(.dark) .metric-card, :global(.dark) .content-section { background: #182235; border-color: rgb(255 255 255 / 9%); }
:global(.dark) .dialog-header h2, :global(.dark) .section-heading h3, :global(.dark) .metric-card strong, :global(.dark) .streak-name, :global(.dark) .genre-details strong { color: #f3f5f8; }
:global(.dark) .dialog-subtitle, :global(.dark) .metric-card p, :global(.dark) .section-note, :global(.dark) .section-mark, :global(.dark) .empty-copy, :global(.dark) .bucket-label, :global(.dark) .genre-details small { color: #aeb8c8; }
:global(.dark) .distribution-list .bar-track { background: #202d42; }
:global(.dark) .streak-row { border-color: rgb(255 255 255 / 8%); }
:global(.dark) .streak-rank { background: #26344b; color: #d9deea; }
:global(.dark) .top-genre-row { border-color: rgb(255 255 255 / 8%); }
:global(.dark) .genre-rank { background: #26344b; color: #d9deea; }
:global(.dark) .bucket-count { color: #e5e9f0; }
:global(.dark) .streak-days { color: #fca5a5; }
:global(.dark) .streak-days small,
:global(.dark) .state-message { color: #aeb8c8; }
:global(.dark) .state-message.error-state { color: #fca5a5; }
:global(.dark) .genre-rank--1 { background: #4a3b20; color: #ffd36a; }
:global(.dark) .genre-rank--2 { background: #303b4b; color: #d0d8e5; }
:global(.dark) .genre-rank--3 { background: #49352d; color: #dfa27e; }
@media (max-width: 760px) {
  .community-stats-overlay { align-items: flex-end; padding: .45rem; }
  .community-stats-dialog { max-height: 94dvh; border-radius: 1rem 1rem .8rem .8rem; }
  .dialog-header { padding: 1.1rem 1rem .9rem; }
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
  .community-stats-overlay { padding: 0; }
  .community-stats-dialog { max-height: 96dvh; border-radius: .9rem .9rem 0 0; }
  .metric-card { align-items: flex-start; flex-direction: column; }
  .metric-card p { min-height: 1.7em; }
  .distribution-list { gap: .15rem; }
  .bucket-label { font-size: .58rem; }
}
</style>
