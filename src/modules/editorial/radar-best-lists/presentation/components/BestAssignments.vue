<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  useBestAssignmentsQuery,
  useBestAssignableUsersQuery,
} from "../../application/bestDetailQueries";
import { useBestDetailMutations } from "../../application/useBestDetailMutations";
import type { EditorialAsignation, UpdateAsignationPayload } from "@services/asignation/asignation";
import type { RvUser } from "@/modules/identity/users";
import RadarDiscSpotifyButton from "./RadarDiscSpotifyButton.vue";
import DiscDescriptionModal from "@views/list/components/DiscDescriptionModal.vue";
import SwalService from "@services/swal/SwalService";

const props = defineProps<{ listId: string }>();
type BestDisc = NonNullable<EditorialAsignation["disc"]> & {
  link?: string | null;
  artistCountry?: { id: string; name: string; isoCode?: string } | null;
};
type BestAssignment = Omit<EditorialAsignation, "disc"> & {
  disc: BestDisc;
  user: NonNullable<EditorialAsignation["user"]>;
};

const assignmentsQuery = useBestAssignmentsQuery(() => props.listId);
const usersQuery = useBestAssignableUsersQuery();
const mutations = useBestDetailMutations(() => props.listId);
const assignments = computed<BestAssignment[]>(() =>
  (assignmentsQuery.data.value ?? [])
    .filter((item): item is EditorialAsignation & { disc: BestDisc } => item.disc !== null)
    .map((item) => ({ ...item, user: item.user ?? { id: "", username: "" } }))
    .sort((a, b) => a.user.username.localeCompare(b.user.username))
);
const emit = defineEmits<{ "assignment-count": [count: number | null] }>();
const users = computed<RvUser[]>(() => usersQuery.data.value ?? []);
const editingUserId = ref<string | null>(null);
const editingAssignment = ref<BestAssignment | null>(null);
const savingMetadata = ref(false);

watch(
  () => assignmentsQuery.data.value,
  (data) => emit("assignment-count", data ? assignments.value.length : null),
  { immediate: true }
);

function countryFor(disc: BestDisc) {
  return (
    [disc.artist?.country, disc.artistCountry, disc.country].find((country) => country?.isoCode) ??
    null
  );
}

async function changeUser(assignment: BestAssignment, event: Event) {
  const userId = (event.target as HTMLSelectElement).value;
  if (!userId || userId === assignment.user.id) {
    editingUserId.value = null;
    return;
  }
  try {
    await mutations.updateAssignment({ id: assignment.id, payload: { userId } });
    SwalService.success("Usuario actualizado");
  } catch {
    SwalService.error("Error al cambiar el usuario");
  } finally {
    editingUserId.value = null;
  }
}

async function toggleDone(assignment: BestAssignment) {
  try {
    await mutations.updateAssignment({ id: assignment.id, payload: { done: !assignment.done } });
  } catch {
    SwalService.error("No se pudo actualizar el estado de validación");
  }
}

async function remove(assignment: BestAssignment) {
  const confirmation = await SwalService.confirm(
    `¿Eliminar la asignación de "${assignment.disc.name}"?`,
    "Esta acción no se puede deshacer.",
    "Sí, eliminar",
    "Cancelar"
  );
  if (!confirmation.isConfirmed) return;
  try {
    await mutations.removeAssignment(assignment.id);
    SwalService.success("Asignación eliminada");
  } catch {
    SwalService.error("No se pudo eliminar la asignación");
  }
}

async function startEditingUser(assignment: BestAssignment) {
  editingUserId.value = assignment.id;
  await nextTick();
}

async function saveMetadata(payload: {
  description: string;
  similarBands: string;
  spotifyTrackId: string;
  genre: string;
}) {
  const assignment = editingAssignment.value;
  if (!assignment) return;
  savingMetadata.value = true;
  const update: UpdateAsignationPayload = payload;
  try {
    await mutations.updateAssignment({ id: assignment.id, payload: update });
    SwalService.success("Disco actualizado");
  } catch {
    SwalService.error("No se pudo guardar (revisa si se sincronizó con WordPress)");
  } finally {
    savingMetadata.value = false;
    editingAssignment.value = null;
  }
}
</script>

