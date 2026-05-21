<template>
  <div class="space-y-8">
    <!-- Solo se muestran las secciones de asignación de posición si type === "week" -->
    <template v-if="isWeek">
      <!-- Toolbar Radares -->
      <div class="flex justify-end mb-4">
        <button @click="availablePositionsCount++"
          class="px-4 py-2 bg-white dark:bg-rv-darkCard text-indigo-600 dark:text-indigo-400 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 transition-all font-semibold flex items-center gap-2 text-sm">
          <i class="fa-solid fa-plus"></i>
          Nuevo Radar
        </button>
      </div>

      <!-- Radares (Grupos) - Grid de 2 Columnas -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div v-for="group in availablePositions" :key="group"
          class="p-3 rounded-2xl border border-dashed transition-all duration-300"
          :class="dragOverGroup === group
            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 shadow-md transform scale-[1.01]'
            : 'bg-white dark:bg-rv-darkCard border-gray-200 dark:border-white/10 shadow-sm'"
          @dragover.prevent="onDragOver(group)" @dragleave="onDragLeave" @drop="onDrop(group)">

          <!-- Header Radar -->
          <div class="flex items-center justify-between mb-3 px-1">
            <h4 class="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
              <div class="p-1 px-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400 text-xs">
                <i class="fa-solid fa-satellite-dish"></i>
              </div>
              Radar {{ group }}
            </h4>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors shadow-sm"
              :class="(groupedWeekAsignations[group]?.length || 0) >= 4
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30'
                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30'">
              {{ groupedWeekAsignations[group]?.length || 0 }}/4
            </span>
          </div>

          <!-- Grid Radar (dentro de cada grupo) - Vertical Compacto -->
          <div class="flex flex-col gap-2 min-h-[50px]">
            <div v-for="asignation in groupedWeekAsignations[group]" :key="asignation.id" draggable="true"
              @dragstart="onDragStart(asignation, $event)"
              class="bg-white dark:bg-rv-darkSurface rounded-xl p-0 shadow-sm border border-gray-200 dark:border-white/10 group flex flex-col cursor-grab active:cursor-grabbing relative overflow-hidden hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all duration-200">

              <!-- Left Accent Bar -->
              <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rv-purple to-rv-pink"></div>

              <!-- Main Content -->
              <div class="flex items-start gap-2.5 pl-3 pr-2.5 pt-2.5">
                <!-- Cover -->
                <div class="flex-shrink-0">
                  <div class="w-11 h-11 rounded-lg bg-gray-100 dark:bg-rv-darkBg flex items-center justify-center text-gray-400 font-bold overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm">
                    <img v-if="asignation.disc.image" :src="asignation.disc.image" class="w-full h-full object-cover" />
                    <span v-else class="text-sm">{{ asignation.disc.artist.name.charAt(0) }}</span>
                  </div>
                </div>

                <div class="min-w-0 flex-1">
                  <!-- Title & Remove -->
                  <div class="flex justify-between items-start gap-1 mb-0.5">
                    <h5 class="font-bold text-gray-900 dark:text-white text-xs leading-tight truncate flex-1"
                      :title="asignation.disc.name">
                      {{ asignation.disc.name }}
                    </h5>
                    <button @click.stop="moveTo(asignation, 0)"
                      class="w-4 h-4 rounded flex items-center justify-center text-[9px] text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                      title="Quitar de radar">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>

                  <!-- Artist + meta -->
                  <div class="flex items-center gap-1.5 min-w-0">
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate" :title="asignation.disc.artist.name">
                      {{ asignation.disc.artist.name }}
                    </p>
                    <span v-if="asignation.disc.genre"
                      class="px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white shadow-sm truncate max-w-[70px] flex-shrink-0"
                      :style="{ backgroundColor: asignation.disc.genre.color || '#9ca3af' }">
                      {{ asignation.disc.genre.name }}
                    </span>
                    <div v-if="getDiscCountry(asignation.disc)?.isoCode" class="flex-shrink-0">
                      <template v-if="getDiscCountry(asignation.disc).isoCode === 'int'">
                        <img src="/int.svg" alt="Internacional" class="h-3.5 w-3.5 rounded-full object-cover" />
                      </template>
                      <template v-else-if="getDiscCountry(asignation.disc).isoCode.length >= 2">
                        <CircleFlags :country="getDiscCountry(asignation.disc).isoCode.slice(0, 2).toLowerCase()" :show-flag-name="false" class="h-3.5 w-3.5" />
                      </template>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer: Actions + User + Checkbox -->
              <div class="mt-2 mx-3 mb-2.5 pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-2">
                <!-- Action buttons -->
                <div class="flex items-center gap-1">
                  <div class="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 dark:bg-rv-darkBg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer" title="Spotify">
                    <SpotifyArtistButton :artistName="asignation.disc.artist.name" class="!text-[9px] !bg-transparent !text-inherit !p-0 !w-full !h-full flex items-center justify-center !shadow-none" />
                  </div>
                  <button @click="copyArtistAndDisc(asignation.disc.artist.name, asignation.disc.name)"
                    class="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 dark:bg-rv-darkBg text-rv-purple hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors" title="Copiar info">
                    <i class="fa-solid fa-clipboard text-[9px]"></i>
                  </button>
                  <button @click="copyToClipboard(asignation.disc.image)"
                    class="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 dark:bg-rv-darkBg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Copiar imagen">
                    <i class="fa-solid fa-image text-[9px]"></i>
                  </button>
                  <button @click="remove(asignation.id)"
                    class="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 dark:bg-rv-darkBg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">
                    <i class="fa-solid fa-trash text-[9px]"></i>
                  </button>
                </div>

                <!-- User + Done -->
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <div v-if="editingUserAsignationId !== asignation.id" @click="startEditingUser(asignation)"
                    class="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-rv-darkBg px-1 py-0.5 rounded transition-colors group/user">
                    <div class="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-indigo-700 dark:text-indigo-300 ring-1 ring-white dark:ring-rv-darkSurface overflow-hidden">
                      <img v-if="asignation.user?.image" :src="asignation.user.image" class="w-full h-full object-cover" />
                      <span v-else>{{ asignation.user?.username?.charAt(0) || '?' }}</span>
                    </div>
                    <span class="text-[10px] font-medium text-gray-400 dark:text-gray-500 group-hover/user:text-indigo-600 dark:group-hover/user:text-indigo-400 max-w-[48px] truncate">
                      {{ asignation.user?.username || '–' }}
                    </span>
                  </div>
                  <select v-else @change="changeUser(asignation, $event)" @blur="editingUserAsignationId = null"
                    class="text-[10px] p-0.5 border rounded border-indigo-200 dark:border-indigo-500/30 focus:ring-0 bg-white dark:bg-rv-darkSurface dark:text-gray-200 h-5 max-w-[80px]">
                    <option v-for="user in users" :key="user.id" :value="user.id" :selected="user.id === asignation.user?.id">
                      {{ user.username }}
                    </option>
                  </select>

                  <label class="relative flex items-center justify-center cursor-pointer flex-shrink-0" title="Marcar como hecho">
                    <input type="checkbox" :checked="asignation.done" @change="toggleDone(asignation)" class="peer sr-only" />
                    <div class="w-4 h-4 border-2 border-gray-300 dark:border-white/20 rounded peer-checked:bg-green-500 peer-checked:border-green-500 transition-colors"></div>
                    <i class="fa-solid fa-check text-[8px] text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none"></i>
                  </label>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="!groupedWeekAsignations[group] || groupedWeekAsignations[group].length === 0"
              class="py-8 flex flex-col items-center justify-center gap-1.5 text-gray-300 dark:text-gray-600 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-rv-darkBg/20">
              <i class="fa-solid fa-arrow-down text-sm opacity-50"></i>
              <p class="text-xs">Arrastra aquí</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bandeja de entrada (Sin asignar) -->
      <div class="p-3 rounded-2xl border-2 border-dashed transition-colors duration-300 mt-6"
        :class="dragOverGroup === 0
          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400'
          : 'bg-gray-50/50 dark:bg-rv-darkBg/30 border-gray-200 dark:border-white/10'"
        @dragover.prevent="onDragOver(0)" @dragleave="onDragLeave" @drop="onDrop(0)">

        <h4 class="text-sm font-bold mb-3 px-1 flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <div class="p-1 px-1.5 bg-gray-200 dark:bg-rv-darkSurface rounded text-gray-600 dark:text-gray-300 text-xs">
            <i class="fa-solid fa-inbox"></i>
          </div>
          Bandeja de Entrada
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 shadow-sm">
            {{ unassignedWeekAsignations.length }}
          </span>
        </h4>

        <!-- Grid de Tarjetas Inbox -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 min-h-[50px]">
          <div v-for="asignation in unassignedWeekAsignations" :key="asignation.id" draggable="true"
            @dragstart="onDragStart(asignation, $event)"
            class="bg-white dark:bg-rv-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-white/10 group flex flex-col cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 overflow-hidden">

            <!-- Main Content -->
            <div class="flex items-start gap-2.5 px-3 pt-3">
              <!-- Cover -->
              <div class="flex-shrink-0">
                <div class="w-11 h-11 rounded-lg bg-gray-100 dark:bg-rv-darkBg flex items-center justify-center text-gray-400 font-bold overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm">
                  <img v-if="asignation.disc.image" :src="asignation.disc.image" class="w-full h-full object-cover" />
                  <span v-else class="text-sm">{{ asignation.disc.artist.name.charAt(0) }}</span>
                </div>
              </div>

              <div class="min-w-0 flex-1">
                <!-- Title & Quick Move buttons -->
                <div class="flex justify-between items-start gap-1 mb-0.5">
                  <h5 class="font-bold text-gray-900 dark:text-white text-xs leading-tight truncate flex-1"
                    :title="asignation.disc.name">
                    {{ asignation.disc.name }}
                  </h5>
                  <div class="flex items-center gap-0.5 flex-shrink-0">
                    <button v-for="pos in availablePositions" :key="pos" @click.stop="moveTo(asignation, pos)"
                      class="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold border transition-colors bg-gray-50 dark:bg-rv-darkSurface text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      :title="'Mover a Radar ' + pos">
                      {{ pos }}
                    </button>
                  </div>
                </div>

                <!-- Artist & meta -->
                <div class="flex items-center gap-1.5 min-w-0">
                  <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate" :title="asignation.disc.artist.name">
                    {{ asignation.disc.artist.name }}
                  </p>
                  <span v-if="asignation.disc.genre"
                    class="px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white shadow-sm truncate max-w-[70px] flex-shrink-0"
                    :style="{ backgroundColor: asignation.disc.genre.color || '#9ca3af' }">
                    {{ asignation.disc.genre.name }}
                  </span>
                  <div v-if="getDiscCountry(asignation.disc)?.isoCode" class="flex-shrink-0">
                    <template v-if="getDiscCountry(asignation.disc).isoCode === 'int'">
                      <img src="/int.svg" alt="Internacional" class="h-3.5 w-3.5 rounded-full object-cover" />
                    </template>
                    <template v-else-if="getDiscCountry(asignation.disc).isoCode.length >= 2">
                      <CircleFlags :country="getDiscCountry(asignation.disc).isoCode.slice(0, 2).toLowerCase()" :show-flag-name="false" class="h-3.5 w-3.5" />
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer: Actions + User + Checkbox -->
            <div class="mt-2 mx-3 mb-3 pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-2">
              <!-- Action buttons -->
              <div class="flex items-center gap-1">
                <div class="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 dark:bg-rv-darkBg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer" title="Spotify">
                  <SpotifyArtistButton :artistName="asignation.disc.artist.name" class="!text-[9px] !bg-transparent !text-inherit !p-0 !w-full !h-full flex items-center justify-center !shadow-none" />
                </div>
                <button @click="copyArtistAndDisc(asignation.disc.artist.name, asignation.disc.name)"
                  class="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 dark:bg-rv-darkBg text-rv-purple hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors" title="Copiar info">
                  <i class="fa-solid fa-clipboard text-[9px]"></i>
                </button>
                <button @click="copyToClipboard(asignation.disc.image)"
                  class="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 dark:bg-rv-darkBg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Copiar imagen">
                  <i class="fa-solid fa-image text-[9px]"></i>
                </button>
                <button @click="remove(asignation.id)"
                  class="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 dark:bg-rv-darkBg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">
                  <i class="fa-solid fa-trash text-[9px]"></i>
                </button>
              </div>

              <!-- User + Done -->
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <div v-if="editingUserAsignationId !== asignation.id" @click="startEditingUser(asignation)"
                  class="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-rv-darkBg px-1 py-0.5 rounded transition-colors group/user">
                  <div class="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-indigo-700 dark:text-indigo-300 ring-1 ring-white dark:ring-rv-darkCard overflow-hidden">
                    <img v-if="asignation.user?.image" :src="asignation.user.image" class="w-full h-full object-cover" />
                    <span v-else>{{ asignation.user?.username?.charAt(0) || '?' }}</span>
                  </div>
                  <span class="text-[10px] font-medium text-gray-400 dark:text-gray-500 group-hover/user:text-indigo-600 dark:group-hover/user:text-indigo-400 max-w-[48px] truncate">
                    {{ asignation.user?.username || '–' }}
                  </span>
                </div>
                <select v-else @change="changeUser(asignation, $event)" @blur="editingUserAsignationId = null"
                  class="text-[10px] p-0.5 border rounded border-indigo-200 dark:border-indigo-500/30 focus:ring-0 bg-white dark:bg-rv-darkSurface dark:text-gray-200 h-5 max-w-[80px]">
                  <option v-for="user in users" :key="user.id" :value="user.id" :selected="user.id === asignation.user?.id">
                    {{ user.username }}
                  </option>
                </select>

                <label class="relative flex items-center justify-center cursor-pointer flex-shrink-0" title="Marcar como hecho">
                  <input type="checkbox" :checked="asignation.done" @change="toggleDone(asignation)" class="peer sr-only" />
                  <div class="w-4 h-4 border-2 border-gray-300 dark:border-white/20 rounded peer-checked:bg-green-500 peer-checked:border-green-500 transition-colors"></div>
                  <i class="fa-solid fa-check text-[8px] text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none"></i>
                </label>
              </div>
            </div>
          </div>

          <!-- Empty State for Inbox -->
          <div v-if="unassignedWeekAsignations.length === 0" class="col-span-full py-10 flex flex-col items-center justify-center gap-1.5 text-gray-300 dark:text-gray-600 text-xs">
            <i class="fa-solid fa-inbox text-2xl opacity-40"></i>
            <p>Bandeja de entrada vacía</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Si el prop type NO es "week", renderizado simple -->
    <template v-else>
      <div class="bg-white dark:bg-rv-darkCard p-6 rounded-2xl shadow-md">
        <div class="overflow-x-auto">
          <table class="w-full table-auto border-collapse">
            <thead class="bg-gray-200 dark:bg-rv-darkSurface">
              <tr>
                <th class="px-4 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">Artista</th>
                <th class="px-4 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">Disco</th>
                <th class="px-4 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">Usuario</th>
                <th class="px-4 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="asignation in asignations" :key="asignation.id"
                class="odd:bg-white even:bg-gray-50 dark:odd:bg-rv-darkCard dark:even:bg-rv-darkSurface">
                <td class="px-4 py-2 border-t border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300">
                  {{ asignation.disc.artist.name }}
                </td>
                <td class="px-4 py-2 border-t border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300">
                  {{ asignation.disc.name }}
                </td>
                <td class="px-4 py-2 border-t border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300">
                  {{ asignation.user.username }}
                </td>
                <td class="px-4 py-2 border-t border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300">
                  <div class="flex items-center gap-2 flex-wrap">
                    <SpotifyArtistButton :artistName="asignation.disc.artist.name" />
                    <button @click="copyArtistAndDisc(asignation.disc.artist.name, asignation.disc.name)"
                      class="px-2 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600">
                      <i class="fa-solid fa-clipboard"></i>
                    </button>
                    <button @click="copyToClipboard(asignation.disc.image)"
                      class="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                      <i class="fa-solid fa-image"></i>
                    </button>
                    <input type="checkbox" :checked="asignation.done" @change="toggleDone(asignation)"
                      class="form-checkbox h-5 w-5 text-green-500" />
                    <button @click="remove(asignation.id)"
                      class="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!asignations.length">
                <td colspan="4" class="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                  No hay asignaciones.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed, nextTick } from "vue";
