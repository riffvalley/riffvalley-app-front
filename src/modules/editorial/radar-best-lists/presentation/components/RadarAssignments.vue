<template>
  <div class="space-y-8">
    <div
      v-if="assignmentsQuery.isPending.value"
      role="status"
      class="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300"
    >
      Cargando asignaciones del Radar…
    </div>
    <div
      v-else-if="assignmentsQuery.isError.value"
      role="alert"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-200"
    >
      No se pudieron cargar las asignaciones.
      <button
        class="ml-2 underline focus-visible:outline focus-visible:outline-2"
        @click="assignmentsQuery.refetch()"
      >
        Reintentar
      </button>
    </div>
    <div class="radar-mobile-navigation lg:hidden">
      <nav class="radar-mobile-nav" aria-label="Navegación de asignaciones Radar">
        <button
          v-for="group in availablePositions"
          :key="`mobile-${group}`"
          type="button"
          class="radar-mobile-tab border border-gray-300 bg-white text-gray-700 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-200"
          :class="
            activeMobilePosition === group
              ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:!bg-indigo-900/50 dark:!text-indigo-100 dark:!border-indigo-300'
              : ''
          "
          :aria-pressed="activeMobilePosition === group"
          @click="activeMobilePosition = group"
        >
          Radar {{ group }} · {{ groupedWeekAsignations[group]?.length || 0 }}/4
        </button>
        <button
          type="button"
          class="radar-mobile-tab border border-gray-300 bg-white text-gray-700 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-200"
          :class="
            activeMobilePosition === 0
              ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:!bg-indigo-900/50 dark:!text-indigo-100 dark:!border-indigo-300'
              : ''
          "
          :aria-pressed="activeMobilePosition === 0"
          @click="activeMobilePosition = 0"
        >
          Bandeja · {{ unassignedWeekAsignations.length }}
        </button>
      </nav>
      <button
        type="button"
        class="radar-mobile-new border border-indigo-200 bg-white text-indigo-700 dark:bg-rv-darkCard dark:text-indigo-100 dark:border-indigo-400/40"
        @click="addRadar"
      >
        <i class="fa-solid fa-plus" aria-hidden="true"></i> Nuevo Radar
      </button>
    </div>
    <!-- Radares (Grupos) - Grid de 2 Columnas -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- native drag-and-drop zone -->
      <div
        v-for="group in availablePositions"
        :key="group"
        role="group"
        tabindex="-1"
        :aria-label="`Radar ${group}, zona de asignación y movimiento`"
        :class="[
          'p-3 rounded-2xl border border-dashed transition-all duration-300',
          { 'radar-mobile-inactive': activeMobilePosition !== group },
          dragOverGroup === group
            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 shadow-md transform scale-[1.01]'
            : 'bg-white dark:bg-rv-darkCard border-gray-200 dark:border-white/10 shadow-sm',
        ]"
        @dragover.prevent="onDragOver(group)"
        @dragleave="onDragLeave"
        @drop="onDrop(group)"
      >
        <!-- Header Radar -->
        <div class="flex items-center justify-between mb-3 px-1">
          <h4 class="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
            <div
              class="p-1 px-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400 text-xs"
            >
              <i class="fa-solid fa-satellite-dish"></i>
            </div>
            Radar {{ group }}
          </h4>
          <div class="flex items-center gap-1.5">
            <a
              v-if="getWeeklyWpPost(group)"
              :href="getWeeklyWpPost(group).wpPostUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-[10px] font-bold"
              title="Ver borrador en WordPress"
            >
              <i class="fab fa-wordpress"></i>
              <span>Borrador</span>
            </a>
            <button
              @click="publishRadarToWordPress(group)"
              :disabled="publishingRadar[group]"
              :aria-label="
                (getWeeklyWpPost(group) ? 'Actualizar' : 'Crear') + ' WordPress del Radar ' + group
              "
              :title="
                (getWeeklyWpPost(group) ? 'Actualizar' : 'Crear') + ' WordPress del Radar ' + group
              "
              class="w-10 h-10 flex items-center justify-center rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 disabled:opacity-50 transition-colors"
            >
              <i
                :class="publishingRadar[group] ? 'fa-solid fa-spinner fa-spin' : 'fab fa-wordpress'"
                class="text-xs"
              ></i>
            </button>
            <span
              class="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors shadow-sm"
              :class="
                (groupedWeekAsignations[group]?.length || 0) >= 4
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30'
              "
            >
              {{ groupedWeekAsignations[group]?.length || 0 }}/4
            </span>
          </div>
        </div>

        <!-- Grid Radar (dentro de cada grupo) - Vertical Compacto -->
        <div class="flex flex-col gap-2 min-h-[50px]">
          <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- native draggable card -->
          <div
            v-for="asignation in groupedWeekAsignations[group]"
            :key="asignation.id"
            role="article"
            tabindex="-1"
            draggable="true"
            @dragstart="onDragStart(asignation, $event)"
            class="radar-assignment-card self-center w-full bg-white dark:bg-rv-darkSurface rounded-xl shadow-sm border border-gray-200 dark:border-white/10 group flex flex-col cursor-grab active:cursor-grabbing relative overflow-hidden hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all duration-200"
          >
            <div class="radar-card-header radar-card-header-with-close">
              <div class="radar-card-cover">
                <div class="radar-card-image">
                  <img v-if="asignation.disc.image" :src="asignation.disc.image" alt="" />
                  <span v-else aria-hidden="true">{{ asignation.disc.artist.name.charAt(0) }}</span>
                </div>
                <RadarDiscSpotifyButton
                  :disc-name="asignation.disc.name"
                  :artist-name="asignation.disc.artist.name"
                  :album-url="asignation.disc.link"
                  class="radar-card-spotify"
                />
              </div>

              <div class="radar-card-info">
                <h5 class="radar-assignment-title" :title="asignation.disc.name">
                  {{ asignation.disc.name }}
                </h5>
                <div class="radar-card-artist" :title="asignation.disc.artist.name">
                  <span class="radar-artist-name">{{ asignation.disc.artist.name }}</span>
                  <div
                    v-if="getDiscCountry(asignation.disc)?.isoCode"
                    class="radar-card-country"
                    role="img"
                    :aria-label="`País: ${getDiscCountry(asignation.disc).name}`"
                    :title="getDiscCountry(asignation.disc).name"
                  >
                    <img
                      v-if="getDiscCountry(asignation.disc).isoCode === 'int'"
                      src="/int.svg"
                      alt="Internacional"
                    />
                    <CircleFlags
                      v-else-if="getDiscCountry(asignation.disc).isoCode.length >= 2"
                      :country="getDiscCountry(asignation.disc).isoCode.slice(0, 2).toLowerCase()"
                      :show-flag-name="false"
                    />
                  </div>
                </div>
                <div class="radar-card-meta">
                  <span
                    v-if="asignation.disc.genre"
                    class="radar-card-genre"
                    :title="asignation.disc.genre.name"
                    :style="{ backgroundColor: asignation.disc.genre.color || '#9ca3af' }"
                  >
                    {{ asignation.disc.genre.name }}
                  </span>
                </div>
              </div>

              <button
                type="button"
                class="radar-card-close"
                @click.stop="moveTo(asignation, 0)"
                :aria-label="`Mover ${asignation.disc.name} a la bandeja`"
                title="Mover a la bandeja"
              >
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>

            <div class="radar-card-details">
              <div class="radar-editorial-controls">
                <button
                  v-if="editingUserAsignationId !== asignation.id"
                  type="button"
                  @click="startEditingUser(asignation)"
                  class="radar-assignee-control"
                  :aria-label="`Cambiar usuario asignado a ${asignation.disc.name}`"
                  :title="asignation.user?.username || 'Sin usuario asignado'"
                >
                  <div class="radar-assignee-avatar">
                    <img
                      v-if="asignation.user?.image"
                      :src="asignation.user.image"
                      alt=""
                      class="w-full h-full object-cover"
                    />
                    <span v-else>{{ asignation.user?.username?.charAt(0) || "?" }}</span>
                  </div>
                  <span class="radar-assignee-name">
                    {{ asignation.user?.username || "–" }}
                  </span>
                </button>
                <select
                  v-else
                  :aria-label="`Usuario asignado a ${asignation.disc.name}`"
                  @change="changeUser(asignation, $event)"
                  @blur="editingUserAsignationId = null"
                  class="radar-assignee-control radar-assignee-select"
                >
                  <option
                    v-for="user in users"
                    :key="user.id"
                    :value="user.id"
                    :selected="user.id === asignation.user?.id"
                  >
                    {{ user.username }}
                  </option>
                </select>

                <button
                  @click="openDescriptionModal(asignation)"
                  :class="{
                    'radar-edit-control-has-metadata':
                      asignation.description ||
                      asignation.similarBands ||
                      asignation.spotifyTrackId ||
                      asignation.genre,
                  }"
                  class="radar-edit-control"
                  :aria-label="`Editar disco ${asignation.disc.name}`"
                  title="Editar disco"
                >
                  <i class="fa-solid fa-pen" aria-hidden="true"></i>
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  class="radar-validate-control"
                  :class="asignation.done ? 'is-validated' : 'is-pending'"
                  :aria-pressed="asignation.done"
                  :aria-label="
                    asignation.done
                      ? `Desmarcar ${asignation.disc.name} como validado`
                      : `Validar ${asignation.disc.name}`
                  "
                  :title="asignation.done ? 'Desmarcar como validado' : 'Validar disco'"
                  @click="toggleDone(asignation)"
                >
                  <i class="fa-solid fa-check" aria-hidden="true"></i>
                </button>
              </div>

              <div class="radar-card-move-row">
                <span>Mover a</span>
                <select
                  :aria-label="`Mover ${asignation.disc.name} a otro Radar o a la bandeja`"
                  class="radar-move-select"
                  :value="asignation.position"
                  @change="moveFromSelect(asignation, $event)"
                >
                  <option :value="0">Bandeja</option>
                  <option
                    v-for="pos in availablePositions"
                    :key="pos"
                    :value="pos"
                    :disabled="pos !== asignation.position && isGroupFull(pos, asignation)"
                  >
                    Radar {{ pos }}{{ isGroupFull(pos, asignation) ? " · completo" : "" }}
                  </option>
                </select>
                <button
                  type="button"
                  class="radar-delete-control"
                  :aria-label="`Eliminar asignación de ${asignation.disc.name}`"
                  title="Eliminar asignación"
                  @click="remove(asignation)"
                >
                  <i class="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="!groupedWeekAsignations[group] || groupedWeekAsignations[group].length === 0"
            class="py-8 flex flex-col items-center justify-center gap-1.5 text-gray-300 dark:text-gray-600 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-rv-darkBg/20"
          >
            <i class="fa-solid fa-arrow-down text-sm opacity-50"></i>
            <p class="text-xs">Arrastra aquí</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Bandeja de entrada (Sin asignar) -->
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- native drag-and-drop zone -->
    <div
      role="group"
      tabindex="-1"
      aria-label="Bandeja de discos sin asignar"
      class="p-3 rounded-2xl border-2 border-dashed transition-colors duration-300 mt-6"
      :class="[
        { 'radar-mobile-inactive': activeMobilePosition !== 0 },
        dragOverGroup === 0
          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400'
          : 'bg-gray-50/50 dark:bg-rv-darkBg/30 border-gray-200 dark:border-white/10',
      ]"
      @dragover.prevent="onDragOver(0)"
      @dragleave="onDragLeave"
      @drop="onDrop(0)"
    >
      <h4
        class="text-sm font-bold mb-3 px-1 flex flex-wrap items-center justify-between gap-3 text-gray-700 dark:text-gray-300"
      >
        <span class="flex items-center gap-2">
          <span
            class="p-1 px-1.5 bg-gray-200 dark:bg-rv-darkSurface rounded text-gray-600 dark:text-gray-300 text-xs"
          >
            <i class="fa-solid fa-inbox"></i>
          </span>
          Bandeja de Entrada
          <span
            class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 shadow-sm"
          >
            {{ unassignedWeekAsignations.length }}
          </span>
        </span>
        <button
          @click="addRadar"
          class="hidden lg:flex px-3 py-2.5 min-h-11 bg-white dark:bg-rv-darkCard text-indigo-600 dark:text-indigo-400 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 transition-all font-semibold items-center gap-2 text-xs"
        >
          <i class="fa-solid fa-plus"></i>
          Nuevo Radar
        </button>
      </h4>

      <!-- Grid de Tarjetas Inbox -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 min-h-[50px]">
        <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- native draggable card -->
        <div
          v-for="asignation in unassignedWeekAsignations"
          :key="asignation.id"
          role="article"
          tabindex="-1"
          draggable="true"
          @dragstart="onDragStart(asignation, $event)"
          class="radar-assignment-card self-center w-full bg-white dark:bg-rv-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-white/10 group flex flex-col cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 overflow-hidden"
        >
          <div class="radar-card-header">
            <div class="radar-card-cover">
              <div class="radar-card-image">
                <img v-if="asignation.disc.image" :src="asignation.disc.image" alt="" />
                <span v-else aria-hidden="true">{{ asignation.disc.artist.name.charAt(0) }}</span>
              </div>
              <RadarDiscSpotifyButton
                :disc-name="asignation.disc.name"
                :artist-name="asignation.disc.artist.name"
                :album-url="asignation.disc.link"
                class="radar-card-spotify"
              />
            </div>

            <div class="radar-card-info">
              <h5 class="radar-assignment-title" :title="asignation.disc.name">
                {{ asignation.disc.name }}
              </h5>
              <div class="radar-card-artist" :title="asignation.disc.artist.name">
                <span class="radar-artist-name">{{ asignation.disc.artist.name }}</span>
                <div
                  v-if="getDiscCountry(asignation.disc)?.isoCode"
                  class="radar-card-country"
                  role="img"
                  :aria-label="`País: ${getDiscCountry(asignation.disc).name}`"
                  :title="getDiscCountry(asignation.disc).name"
                >
                  <img
                    v-if="getDiscCountry(asignation.disc).isoCode === 'int'"
                    src="/int.svg"
                    alt="Internacional"
                  />
                  <CircleFlags
                    v-else-if="getDiscCountry(asignation.disc).isoCode.length >= 2"
                    :country="getDiscCountry(asignation.disc).isoCode.slice(0, 2).toLowerCase()"
                    :show-flag-name="false"
                  />
                </div>
              </div>
              <div class="radar-card-meta">
                <span
                  v-if="asignation.disc.genre"
                  class="radar-card-genre"
                  :title="asignation.disc.genre.name"
                  :style="{ backgroundColor: asignation.disc.genre.color || '#9ca3af' }"
                >
                  {{ asignation.disc.genre.name }}
                </span>
              </div>
            </div>
          </div>

          <div class="radar-card-details">
            <div class="radar-editorial-controls">
              <button
                v-if="editingUserAsignationId !== asignation.id"
                type="button"
                @click="startEditingUser(asignation)"
                class="radar-assignee-control"
                :aria-label="`Cambiar usuario asignado a ${asignation.disc.name}`"
                :title="asignation.user?.username || 'Sin usuario asignado'"
              >
                <span class="radar-assignee-avatar">
                  <img
                    v-if="asignation.user?.image"
                    :src="asignation.user.image"
                    alt=""
                    class="w-full h-full object-cover"
                  />
                  <span v-else>{{ asignation.user?.username?.charAt(0) || "?" }}</span>
                </span>
                <span class="radar-assignee-name">
                  {{ asignation.user?.username || "–" }}
                </span>
              </button>
              <select
                v-else
                :aria-label="`Usuario asignado a ${asignation.disc.name}`"
                @change="changeUser(asignation, $event)"
                @blur="editingUserAsignationId = null"
                class="radar-assignee-control radar-assignee-select"
              >
                <option
                  v-for="user in users"
                  :key="user.id"
                  :value="user.id"
                  :selected="user.id === asignation.user?.id"
                >
                  {{ user.username }}
                </option>
              </select>

              <button
                @click="openDescriptionModal(asignation)"
                :class="{
                  'radar-edit-control-has-metadata':
                    asignation.description ||
                    asignation.similarBands ||
                    asignation.spotifyTrackId ||
                    asignation.genre,
                }"
                class="radar-edit-control"
                :aria-label="`Editar disco ${asignation.disc.name}`"
                title="Editar disco"
              >
                <i class="fa-solid fa-pen" aria-hidden="true"></i>
                <span>Editar</span>
              </button>

              <button
                type="button"
                class="radar-validate-control"
                :class="asignation.done ? 'is-validated' : 'is-pending'"
                :aria-pressed="asignation.done"
                :aria-label="
                  asignation.done
                    ? `Desmarcar ${asignation.disc.name} como validado`
                    : `Validar ${asignation.disc.name}`
                "
                :title="asignation.done ? 'Desmarcar como validado' : 'Validar disco'"
                @click="toggleDone(asignation)"
              >
                <i class="fa-solid fa-check" aria-hidden="true"></i>
              </button>
            </div>

            <div class="radar-card-move-row">
              <span>Mover a</span>
              <select
                :aria-label="`Mover ${asignation.disc.name} a un Radar`"
                class="radar-move-select"
                :value="asignation.position"
                @change="moveFromSelect(asignation, $event)"
              >
                <option
                  v-for="pos in availablePositions"
                  :key="pos"
                  :value="pos"
                  :disabled="isGroupFull(pos, asignation)"
                >
                  Radar {{ pos }}{{ isGroupFull(pos, asignation) ? " · completo" : "" }}
                </option>
              </select>
              <button
                type="button"
                class="radar-delete-control"
                :aria-label="`Eliminar asignación de ${asignation.disc.name}`"
                title="Eliminar asignación"
                @click="remove(asignation)"
              >
                <i class="fa-solid fa-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State for Inbox -->
        <div
          v-if="unassignedWeekAsignations.length === 0"
          class="col-span-full py-10 flex flex-col items-center justify-center gap-1.5 text-gray-300 dark:text-gray-600 text-xs"
        >
          <i class="fa-solid fa-inbox text-2xl opacity-40"></i>
          <p>Bandeja de entrada vacía</p>
        </div>
      </div>
    </div>

    <DiscDescriptionModal
      v-if="editingAsignation"
      :key="editingAsignation.id"
      :asignation="editingAsignation"
      :saving="savingDescription"
      @close="editingAsignation = null"
      @submit="handleSaveDescription"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch, computed, nextTick, type PropType } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import {
  useRadarAssignableUsersQuery,
  useRadarAssignmentsQuery,
  radarDetailQueryKeys,
} from "../../application/radarDetailQueries";
import { useRadarDetailMutations } from "../../application/useRadarDetailMutations";
import { useAuthStore } from "@/modules/identity/auth";
import type { EditorialAsignation, UpdateAsignationPayload } from "@services/asignation/asignation";
import type { RvUser } from "@/modules/identity/users";
import type { RadarAssignment } from "../../types/radarAssignment";
import RadarDiscSpotifyButton from "./RadarDiscSpotifyButton.vue";
import DiscDescriptionModal from "@views/list/components/DiscDescriptionModal.vue";
import SwalService from "@services/swal/SwalService";
import { createWpPosts, type WeeklyWpPostRecord } from "@services/list/list";
import Swal from "sweetalert2";

