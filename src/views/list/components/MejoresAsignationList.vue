<template>
    <div class="space-y-6">
        <div v-if="asignations.length === 0"
            class="text-center py-12 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl bg-gray-50/50 dark:bg-rv-darkBg/30">
            <i class="fa-solid fa-compact-disc text-4xl mb-3 opacity-30"></i>
            <p class="text-sm font-medium">No hay discos en esta lista</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div v-for="asignation in asignations" :key="asignation.id"
                class="bg-white dark:bg-rv-darkCard rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/40 group flex flex-col h-full relative overflow-hidden">

                <!-- Barra de acento izquierda -->
                <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-violet-500"></div>

                <!-- Main Content -->
                <div class="flex items-start gap-4 mb-2 flex-grow pl-4 pr-4 pt-4">
                    <!-- Cover & Flag Column -->
                    <div class="flex flex-col items-center gap-2 flex-shrink-0">
                        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-rv-darkBg dark:to-rv-darkSurface flex items-center justify-center text-gray-400 font-bold overflow-hidden shadow-sm border border-gray-200 dark:border-white/10">
                            <img v-if="asignation.disc.image" :src="asignation.disc.image" class="w-full h-full object-cover" />
                            <span v-else>{{ asignation.disc.artist.name.charAt(0) }}</span>
                        </div>

                        <div v-if="(asignation.disc.artist?.country?.isoCode?.length >= 2)"
                            class="w-5 h-5 flex-shrink-0" :title="asignation.disc.artist.country.name">
                            <CircleFlags :country="asignation.disc.artist.country.isoCode.slice(0, 2).toLowerCase()"
                                :show-flag-name="false" />
                        </div>
                    </div>

                    <div class="min-w-0 flex-1">
                        <h5 class="font-bold text-gray-900 dark:text-white text-base leading-tight truncate mb-1 text-left"
                            :title="asignation.disc.name">
                            {{ asignation.disc.name }}
                        </h5>

                        <div class="flex items-center gap-2 mb-2 min-w-0">
                            <p class="text-xs text-gray-500 dark:text-gray-400 font-medium truncate" :title="asignation.disc.artist.name">
                                {{ asignation.disc.artist.name }}
                            </p>
                            <span v-if="asignation.disc.genre"
                                class="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm truncate max-w-[100px] flex-shrink-0"
                                :style="{ backgroundColor: asignation.disc.genre.color || '#9ca3af' }">
                                {{ asignation.disc.genre.name }}
                            </span>
                        </div>

                        <!-- Actions Row -->
                        <div class="flex items-center gap-1.5">
                            <div class="w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-rv-darkBg text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer border border-gray-200 dark:border-white/10"
                                title="Spotify">
                                <SpotifyArtistButton :artistName="asignation.disc.artist.name"
                                    class="!text-xs !bg-transparent !text-inherit !p-0 !w-full !h-full flex items-center justify-center !shadow-none" />
                            </div>
                            <button @click="copyArtistAndDisc(asignation.disc.artist.name, asignation.disc.name)"
                                class="w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-rv-darkBg text-rv-purple dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors border border-gray-200 dark:border-white/10"
                                title="Copiar Info">
                                <i class="fa-solid fa-clipboard text-xs"></i>
                            </button>
                            <button @click="copyToClipboard(asignation.disc.image)"
                                class="w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-rv-darkBg text-blue-500 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-gray-200 dark:border-white/10"
                                title="Copiar Imagen">
                                <i class="fa-solid fa-image text-xs"></i>
                            </button>
                            <button @click="remove(asignation.id)"
                                class="w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-rv-darkBg text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-gray-200 dark:border-white/10"
                                title="Eliminar">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Footer: User & Check -->
                <div class="mt-auto mx-4 mb-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center gap-3">

                    <!-- Checkbox -->
                    <label class="relative flex items-center justify-center cursor-pointer group/check w-8 flex-shrink-0">
                        <input type="checkbox" :checked="asignation.done" @change="toggleDone(asignation)" class="peer sr-only" />
                        <div class="w-6 h-6 border-2 border-gray-300 dark:border-white/20 rounded-lg peer-checked:bg-green-500 peer-checked:border-green-500 transition-colors shadow-sm"></div>
                        <i class="fa-solid fa-check text-[10px] text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></i>
                    </label>

                    <!-- User Selector -->
                    <div class="flex items-center w-full min-w-0">
                        <div v-if="editingUserAsignationId !== asignation.id" @click="startEditingUser(asignation)"
                            class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-rv-darkSurface p-1.5 -ml-1.5 rounded-lg transition-colors group/user w-full min-w-0"
                            title="Asignar usuario">
                            <div class="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300 ring-2 ring-white dark:ring-rv-darkCard overflow-hidden shadow-sm">
                                <img v-if="asignation.user?.image" :src="asignation.user.image" class="w-full h-full object-cover" />
                                <span v-else>{{ asignation.user?.username?.charAt(0) || '?' }}</span>
                            </div>
                            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 truncate group-hover/user:text-indigo-600 dark:group-hover/user:text-indigo-400">
                                {{ asignation.user?.username || 'Sin asignar' }}
                            </span>
                        </div>
                        <select v-else @change="changeUser(asignation, $event)" @blur="editingUserAsignationId = null"
                            class="text-xs p-1.5 border rounded-lg border-indigo-300 dark:border-indigo-500/30 focus:ring-0 w-full bg-white dark:bg-rv-darkSurface dark:text-gray-200">
                            <option v-for="user in users" :key="user.id" :value="user.id"
                                :selected="user.id === asignation.user?.id">
                                {{ user.username }}
                            </option>
                        </select>
                    </div>

                </div>
            </div>
        </div>
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
    name: "MejoresAsignationList",
    components: { SpotifyArtistButton },
    setup() {
        const asignationStore = useAsignationStore();
        const userStore = useUserStore();
        const asignations = ref<any[]>([]);

        const users = computed(() => userStore.usersRv);
        const editingUserAsignationId = ref<string | null>(null);

        if (userStore.usersRv.length === 0) userStore.loadRvUsers();

        watch(
            () => asignationStore.asignations,
            (newAsignations) => {
                asignations.value = [...newAsignations].sort((a, b) => {
                    const userA = a.user?.username || 'zzz';
                    const userB = b.user?.username || 'zzz';
                    return userA.localeCompare(userB);
                });
            },
            { immediate: true, deep: true }
        );

        const startEditingUser = async (asignation: any) => {
            editingUserAsignationId.value = asignation.id;
            await nextTick();
        };

        const changeUser = async (asignation: any, event: Event) => {
            const select = event.target as HTMLSelectElement;
            const newUserId = select.value;
            if (newUserId && newUserId !== asignation.user?.id) {
                try {
                    await asignationStore.updateAsignationStore({ id: asignation.id, userId: newUserId });
                    const newUser = userStore.usersRv.find((u: any) => u.id === newUserId);
                    if (newUser) {
                        const index = asignations.value.findIndex(a => a.id === asignation.id);
                        if (index !== -1) asignations.value[index] = { ...asignations.value[index], user: newUser };
                    }
                    SwalService.success('Usuario actualizado');
                } catch (error) {
                    SwalService.error('Error al cambiar el usuario');
                }
            }
            editingUserAsignationId.value = null;
        };

        const remove = (id: string) => {
            asignations.value = asignations.value.filter(a => a.id !== id);
            asignationStore.removeAsignation(id);
        };

        const toggleDone = async (asignation: any) => {
            const updated = { ...asignation, done: !asignation.done };
            try {
                await asignationStore.updateAsignationStore(updated);
                const idx = asignations.value.findIndex(a => a.id === asignation.id);
                if (idx !== -1) asignations.value[idx] = updated;
            } catch (e) {
                console.error(e);
            }
        };

        const copyArtistAndDisc = (artist: string, disc: string) => {
            navigator.clipboard.writeText(`**${artist}** - *${disc}*`).then(() => SwalService.success("Info copiada"));
        };

        const copyToClipboard = (text: string) => {
            navigator.clipboard.writeText(text).then(() => SwalService.success("Enlace imagen copiado"));
        };

        return {
            asignations, users, editingUserAsignationId,
            startEditingUser, changeUser, remove, toggleDone,
            copyArtistAndDisc, copyToClipboard
        };
    }
});
</script>