import { useAsignationStore } from "@stores/asignation/asignation";
import { useUserStore } from "@stores/user/users";
import SpotifyArtistButton from "@components/SpotifyArtistButton.vue";
import SwalService from "@services/swal/SwalService";
import CircleFlags from "vue-circle-flags";

export default defineComponent({
  name: "AsignationList",
  props: {
    type: { type: String, required: true },
  },
  components: { SpotifyArtistButton },
  setup(props) {
    const asignationStore = useAsignationStore();
    const userStore = useUserStore();
    const asignations = ref<any[]>([]);

    const users = computed(() => userStore.usersRv);
    const editingUserAsignationId = ref<string | null>(null);

    if (userStore.usersRv.length === 0) userStore.loadRvUsers();

    const startEditingUser = async (asignation: any) => {
      editingUserAsignationId.value = asignation.id;
      await nextTick();
    };

    const getDiscCountry = (disc: any) => {
      return disc.artist?.country || disc.artistCountry || disc.country || null;
    };

    const changeUser = async (asignation: any, event: Event) => {
      const select = event.target as HTMLSelectElement;
      const newUserId = select.value;
      if (newUserId && newUserId !== asignation.user.id) {
        try {
          await asignationStore.updateAsignationStore({ id: asignation.id, userId: newUserId });
          const newUser = userStore.usersRv.find((u: any) => u.id === newUserId);
          if (newUser) {
            const index = asignations.value.findIndex(a => a.id === asignation.id);
            if (index !== -1) asignations.value[index] = { ...asignations.value[index], user: newUser };
          }
          SwalService.success('Usuario actualizado');
        } catch (error) {
          SwalService.error("Error al cambiar usuario");
        }
      }
      editingUserAsignationId.value = null;
    };

    const draggedItem = ref<any>(null);
    const dragOverGroup = ref<number | null>(null);
    const availablePositionsCount = ref(1);

    watch(
      () => asignationStore.asignations,
      (newAsignations) => {
        asignations.value = newAsignations.map((a: any) => ({ ...a, position: a.position ?? 0 }));
        if (props.type === 'week' && asignations.value.length > 0) {
          const maxPos = Math.max(...asignations.value.map(a => a.position));
          const calculatedneeded = Math.ceil(asignations.value.length / 4);
          availablePositionsCount.value = Math.max(maxPos, calculatedneeded, 1);
        }
      },
      { immediate: true, deep: true }
    );

    const isWeek = computed(() => props.type === "week" || props.type === "radar");
    const weekAsignations = computed(() => (isWeek.value ? asignations.value : []));
    const unassignedWeekAsignations = computed(() => weekAsignations.value.filter((a) => a.position === 0));
    const groupedWeekAsignations = computed(() => {
      const groups: Record<number, any[]> = {};
      weekAsignations.value.forEach((a) => {
        if (a.position > 0) {
          if (!groups[a.position]) groups[a.position] = [];
          groups[a.position].push(a);
        }
      });
      return groups;
    });

    const availablePositions = computed(() =>
      Array.from({ length: availablePositionsCount.value }, (_, i) => i + 1)
    );

    const isGroupFull = (groupNumber: number, currentAsignation?: any) => {
      if (groupNumber === 0) return false;
      const group = groupedWeekAsignations.value[groupNumber] || [];
      if (currentAsignation && currentAsignation.position === groupNumber) return false;
      return group.length >= 4;
    };

    const onDragStart = (item: any, event: DragEvent) => {
      draggedItem.value = item;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.dropEffect = 'move';
      }
    };

    const onDragOver = (group: number) => {
      if (isGroupFull(group, draggedItem.value)) return;
      dragOverGroup.value = group;
    };

    const onDragLeave = () => { dragOverGroup.value = null; };

    const onDrop = async (group: number) => {
      dragOverGroup.value = null;
      if (!draggedItem.value) return;
      if (isGroupFull(group, draggedItem.value)) {
        SwalService.error('Este radar ya tiene 4 discos asignados.');
        return;
      }
      const item = draggedItem.value;
      if (item.position === group) { draggedItem.value = null; return; }
      await moveTo(item, group);
      draggedItem.value = null;
    };

    const remove = (id: string) => {
      asignations.value = asignations.value.filter((a) => a.id !== id);
      asignationStore.removeAsignation(id);
    };

    const toggleDone = async (asignation: any) => {
      const updated = { ...asignation, done: !asignation.done };
      try {
        await asignationStore.updateAsignationStore(updated);
        asignations.value = asignations.value.map((a) => a.id === asignation.id ? updated : a);
      } catch (error) {
        console.error("Error actualizando:", error);
      }
    };

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text).then(() => SwalService.success("Enlace a la imagen copiado"));
    };

    const copyArtistAndDisc = (artist: string, disc: string) => {
      navigator.clipboard.writeText(`**${artist}** - *${disc}*`).then(() => SwalService.success("Copiado al portapapeles"));
    };

    const updatePosition = async (asignation: any) => {
      if (!isWeek.value) return;
      try {
        await asignationStore.updateAsignationStore(asignation);
        asignations.value = asignations.value.map((a) => a.id === asignation.id ? asignation : a);
      } catch (error) {
        SwalService.error("Error al mover el disco");
      }
    };

    const moveTo = async (asignation: any, group: number) => {
      if (asignation.position === group) return;
      if (isGroupFull(group, asignation)) {
        SwalService.error(`El Radar ${group} ya está completo (4/4).`);
        return;
      }
      await updatePosition({ ...asignation, position: group });
    };

    return {
      asignations, isWeek, unassignedWeekAsignations, groupedWeekAsignations,
      availablePositions, availablePositionsCount, remove, toggleDone,
      copyToClipboard, copyArtistAndDisc, updatePosition, isGroupFull,
      onDragStart, onDragOver, onDragLeave, onDrop, dragOverGroup, draggedItem,
      users, editingUserAsignationId, startEditingUser, changeUser,
      moveTo, getDiscCountry,
    };
  },
});
</script>