export default defineComponent({
  name: "RadarAssignments",
  props: {
    listId: { type: String, required: true },
    wpWeeklyPosts: {
      type: Array as PropType<WeeklyWpPostRecord[] | null>,
      default: () => [],
    },
  },
  emits: ["wp-published"],
  components: { RadarDiscSpotifyButton, DiscDescriptionModal },
  setup(props, { emit }) {
    const auth = useAuthStore();
    const queryClient = useQueryClient();
    const assignmentsQuery = useRadarAssignmentsQuery(() => props.listId);
    const usersQuery = useRadarAssignableUsersQuery();
    const mutations = useRadarDetailMutations(() => props.listId);
    const assignmentsKey = computed(() =>
      radarDetailQueryKeys.assignments(
        { userId: auth.userId, generation: auth.authSessionGeneration },
        props.listId
      )
    );
    const normalizeAssignments = (items: readonly EditorialAsignation[]): RadarAssignment[] =>
      items
        .filter((item): item is RadarAssignment => item.disc !== null)
        .map((item) => ({
          ...item,
          position: item.position ?? 0,
          user: item.user ?? { id: "", username: "" },
        }));
    const asignations = computed(() => normalizeAssignments(assignmentsQuery.data.value ?? []));
    const users = computed<RvUser[]>(() => usersQuery.data.value ?? []);

    const updateAssignments = (update: (items: EditorialAsignation[]) => EditorialAsignation[]) => {
      queryClient.setQueryData<EditorialAsignation[]>(assignmentsKey.value, (current = []) =>
        update(current)
      );
    };

    const persistAssignmentUpdate = (
      updated: { id: string } & Partial<RadarAssignment> & Partial<UpdateAsignationPayload>
    ) => {
      const payload: UpdateAsignationPayload = {};
      if (updated.done !== undefined) payload.done = updated.done;
      if (updated.position !== undefined && updated.position !== null)
        payload.position = updated.position;
      if (updated.userId !== undefined) payload.userId = updated.userId;
      else if (updated.user?.id) payload.userId = updated.user.id;
      if (updated.description !== undefined && updated.description !== null)
        payload.description = updated.description;
      if (updated.similarBands !== undefined && updated.similarBands !== null)
        payload.similarBands = updated.similarBands;
      if (updated.spotifyTrackId !== undefined && updated.spotifyTrackId !== null)
        payload.spotifyTrackId = updated.spotifyTrackId;
      if (updated.genre !== undefined && updated.genre !== null) payload.genre = updated.genre;
      return mutations.updateAssignment({ id: updated.id, payload });
    };

    const editingUserAsignationId = ref<string | null>(null);
    const editingAsignation = ref<RadarAssignment | null>(null);
    const savingDescription = ref(false);

    const startEditingUser = async (asignation: RadarAssignment) => {
      editingUserAsignationId.value = asignation.id;
      await nextTick();
    };

    const getDiscCountry = (disc: RadarAssignment["disc"]) =>
      disc.artist?.country || disc.artistCountry || disc.country || null;

    const changeUser = async (asignation: RadarAssignment, event: Event) => {
      const select = event.target as HTMLSelectElement;
      const newUserId = select.value;
      if (newUserId && newUserId !== asignation.user.id) {
        try {
          await persistAssignmentUpdate({ id: asignation.id, userId: newUserId });
          const newUser = users.value.find((user) => user.id === newUserId);
          if (newUser) {
            updateAssignments((items) =>
              items.map((item) =>
                item.id === asignation.id
                  ? ({ ...item, user: newUser } as EditorialAsignation)
                  : item
              )
            );
          }
          SwalService.success("Usuario actualizado");
        } catch {
          SwalService.error("Error al cambiar usuario");
        }
      }
      editingUserAsignationId.value = null;
    };

    const draggedItem = ref<RadarAssignment | null>(null);
    const dragOverGroup = ref<number | null>(null);
    const availablePositionsCount = ref(2);
    const activeMobilePosition = ref(1);
    const addRadar = () => {
      availablePositionsCount.value++;
      activeMobilePosition.value = availablePositionsCount.value;
    };

    watch(
      () => props.listId,
      () => {
        availablePositionsCount.value = 2;
        activeMobilePosition.value = 1;
      }
    );

    const preservePersistedPositions = (items: readonly { position: number | null }[]) => {
      const maxPersistedPosition = items.reduce(
        (maxPosition, item) =>
          (item.position ?? 0) > 0 ? Math.max(maxPosition, item.position ?? 0) : maxPosition,
        2
      );
      availablePositionsCount.value = Math.max(availablePositionsCount.value, maxPersistedPosition);
    };
    watch(
      assignmentsQuery.data,
      (items) => {
        if (items) preservePersistedPositions(items);
      },
      { immediate: true }
    );

    const unassignedWeekAsignations = computed(() =>
      asignations.value.filter((a) => a.position === 0)
    );
    const groupedWeekAsignations = computed(() => {
      const groups: Record<number, RadarAssignment[]> = {};
      asignations.value.forEach((asignation) => {
        if (asignation.position > 0) {
          if (!groups[asignation.position]) groups[asignation.position] = [];
          groups[asignation.position].push(asignation);
        }
      });
      return groups;
    });
    const availablePositions = computed(() =>
      Array.from({ length: availablePositionsCount.value }, (_, index) => index + 1)
    );
    const isGroupFull = (groupNumber: number, currentAsignation?: RadarAssignment | null) => {
      if (groupNumber === 0) return false;
      const group = groupedWeekAsignations.value[groupNumber] || [];
      if (currentAsignation && currentAsignation.position === groupNumber) return false;
      return group.length >= 4;
    };

    const onDragStart = (item: RadarAssignment, event: DragEvent) => {
      draggedItem.value = item;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.dropEffect = "move";
      }
    };
    const onDragOver = (group: number) => {
      if (!isGroupFull(group, draggedItem.value)) dragOverGroup.value = group;
    };
    const onDragLeave = () => (dragOverGroup.value = null);
    const onDrop = async (group: number) => {
      dragOverGroup.value = null;
      if (!draggedItem.value) return;
      if (isGroupFull(group, draggedItem.value)) {
        SwalService.error("Este radar ya tiene 4 discos asignados.");
        return;
      }
      const item = draggedItem.value;
      if (item.position === group) {
        draggedItem.value = null;
        return;
      }
      await moveTo(item, group);
      draggedItem.value = null;
    };

    const remove = async (asignation: RadarAssignment) => {
      const confirmation = await SwalService.confirm(
        `¿Eliminar la asignación de "${asignation.disc.name}"?`,
        "Esta acción no se puede deshacer.",
        "Sí, eliminar",
        "Cancelar"
      );
      if (!confirmation.isConfirmed) return;

      try {
        await mutations.removeAssignment(asignation.id);
      } catch {
        SwalService.error("Error al eliminar");
      }
    };
    const toggleDone = async (asignation: RadarAssignment) => {
      const updated = { ...asignation, done: !asignation.done };
      try {
        await persistAssignmentUpdate(updated);
        updateAssignments((items) =>
          items.map((item) => (item.id === asignation.id ? { ...item, ...updated } : item))
        );
      } catch (error) {
        console.error("Error actualizando:", error);
      }
    };
    const updatePosition = async (asignation: RadarAssignment) => {
      try {
        await persistAssignmentUpdate(asignation);
        updateAssignments((items) =>
          items.map((item) => (item.id === asignation.id ? { ...item, ...asignation } : item))
        );
      } catch {
        SwalService.error("Error al mover el disco");
      }
    };
    const moveTo = async (asignation: RadarAssignment, group: number) => {
      if (asignation.position === group) return;
      if (isGroupFull(group, asignation)) {
        SwalService.error(`El Radar ${group} ya está completo (4/4).`);
        return;
      }
      await updatePosition({ ...asignation, position: group });
    };
    const moveFromSelect = async (asignation: RadarAssignment, event: Event) => {
      const position = Number((event.target as HTMLSelectElement).value);
      await moveTo(asignation, position);
      activeMobilePosition.value = position;
    };
    const openDescriptionModal = (asignation: RadarAssignment) =>
      (editingAsignation.value = asignation);
    const handleSaveDescription = async (payload: {
      description: string;
      similarBands: string;
      spotifyTrackId: string;
      genre: string;
    }) => {
      const asignation = editingAsignation.value;
      if (!asignation) return;
      savingDescription.value = true;
      try {
        await persistAssignmentUpdate({ ...asignation, ...payload });
        updateAssignments((items) =>
          items.map((item) => (item.id === asignation.id ? { ...item, ...payload } : item))
        );
        SwalService.success("Disco actualizado");
      } catch {
        SwalService.error("No se pudo guardar (revisa si se sincronizó con WordPress)");
      } finally {
        savingDescription.value = false;
        editingAsignation.value = null;
      }
    };

    const getWeeklyWpPost = (group: number) =>
      (props.wpWeeklyPosts ?? []).find((post) => post.position === group) || null;
    const publishingRadar = reactive<Record<number, boolean>>({});
    const publishRadarToWordPress = async (group: number) => {
      if (publishingRadar[group]) return;
      publishingRadar[group] = true;
      try {
        const result = await createWpPosts(props.listId, group);
        emit("wp-published", result.posts);
        const postsHtml = result.posts
          .map((post) => {
            const linkHtml = `<a href="${post.link}" target="_blank" class="text-blue-600 underline">${post.title}</a>`;
            const changes: string[] = [];
            if (post.added) changes.push(`${post.added} añadido${post.added === 1 ? "" : "s"}`);
            if (post.updated)
              changes.push(`${post.updated} actualizado${post.updated === 1 ? "" : "s"}`);
            if (post.removed)
              changes.push(`${post.removed} eliminado${post.removed === 1 ? "" : "s"}`);
            let icon = "✅";
            let statusText = "Creado";
            if (post.adopted) {
              icon = "ℹ️";
              statusText = "Vinculado a un post existente sin trackear";
            } else if (post.warning) {
              icon = "⚠️";
              statusText = changes.length
                ? `Actualizado (${changes.join(", ")})`
                : "Aviso al actualizar";
            } else if (changes.length) {
              statusText = `Actualizado (${changes.join(", ")})`;
            }
            return `<li class="mb-2"><div>${icon} ${statusText}</div><div>${linkHtml}</div>${post.warning ? `<div class="text-amber-600 text-xs mt-1">${post.warning}</div>` : ""}</li>`;
          })
          .join("");
        const hasWarning = result.posts.some((post) => post.warning);
        await Swal.fire({
          icon: hasWarning ? "warning" : "success",
          title: `Radar ${group}`,
          html: `<ul class="text-left text-sm mt-2">${postsHtml}</ul>`,
        });
      } catch (error: unknown) {
        const message =
          typeof error === "object" && error !== null && "response" in error
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        SwalService.error(message || `Error al publicar el Radar ${group} en WordPress`);
      } finally {
        publishingRadar[group] = false;
      }
    };

    return {
      asignations,
      assignmentsQuery,
      unassignedWeekAsignations,
      groupedWeekAsignations,
      availablePositions,
      remove,
      toggleDone,
      activeMobilePosition,
      isGroupFull,
      moveFromSelect,
      addRadar,
      updatePosition,
      onDragStart,
      onDragOver,
      onDragLeave,
      onDrop,
      dragOverGroup,
      draggedItem,
      users,
      editingUserAsignationId,
      startEditingUser,
      changeUser,
      moveTo,
      getDiscCountry,
      editingAsignation,
      savingDescription,
      openDescriptionModal,
      handleSaveDescription,
      getWeeklyWpPost,
      publishingRadar,
      publishRadarToWordPress,
    };
  },
});
</script>