<template>
  <div>
    <div v-if="assignmentsQuery.isPending.value" role="status" class="best-query-state">
      Cargando asignaciones…
    </div>
    <div v-else-if="assignmentsQuery.isError.value" role="alert" class="best-query-error">
      No se pudieron cargar las asignaciones.
      <button type="button" @click="assignmentsQuery.refetch()">Reintentar</button>
    </div>
    <template v-else>
      <div v-if="assignments.length" class="best-assignment-grid">
        <article
          v-for="assignment in assignments"
          :key="assignment.id"
          class="best-assignment-card bg-white dark:bg-rv-darkSurface"
        >
          <div class="best-card-header">
            <div class="best-card-cover">
              <div class="best-card-image">
                <img v-if="assignment.disc.image" :src="assignment.disc.image" alt="" />
                <span v-else aria-hidden="true">{{ assignment.disc.artist.name.charAt(0) }}</span>
              </div>
              <RadarDiscSpotifyButton
                :disc-name="assignment.disc.name"
                :artist-name="assignment.disc.artist.name"
                :album-url="assignment.disc.link"
                class="best-card-spotify"
              />
            </div>
            <div class="best-card-info">
              <h3 class="best-card-title" :title="assignment.disc.name">
                {{ assignment.disc.name }}
              </h3>
              <div class="best-card-artist" :title="assignment.disc.artist.name">
                <span>{{ assignment.disc.artist.name }}</span>
                <span
                  v-if="countryFor(assignment.disc)?.isoCode"
                  class="best-card-country"
                  role="img"
                  :aria-label="`País: ${countryFor(assignment.disc)?.name ?? countryFor(assignment.disc)?.isoCode}`"
                  :title="countryFor(assignment.disc)?.name"
                >
                  <img
                    v-if="countryFor(assignment.disc)?.isoCode === 'int'"
                    src="/int.svg"
                    alt="Internacional"
                  />
                  <CircleFlags
                    v-else-if="(countryFor(assignment.disc)?.isoCode?.length ?? 0) >= 2"
                    :country="countryFor(assignment.disc)!.isoCode!.slice(0, 2).toLowerCase()"
                    :show-flag-name="false"
                    class="h-[18px] w-[18px] shrink-0"
                  />
                </span>
              </div>
              <div class="best-card-meta">
                <span
                  v-if="assignment.disc.genre"
                  class="best-card-genre"
                  :title="assignment.disc.genre.name"
                  :style="{ backgroundColor: assignment.disc.genre.color || '#9ca3af' }"
                >
                  {{ assignment.disc.genre.name }}
                </span>
              </div>
            </div>
          </div>
          <div class="best-card-details">
            <div class="best-card-actions">
              <button
                v-if="editingUserId !== assignment.id"
                type="button"
                class="best-assignee"
                :aria-label="`Cambiar usuario asignado a ${assignment.disc.name}`"
                :title="assignment.user.username || 'Sin usuario asignado'"
                @click="startEditingUser(assignment)"
              >
                <span class="best-avatar">
                  <img v-if="assignment.user.image" :src="assignment.user.image" alt="" />
                  <span v-else>{{ assignment.user.username.charAt(0) || "?" }}</span>
                </span>
                <span class="best-assignee-name">{{ assignment.user.username || "–" }}</span>
              </button>
              <select
                v-else
                class="best-assignee best-assignee-select"
                :aria-label="`Usuario asignado a ${assignment.disc.name}`"
                :value="assignment.user.id"
                @change="changeUser(assignment, $event)"
                @blur="editingUserId = null"
              >
                <option v-for="user in users" :key="user.id" :value="user.id">
                  {{ user.username }}
                </option>
              </select>
              <button
                type="button"
                class="best-edit"
                :aria-label="`Editar disco ${assignment.disc.name}`"
                title="Editar disco"
                @click="editingAssignment = assignment"
              >
                <i class="fa-solid fa-pen" aria-hidden="true"></i><span>Editar</span>
              </button>
              <button
                type="button"
                class="best-validate"
                :class="assignment.done ? 'is-validated' : 'is-pending'"
                :aria-pressed="Boolean(assignment.done)"
                :aria-label="
                  assignment.done
                    ? `Desmarcar ${assignment.disc.name} como validado`
                    : `Validar ${assignment.disc.name}`
                "
                :title="assignment.done ? 'Desmarcar como validado' : 'Validar disco'"
                @click="toggleDone(assignment)"
              >
                <i class="fa-solid fa-check" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="best-delete"
                :aria-label="`Eliminar asignación de ${assignment.disc.name}`"
                title="Eliminar asignación"
                @click="remove(assignment)"
              >
                <i class="fa-solid fa-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="best-empty-state">Todavía no hay discos asignados a esta lista.</div>
    </template>
    <DiscDescriptionModal
      v-if="editingAssignment"
      :key="editingAssignment.id"
      :asignation="editingAssignment"
      :saving="savingMetadata"
      @close="editingAssignment = null"
      @submit="saveMetadata"
    />
  </div>
</template>