<style scoped>
.radar-mobile-nav {
  display: contents;
}

.radar-mobile-navigation {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.radar-mobile-new {
  min-height: 44px;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.radar-mobile-tab {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0.625rem 0.4rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.radar-assignment-card {
  min-width: 0;
  max-width: 380px;
}

.radar-card-header {
  position: relative;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.75rem 0.75rem 0;
}

.radar-card-header-with-close {
  grid-template-columns: 52px minmax(0, 1fr) 44px 44px;
}

.radar-card-cover {
  display: contents;
}

.radar-card-image {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  overflow: hidden;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.65rem;
  background: rgb(243 244 246);
  color: rgb(107 114 128);
  font-size: 1.1rem;
  font-weight: 700;
}

.dark .radar-card-image {
  border-color: rgb(255 255 255 / 10%);
  background: #00021f;
  color: rgb(209 213 219);
}

.radar-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.radar-card-spotify {
  display: flex;
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
  width: 44px;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 0.6rem;
  background: #22c55e;
  color: white;
  transition: background-color 150ms ease;
}

.radar-card-spotify:hover {
  background: #16a34a;
}

.radar-card-spotify:focus-visible {
  outline: 2px solid #15803d;
  outline-offset: 2px;
}

.radar-card-info {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  padding-top: 0.1rem;
  text-align: left;
}

.radar-assignment-title {
  display: -webkit-box;
  overflow: hidden;
  color: rgb(17 24 39);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.dark .radar-assignment-title {
  color: white;
}

.radar-card-artist {
  display: flex;
  align-items: center;
  overflow: hidden;
  gap: 0.35rem;
  margin-top: 0.3rem;
  color: rgb(75 85 99);
  font-size: 0.75rem;
  line-height: 1.3;
  text-align: left;
}

.radar-artist-name {
  display: -webkit-box;
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.dark .radar-card-artist {
  color: rgb(209 213 219);
}

.radar-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  margin-top: 0.45rem;
}

.radar-card-genre {
  flex: 0 0 auto;
  max-width: 100%;
  padding: 0.15rem 0.5rem;
  overflow-wrap: break-word;
  border-radius: 9999px;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.3;
}

.radar-card-country {
  display: flex;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  align-items: center;
  justify-content: center;
}

.radar-card-country img,
.radar-card-country :deep(img),
.radar-card-country :deep(svg) {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
}

.radar-card-close,
.radar-delete-control,
.radar-validate-control {
  display: inline-flex;
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.6rem;
  background: rgb(249 250 251);
  transition:
    color 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease;
}

.dark .radar-card-close,
.dark .radar-delete-control,
.dark .radar-validate-control.is-pending {
  border-color: rgb(255 255 255 / 10%);
  background: rgb(255 255 255 / 5%);
  color: rgb(229 231 235);
}

.radar-card-close {
  grid-column: 4;
  grid-row: 1;
  margin-top: -0.25rem;
  color: rgb(107 114 128);
}

.radar-card-close:hover {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.radar-card-details {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.6rem 0.75rem 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgb(229 231 235);
}

.dark .radar-card-details {
  border-color: rgb(255 255 255 / 10%);
}

.radar-editorial-controls {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
}

.radar-assignee-control {
  display: flex;
  width: auto;
  min-width: 0;
  min-height: 44px;
  flex: 0 1 11rem;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.65rem;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.6rem;
  background: rgb(249 250 251);
  color: rgb(55 65 81);
  text-align: left;
}

.dark .radar-assignee-control {
  border-color: rgb(255 255 255 / 10%);
  background: #00021f;
  color: rgb(229 231 235);
}

.radar-assignee-avatar {
  display: inline-flex;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: rgb(224 231 255);
  color: rgb(67 56 202);
  font-size: 0.65rem;
  font-weight: 700;
}

.radar-assignee-name {
  min-width: 0;
  overflow: hidden;
  flex: 1 1 auto;
  font-size: 0.75rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.radar-assignee-select {
  max-width: none;
  padding: 0 0.5rem;
  border-radius: 0.6rem;
  background: white;
  font-size: 0.75rem;
}

.dark .radar-assignee-select {
  border-color: rgb(129 140 248 / 40%);
  background: var(--rv-darkSurface);
  color: rgb(229 231 235);
}

.radar-edit-control {
  display: inline-flex;
  min-width: max-content;
  min-height: 44px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.7rem;
  border: 1px solid rgb(199 210 254);
  border-radius: 0.6rem;
  background: rgb(238 242 255);
  color: rgb(67 56 202);
  font-size: 0.75rem;
  font-weight: 700;
  transition:
    color 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease;
}

.radar-edit-control:hover {
  background: rgb(224 231 255);
}

.radar-edit-control-has-metadata {
  border-color: rgb(79 70 229);
  background: rgb(79 70 229);
  color: white;
}

.radar-edit-control-has-metadata:hover {
  background: rgb(67 56 202);
}

.dark .radar-edit-control {
  border-color: rgb(129 140 248 / 35%);
  background: rgb(255 255 255 / 7%);
  color: rgb(199 210 254);
}

.dark .radar-edit-control-has-metadata {
  border-color: rgb(99 102 241);
  background: rgb(99 102 241);
  color: white;
}

.radar-validate-control.is-pending {
  color: rgb(79 70 229);
}

.radar-validate-control.is-pending:hover {
  border-color: rgb(165 180 252);
  background: rgb(238 242 255);
}

.radar-validate-control.is-validated {
  border-color: rgb(34 197 94);
  background: rgb(34 197 94);
  color: white;
}

.radar-validate-control.is-validated:hover {
  border-color: rgb(22 163 74);
  background: rgb(22 163 74);
}

.radar-delete-control {
  color: rgb(220 38 38);
}

.radar-delete-control:hover {
  border-color: rgb(252 165 165);
  background: rgb(254 242 242);
}

.dark .radar-delete-control {
  color: rgb(248 113 113);
}

.dark .radar-delete-control:hover {
  border-color: rgb(248 113 113 / 40%);
  background: rgb(127 29 29 / 20%);
}

.radar-card-move-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 44px;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  min-width: 0;
}

.radar-card-move-row > span {
  color: rgb(75 85 99);
  font-size: 0.75rem;
  font-weight: 700;
}

.dark .radar-card-move-row > span {
  color: rgb(209 213 219);
}

.radar-move-select {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0 0.55rem;
  border: 1px solid rgb(165 180 252);
  border-radius: 0.6rem;
  background: white;
  color: rgb(49 46 129);
  font-size: 0.75rem;
}

.dark .radar-move-select {
  border-color: rgb(129 140 248 / 40%);
  background: var(--rv-darkBg);
  color: white;
}

.radar-assignment-card button:focus-visible,
.radar-assignment-card select:focus-visible,
.radar-mobile-tab:focus-visible {
  outline: 2px solid rgb(99 102 241);
  outline-offset: 2px;
}

@media (max-width: 1023px) {
  .radar-mobile-inactive {
    display: none;
  }

  .radar-mobile-navigation {
    margin-bottom: 1rem;
  }

  .radar-card-header {
    grid-template-columns: 52px minmax(0, 1fr);
    gap: 0.4rem;
    padding: 0.65rem 0.5rem 0;
  }

  .radar-card-header-with-close {
    grid-template-columns: 52px minmax(0, 1fr) 84px;
    grid-template-rows: auto auto;
    align-items: start;
  }

  .radar-card-header-with-close .radar-card-cover {
    grid-column: 1;
    grid-row: 1 / span 2;
  }

  .radar-card-cover {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
    width: 52px;
    min-width: 0;
  }

  .radar-card-spotify {
    width: 52px;
  }

  .radar-card-header-with-close .radar-card-info {
    display: contents;
  }

  .radar-card-header-with-close .radar-assignment-title {
    grid-column: 2;
    grid-row: 1;
    align-self: center;
  }

  .radar-card-header-with-close .radar-card-artist {
    grid-column: 2;
    grid-row: 2;
    margin-top: 0.2rem;
  }

  .radar-card-header-with-close .radar-card-meta {
    display: contents;
  }

  .radar-card-header-with-close .radar-card-genre {
    grid-column: 3;
    grid-row: 2;
    margin-top: 0.6rem;
    padding-inline: 0.4rem;
  }

  .radar-card-header-with-close .radar-card-country {
    margin-top: 0.1rem;
  }

  .radar-card-close {
    grid-column: 3;
    grid-row: 1;
    justify-self: end;
    margin-top: 0;
  }

  .radar-card-details {
    gap: 0.45rem;
    margin: 0.65rem;
    padding-top: 0.55rem;
  }

  .radar-editorial-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 44px;
    gap: 0.6rem;
    width: 100%;
  }

  .radar-assignee-control {
    grid-column: 1 / -1;
    width: 100%;
    max-width: none;
    padding: 0 0.5rem;
  }

  .radar-edit-control {
    grid-column: 1;
    width: 100%;
    padding: 0 0.6rem;
  }

  .radar-validate-control {
    grid-column: 2;
  }

  .radar-card-move-row {
    grid-template-columns: minmax(0, 1fr) 44px;
    gap: 0.5rem;
    row-gap: 0.4rem;
  }

  .radar-card-move-row > span {
    grid-column: 1 / -1;
    justify-self: start;
  }
}

@media (max-width: 359px) {
  .radar-card-header-with-close {
    grid-template-columns: 52px minmax(0, 1fr);
    grid-template-rows: auto;
  }

  .radar-card-header-with-close .radar-card-cover {
    grid-column: 1;
    grid-row: 1;
  }

  .radar-card-header-with-close .radar-card-info {
    display: flex;
    grid-column: 2;
    grid-row: 1;
    flex-direction: column;
    align-items: stretch;
  }

  .radar-card-header-with-close .radar-assignment-title {
    padding-right: 2.5rem;
  }

  .radar-card-header-with-close .radar-card-artist {
    margin-top: 0.2rem;
  }

  .radar-card-header-with-close .radar-card-meta {
    display: flex;
    margin-top: 0.35rem;
  }

  .radar-card-header-with-close .radar-card-genre {
    margin-top: 0;
  }

  .radar-card-close {
    position: absolute;
    top: 0.65rem;
    right: 0.5rem;
  }
}

@media (min-width: 1024px) {
  .radar-mobile-navigation {
    display: none;
  }
}
</style>