<style scoped>
.best-query-state,
.best-query-error,
.best-empty-state {
  padding: 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
}
.best-query-state,
.best-empty-state {
  background: #f9fafb;
  color: #6b7280;
}
.dark .best-query-state,
.dark .best-empty-state {
  background: #00021f;
  color: #d1d5db;
}
.best-query-error {
  background: #fef2f2;
  color: #991b1b;
}
.best-query-error button {
  margin-left: 0.5rem;
  text-decoration: underline;
}
.best-assignment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
  gap: 0.75rem;
}
.best-assignment-card {
  min-width: 0;
  max-width: 25rem;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 0.85rem;
  box-shadow: 0 1px 2px #0000000d;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.dark .best-assignment-card {
  border-color: #ffffff1a;
}
.best-assignment-card:hover {
  border-color: #a5b4fc;
  box-shadow: 0 4px 12px #00000012;
}
.best-card-header {
  position: relative;
  display: grid;
  grid-template-columns: 3.25rem minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.75rem 0;
  min-width: 0;
}
.best-card-cover {
  display: flex;
  grid-column: 1;
  grid-row: 1;
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
  width: 3.25rem;
  min-width: 0;
}
.best-card-image {
  display: flex;
  width: 3.25rem;
  height: 3.25rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 0.65rem;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 1.1rem;
  font-weight: 700;
}
.dark .best-card-image {
  border-color: #ffffff1a;
  background: #00021f;
  color: #d1d5db;
}
.best-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.best-card-spotify {
  display: flex;
  width: 3.25rem;
  min-width: 3.25rem;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.6rem;
  background: #22c55e;
  color: white;
}
.best-card-info {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  text-align: left;
}
.best-card-title {
  display: -webkit-box;
  overflow: hidden;
  margin: -0.25rem 0 0.35rem;
  padding-right: 1.6rem;
  color: #111827;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.dark .best-card-title {
  color: white;
}
.best-card-artist {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.4rem;
  color: #6b7280;
  font-size: 0.72rem;
}
.dark .best-card-artist {
  color: #d1d5db;
}
.best-card-artist > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.best-card-country {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  align-items: center;
  justify-content: center;
}
.best-card-country :deep(img),
.best-card-country :deep(svg),
.best-card-country > img {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
}
.best-card-meta {
  display: flex;
  min-width: 0;
  margin-top: 0.4rem;
}
.best-card-genre {
  max-width: 100%;
  overflow: hidden;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  color: white;
  font-size: 0.62rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.best-card-details {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.65rem 0.75rem 0.75rem;
  padding-top: 0.55rem;
  border-top: 1px solid #e5e7eb;
}
.dark .best-card-details {
  border-color: #ffffff1a;
}
.best-card-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 2.75rem 2.75rem;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.best-assignee,
.best-edit,
.best-validate,
.best-delete {
  display: flex;
  min-width: 0;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 0.6rem;
  background: #f9fafb;
  color: #374151;
}
.dark .best-assignee,
.dark .best-edit,
.dark .best-validate,
.dark .best-delete {
  border-color: #ffffff1a;
  background: #00021f;
  color: #e5e7eb;
}
.best-assignee {
  justify-content: flex-start;
  gap: 0.5rem;
  padding: 0 0.6rem;
  text-align: left;
}
.best-avatar {
  display: inline-flex;
  width: 1.4rem;
  height: 1.4rem;
  flex: 0 0 1.4rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4338ca;
  font-size: 0.65rem;
  font-weight: 700;
}
.best-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.best-assignee-name {
  overflow: hidden;
  font-size: 0.75rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.best-assignee-select {
  width: 100%;
  font-size: 0.75rem;
}
.best-edit {
  gap: 0.4rem;
  padding: 0 0.7rem;
  color: #4338ca;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}
.dark .best-edit {
  color: #c7d2fe;
}
.best-validate,
.best-delete {
  width: 2.75rem;
  cursor: pointer;
}
.best-validate.is-pending {
  color: #6b7280;
}
.best-validate.is-validated {
  border-color: #86efac;
  background: #dcfce7;
  color: #15803d;
}
.best-delete {
  color: #dc2626;
}
.best-assignee:focus-visible,
.best-edit:focus-visible,
.best-validate:focus-visible,
.best-delete:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
@media (max-width: 420px) {
  .best-card-header {
    gap: 0.5rem;
    padding: 0.65rem 0.55rem 0;
  }
  .best-card-info {
    align-self: center;
  }
  .best-card-details {
    margin: 0.6rem;
    padding-top: 0.5rem;
  }
  .best-card-actions {
    grid-template-columns: minmax(0, 1fr) 2.75rem 2.75rem;
    gap: 0.45rem;
  }
  .best-assignee {
    grid-column: 1 / -1;
    width: 100%;
  }
  .best-edit {
    grid-column: 1;
    width: 100%;
  }
  .best-validate {
    grid-column: 2;
  }
  .best-delete {
    grid-column: 3;
  }
}
</style>
