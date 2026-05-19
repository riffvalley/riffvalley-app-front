<template>
  <div class="view-container bg-white dark:bg-transparent p-4 md:p-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          <i class="fa-solid fa-user-gear mr-2"></i>Gestión de Usuarios
        </h2>
        <!-- Stats -->
        <div class="flex items-center gap-5 mt-2 text-sm">
          <span class="text-gray-500 dark:text-gray-400">
            <span class="font-semibold text-gray-800 dark:text-white">{{ stats.total }}</span> total
          </span>
          <span class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <span class="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
            <span class="font-semibold text-green-600 dark:text-green-400">{{ stats.active }}</span> activos
          </span>
          <span class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <span class="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block"></span>
            <span class="font-semibold text-orange-500 dark:text-orange-400">{{ stats.banned }}</span> baneados
          </span>
        </div>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rv-pink to-rv-purple text-white font-medium rounded-full shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Crear Usuario
      </button>
    </div>

    <!-- Search bar -->
    <div class="relative mb-4">
      <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar por usuario o email..."
        class="w-full pl-11 pr-32 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-rv-darkSurface text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-rv-pink focus:ring-2 focus:ring-rv-pink/25 transition-all"
      />
      <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 tabular-nums whitespace-nowrap">
        {{ filteredUsers.length }}<span v-if="isFiltered"> / {{ users.length }}</span> usuarios
      </span>
    </div>

    <!-- Filter + sort bar -->
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <button @click="clearFilters" :class="!isFiltered ? 'filter-chip-active' : 'filter-chip'">
        Todos
      </button>
      <button
        v-for="role in availableRoles"
        :key="role.value"
        @click="toggleRoleFilter(role.value)"
        :class="roleFilter.includes(role.value) ? 'filter-chip-active' : 'filter-chip'"
      >
        {{ role.label }}
      </button>
      <button
        @click="toggleBannedFilter"
        :class="filterBanned ? 'filter-chip-orange' : 'filter-chip'"
      >
        <i class="fa-solid fa-user-slash mr-1 text-xs"></i>Baneados
      </button>

      <!-- Sort -->
      <div class="ml-auto flex items-center gap-1.5">
        <span class="text-xs text-gray-400 hidden sm:block mr-1">Ordenar:</span>
        <button
          v-for="s in sortOptions"
          :key="s.value"
          @click="setSort(s.value)"
          :class="sortBy === s.value ? 'sort-btn-active' : 'sort-btn'"
        >
          {{ s.label }}
          <i
            v-if="sortBy === s.value"
            class="fa-solid ml-1 text-[10px]"
            :class="sortDir === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'"
          ></i>
        </button>
      </div>
    </div>

    <!-- Lista de usuarios -->
    <div class="space-y-3">
      <div
        v-for="user in filteredUsers"
        :key="user.id"
        class="user-card bg-white border border-gray-200 dark:bg-rv-darkCard dark:border-white/10"
      >
        <div class="flex flex-col lg:flex-row lg:items-center gap-4">
          <!-- Info principal -->
          <div class="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <!-- Username -->
            <div>
              <label class="block text-xs text-rv-pink mb-1.5 font-medium">Usuario</label>
              <input
                v-model="user.username"
                @blur="updateField(user, 'username')"
                @keyup.enter="($event.target as HTMLInputElement).blur()"
                class="user-input"
                placeholder="Username"
              />
            </div>

            <!-- Email -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs text-rv-pink font-medium">Email</label>
                <button
                  @click="copyEmail(user.id, user.email)"
                  class="text-xs flex items-center gap-1 transition-colors"
                  :class="copiedUserId === user.id ? 'text-green-400' : 'text-gray-400 hover:text-rv-pink'"
                  :title="copiedUserId === user.id ? '¡Copiado!' : 'Copiar email'"
                >
                  <i class="fa-solid" :class="copiedUserId === user.id ? 'fa-check' : 'fa-copy'"></i>
                  <span v-if="copiedUserId === user.id">Copiado</span>
                </button>
              </div>
              <input
                v-model="user.email"
                @blur="updateField(user, 'email')"
                @keyup.enter="($event.target as HTMLInputElement).blur()"
                class="user-input"
                placeholder="Email"
              />
            </div>

            <!-- Roles -->
            <div>
              <label class="block text-xs text-rv-pink mb-1.5 font-medium">Roles</label>
              <div class="flex flex-wrap gap-2 pt-1">
                <label
                  v-for="role in availableRoles"
                  :key="role.value"
                  class="inline-flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    :checked="user.roles?.includes(role.value)"
                    @change="toggleRole(user, role.value)"
                    class="w-4 h-4 rounded border-gray-600 bg-transparent text-rv-pink focus:ring-rv-pink focus:ring-offset-0"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">{{ role.label }}</span>
                </label>
              </div>
            </div>

            <!-- Fecha -->
            <div>
              <label class="block text-xs text-rv-pink mb-1.5 font-medium">Creado</label>
              <input
                type="date"
                :value="formatDateForInput(user.createdAt)"
                @change="updateCreatedAt(user, $event)"
                class="user-input date-input"
              />
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex items-center gap-2 lg:ml-4 pt-3 lg:pt-0 border-t border-gray-200 dark:border-white/10 lg:border-0">
            <span
              v-if="!user.isActive"
              class="text-xs font-bold px-2 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 whitespace-nowrap"
            >
              Baneado
            </span>

            <button @click="openNotesModal(user)" class="action-btn action-btn-blue" title="Notas">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <button @click="openPasswordModal(user)" class="action-btn action-btn-pink" title="Cambiar contraseña">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </button>

            <button
              @click="confirmBanUser(user)"
              class="action-btn"
              :class="user.isActive ? 'action-btn-orange' : 'action-btn-green'"
              :title="user.isActive ? 'Banear' : 'Reactivar'"
            >
              <i :class="user.isActive ? 'fa-solid fa-user-slash' : 'fa-solid fa-user-check'" class="text-sm"></i>
            </button>

            <button @click="confirmDeleteUser(user)" class="action-btn action-btn-red" title="Eliminar permanentemente">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredUsers.length === 0" class="text-center py-16 text-gray-500 dark:text-gray-400">
        <i class="fa-solid fa-user-slash text-3xl mb-3 block opacity-40"></i>
        <p>{{ emptyMessage }}</p>
        <button v-if="isFiltered" @click="clearFilters(); searchQuery = ''" class="mt-3 text-sm text-rv-pink hover:underline">
          Limpiar filtros
        </button>
      </div>
    </div>

    <!-- Modal Crear Usuario -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
        <div class="modal-content modal-lg">
          <button @click="closeCreateModal" class="modal-close">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-6">Crear Nuevo Usuario</h3>
          <form @submit.prevent="createUser" class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-rv-pink mb-1.5 font-medium">Email</label>
                <input v-model="newUser.email" type="email" placeholder="email@ejemplo.com" class="modal-input" required />
              </div>
              <div>
                <label class="block text-sm text-rv-pink mb-1.5 font-medium">Username</label>
                <input v-model="newUser.username" type="text" placeholder="nombreusuario" class="modal-input" required />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-rv-pink mb-1.5 font-medium">Contraseña</label>
                <div class="relative">
                  <input
                    v-model="newUser.password"
                    :type="showCreatePassword ? 'text' : 'password'"
                    placeholder="Mínimo 6 caracteres"
                    class="modal-input pr-10"
                    required
                  />
                  <button type="button" @click="showCreatePassword = !showCreatePassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none">
                    <i :class="showCreatePassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" class="text-sm"></i>
                  </button>
                </div>
                <p v-if="passwordValidation(newUser.password)" class="mt-1.5 text-sm text-red-400">
                  {{ passwordValidation(newUser.password) }}
                </p>
              </div>
              <div>
                <label class="block text-sm text-rv-pink mb-2 font-medium">Roles</label>
                <div class="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                  <label v-for="role in availableRoles" :key="role.value" class="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" v-model="newUser.roles" :value="role.value"
                      class="w-4 h-4 rounded border-gray-600 bg-transparent text-rv-pink focus:ring-rv-pink focus:ring-offset-0" />
                    <span class="text-sm text-gray-700 dark:text-gray-300">{{ role.label }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
              <button type="button" @click="closeCreateModal" class="modal-btn-cancel">Cancelar</button>
              <button type="submit" :disabled="!!passwordValidation(newUser.password)" class="modal-btn-primary">
                Crear Usuario
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal Cambiar Contraseña -->
    <Teleport to="body">
      <div v-if="showPasswordModal" class="modal-overlay" @click.self="closePasswordModal">
        <div class="modal-content modal-sm">
          <button @click="closePasswordModal" class="modal-close">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1">Cambiar Contraseña</h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6">
            Usuario: <span class="text-rv-pink font-medium">{{ selectedUser?.username }}</span>
          </p>

          <form @submit.prevent="updatePassword">
            <div>
              <label class="block text-sm text-rv-pink mb-1.5 font-medium">Nueva contraseña</label>
              <div class="relative">
                <input
                  v-model="newPassword"
                  :type="showChangePassword ? 'text' : 'password'"
                  placeholder="Mínimo 6 caracteres"
                  class="modal-input pr-10"
                  required
                />
                <button type="button" @click="showChangePassword = !showChangePassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none">
                  <i :class="showChangePassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" class="text-sm"></i>
                </button>
              </div>
              <p v-if="passwordValidation(newPassword)" class="mt-1.5 text-sm text-red-400">
                {{ passwordValidation(newPassword) }}
              </p>
            </div>

            <div class="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-white/10">
              <button type="button" @click="closePasswordModal" class="modal-btn-cancel">Cancelar</button>
              <button type="submit" :disabled="!!passwordValidation(newPassword)" class="modal-btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal Notas -->
    <Teleport to="body">
      <div v-if="showNotesModal" class="modal-overlay" @click.self="closeNotesModal">
        <div class="modal-content modal-md">
          <button @click="closeNotesModal" class="modal-close">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1">Notas</h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6">
            Usuario: <span class="text-rv-pink font-medium">{{ selectedUser?.username }}</span>
          </p>

          <textarea
            v-model="userNotes"
            rows="6"
            class="modal-input resize-none"
            placeholder="Escribe notas sobre este usuario..."
          ></textarea>

          <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-200 dark:border-white/10">
            <button type="button" @click="closeNotesModal" class="modal-btn-cancel">Cancelar</button>
            <button @click="saveNotes" class="modal-btn-primary">Guardar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { useUserStore } from "@stores/user/users";
import SwalService from "@services/swal/SwalService";
import { deactivateUserService, activateUserService } from "@services/users/users";

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  createdAt: string;
  notes: string | null;
  isActive: boolean;
}

type SortField = 'username' | 'email' | 'createdAt';
type SortDir = 'asc' | 'desc';

export default defineComponent({
  name: "ManageUsers",
  setup() {
    const userStore = useUserStore();
    const users = ref<User[]>([]);

    // Search
    const searchQuery = ref("");

    // Filters
    const roleFilter = ref<string[]>([]);
    const filterBanned = ref(false);

    // Sort
    const sortBy = ref<SortField>('username');
    const sortDir = ref<SortDir>('asc');

    // Copy feedback
    const copiedUserId = ref<string | null>(null);

    const availableRoles = [
      { value: "babyUser", label: "Baby" },
      { value: "user", label: "User" },
      { value: "riffValley", label: "RV" },
      { value: "superUser", label: "Super" },
    ];

    const sortOptions: { value: SortField; label: string }[] = [
      { value: 'username', label: 'Usuario' },
      { value: 'email', label: 'Email' },
      { value: 'createdAt', label: 'Fecha' },
    ];

    // Stats
    const stats = computed(() => ({
      total: users.value.length,
      active: users.value.filter(u => u.isActive).length,
      banned: users.value.filter(u => !u.isActive).length,
    }));

    const isFiltered = computed(() =>
      !!searchQuery.value.trim() || roleFilter.value.length > 0 || filterBanned.value
    );

    const filteredUsers = computed(() => {
      let list = [...users.value];

      const q = searchQuery.value.trim().toLowerCase();
      if (q) {
        list = list.filter(u =>
          u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        );
      }

      if (roleFilter.value.length > 0) {
        list = list.filter(u => roleFilter.value.some(r => u.roles?.includes(r)));
      }

      if (filterBanned.value) {
        list = list.filter(u => !u.isActive);
      }

      list.sort((a, b) => {
        let va: any = a[sortBy.value] ?? '';
        let vb: any = b[sortBy.value] ?? '';
        if (sortBy.value === 'createdAt') {
          va = new Date(va).getTime() || 0;
          vb = new Date(vb).getTime() || 0;
        } else {
          va = String(va).toLowerCase();
          vb = String(vb).toLowerCase();
        }
        if (va < vb) return sortDir.value === 'asc' ? -1 : 1;
        if (va > vb) return sortDir.value === 'asc' ? 1 : -1;
        return 0;
      });

      return list;
    });

    const emptyMessage = computed(() => {
      if (searchQuery.value.trim()) return 'No se encontraron usuarios con esa búsqueda';
      if (filterBanned.value) return 'No hay usuarios baneados';
      if (roleFilter.value.length > 0) return 'No hay usuarios con ese rol';
      return 'No hay usuarios registrados';
    });

    const toggleRoleFilter = (role: string) => {
      filterBanned.value = false;
      if (roleFilter.value.includes(role)) {
        roleFilter.value = roleFilter.value.filter(r => r !== role);
      } else {
        roleFilter.value = [...roleFilter.value, role];
      }
    };

    const toggleBannedFilter = () => {
      filterBanned.value = !filterBanned.value;
      roleFilter.value = [];
    };

    const clearFilters = () => {
      roleFilter.value = [];
      filterBanned.value = false;
    };

    const setSort = (field: SortField) => {
      if (sortBy.value === field) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortBy.value = field;
        sortDir.value = 'asc';
      }
    };

    const copyEmail = async (userId: string, email: string) => {
      try {
        await navigator.clipboard.writeText(email);
        copiedUserId.value = userId;
        setTimeout(() => { copiedUserId.value = null; }, 2000);
      } catch {
        SwalService.error('No se pudo copiar el email');
      }
    };

    // ——— Resto del setup igual ———

    const selectedUser = ref<User | null>(null);
    const newPassword = ref("");
    const userNotes = ref("");
    const showCreateModal = ref(false);
    const showPasswordModal = ref(false);
    const showNotesModal = ref(false);
    const showCreatePassword = ref(false);
    const showChangePassword = ref(false);

    const newUser = ref({ email: "", username: "", password: "", roles: [] as string[] });

    const originalValues = ref<Map<string, Partial<User>>>(new Map());

    onMounted(async () => {
      try {
        await userStore.loadUsers();
        users.value = userStore.users.map((user: User) => ({ ...user }));
        users.value.forEach((user) => {
          originalValues.value.set(user.id, {
            username: user.username,
            email: user.email,
            roles: [...(user.roles || [])],
          });
        });
      } catch (error) {
        console.error("Error loading users:", error);
        SwalService.error("Error al cargar usuarios");
      }
    });

    const formatDateForInput = (dateString: string) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    };

    const updateCreatedAt = async (user: User, event: Event) => {
      const input = event.target as HTMLInputElement;
      const newDate = input.value ? new Date(input.value) : null;
      if (!newDate) return;
      try {
        await userStore.updateUserSuperAdminStore(user.id, { createdAt: newDate });
        user.createdAt = newDate.toISOString();
        SwalService.success("Fecha actualizada");
      } catch (error) {
        console.error("Error updating createdAt:", error);
        SwalService.error("Error al actualizar fecha");
      }
    };

    const passwordValidation = (password: string) => {
      if (!password) return "";
      if (password.length < 6) return "Mínimo 6 caracteres";
      if (!/[A-Z]/.test(password)) return "Incluir mayúscula";
      if (!/[a-z]/.test(password)) return "Incluir minúscula";
      if (!/[0-9]/.test(password)) return "Incluir número";
      return "";
    };

    const updateField = async (user: User, field: string) => {
      const original = originalValues.value.get(user.id);
      if (!original || (user as any)[field] === (original as any)[field]) return;
      try {
        await userStore.updateUserSuperAdminStore(user.id, { [field]: (user as any)[field] });
        originalValues.value.set(user.id, { ...original, [field]: (user as any)[field] });
        SwalService.success(`${field} actualizado`);
      } catch (error) {
        console.error(`Error updating ${field}:`, error);
        (user as any)[field] = (original as any)[field];
        SwalService.error(`Error al actualizar ${field}`);
      }
    };

    const toggleRole = async (user: User, role: string) => {
      const hadRole = user.roles?.includes(role);
      const newRoles = hadRole
        ? user.roles.filter((r) => r !== role)
        : [...(user.roles || []), role];
      try {
        await userStore.updateUserSuperAdminStore(user.id, { roles: newRoles });
        user.roles = newRoles;
        const original = originalValues.value.get(user.id);
        if (original) originalValues.value.set(user.id, { ...original, roles: [...newRoles] });
        SwalService.success("Roles actualizados");
      } catch (error) {
        console.error("Error updating roles:", error);
        SwalService.error("Error al actualizar roles");
      }
    };

    const openCreateModal = () => {
      newUser.value = { email: "", username: "", password: "", roles: [] };
      showCreateModal.value = true;
    };

    const closeCreateModal = () => {
      showCreateModal.value = false;
      showCreatePassword.value = false;
    };

    const createUser = async () => {
      if (passwordValidation(newUser.value.password)) return;
      try {
        await userStore.createUser({
          email: newUser.value.email,
          username: newUser.value.username,
          roles: newUser.value.roles,
          password: newUser.value.password,
        });
        await userStore.loadUsers();
        users.value = userStore.users.map((user: User) => ({ ...user }));
        users.value.forEach((user) => {
          if (!originalValues.value.has(user.id)) {
            originalValues.value.set(user.id, {
              username: user.username,
              email: user.email,
              roles: [...(user.roles || [])],
            });
          }
        });
        closeCreateModal();
        SwalService.success("Usuario creado correctamente");
      } catch (error) {
        console.error("Error creating user:", error);
        SwalService.error("Error al crear usuario");
      }
    };

    const openPasswordModal = (user: User) => {
      selectedUser.value = user;
      newPassword.value = "";
      showPasswordModal.value = true;
    };

    const closePasswordModal = () => {
      showPasswordModal.value = false;
      selectedUser.value = null;
      newPassword.value = "";
      showChangePassword.value = false;
    };

    const updatePassword = async () => {
      if (!selectedUser.value || passwordValidation(newPassword.value)) return;
      try {
        await userStore.updateUserSuperAdminStore(selectedUser.value.id, { password: newPassword.value });
        closePasswordModal();
        SwalService.success("Contraseña actualizada");
      } catch (error) {
        console.error("Error updating password:", error);
        SwalService.error("Error al actualizar contraseña");
      }
    };

    const openNotesModal = (user: User) => {
      selectedUser.value = user;
      userNotes.value = user.notes || "";
      showNotesModal.value = true;
    };

    const closeNotesModal = () => {
      showNotesModal.value = false;
      selectedUser.value = null;
      userNotes.value = "";
    };

    const saveNotes = async () => {
      if (!selectedUser.value) return;
      try {
        await userStore.updateUserSuperAdminStore(selectedUser.value.id, { notes: userNotes.value || null });
        selectedUser.value.notes = userNotes.value || null;
        closeNotesModal();
        SwalService.success("Notas guardadas");
      } catch (error) {
        console.error("Error saving notes:", error);
        SwalService.error("Error al guardar notas");
      }
    };

    const confirmBanUser = async (user: User) => {
      const action = user.isActive ? 'banear' : 'reactivar';
      const title = user.isActive ? '¿Banear usuario?' : '¿Reactivar usuario?';
      const text = user.isActive
        ? `${user.username} no podrá iniciar sesión. Puedes reactivarlo en cualquier momento.`
        : `${user.username} podrá volver a iniciar sesión.`;
      const result = await SwalService.confirm(title, text, 'Confirmar', 'Cancelar');
      if (!result.isConfirmed) return;
      try {
        if (user.isActive) {
          await deactivateUserService(user.id);
          user.isActive = false;
          SwalService.success(`${user.username} baneado correctamente`);
        } else {
          await activateUserService(user.id);
          user.isActive = true;
          SwalService.success(`${user.username} reactivado correctamente`);
        }
      } catch (error) {
        console.error(`Error al ${action} usuario:`, error);
        SwalService.error(`Error al ${action} usuario`);
      }
    };

    const confirmDeleteUser = (user: User) => {
      SwalService.confirm(
        "¿Eliminar usuario permanentemente?",
        `Se borrarán todos los datos de ${user.username} y no se podrá recuperar.`,
        'Sí, eliminar', 'Cancelar'
      ).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await userStore.removeUser(user.id);
            users.value = users.value.filter((u) => u.id !== user.id);
            originalValues.value.delete(user.id);
            SwalService.success("Usuario eliminado");
          } catch (error) {
            console.error("Error deleting user:", error);
            SwalService.error("Error al eliminar usuario");
          }
        }
      });
    };

    return {
      users,
      searchQuery,
      filteredUsers,
      isFiltered,
      emptyMessage,
      stats,
      roleFilter,
      filterBanned,
      sortBy,
      sortDir,
      sortOptions,
      availableRoles,
      copiedUserId,
      toggleRoleFilter,
      toggleBannedFilter,
      clearFilters,
      setSort,
      copyEmail,
      newUser,
      selectedUser,
      newPassword,
      userNotes,
      showCreateModal,
      showPasswordModal,
      showNotesModal,
      showCreatePassword,
      showChangePassword,
      formatDateForInput,
      updateCreatedAt,
      passwordValidation,
      updateField,
      toggleRole,
      openCreateModal,
      closeCreateModal,
      createUser,
      openPasswordModal,
      closePasswordModal,
      updatePassword,
      openNotesModal,
      closeNotesModal,
      saveNotes,
      confirmBanUser,
      confirmDeleteUser,
    };
  },
});
</script>

<style scoped>
.view-container {
  min-height: 100vh;
}

.user-card {
  border-radius: 12px;
  padding: 1.25rem;
}

/* Filter chips */
.filter-chip {
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  background: transparent;
  transition: all 0.15s;
}

.filter-chip:hover {
  border-color: #e46e8a;
  color: #e46e8a;
}

:global(.dark) .filter-chip {
  border-color: rgba(255, 255, 255, 0.12);
  color: #9ca3af;
}

:global(.dark) .filter-chip:hover {
  border-color: #e46e8a;
  color: #e46e8a;
}

.filter-chip-active {
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid transparent;
  background: linear-gradient(to right, #e46e8a, #b0669f);
  color: #fff;
  transition: all 0.15s;
}

.filter-chip-active:hover {
  opacity: 0.85;
}

.filter-chip-orange {
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid transparent;
  background: rgba(249, 115, 22, 0.15);
  color: #fb923c;
  border-color: rgba(249, 115, 22, 0.3);
  transition: all 0.15s;
}

.filter-chip-orange:hover {
  background: rgba(249, 115, 22, 0.25);
}

/* Sort buttons */
.sort-btn {
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #9ca3af;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.sort-btn:hover {
  color: #e46e8a;
}

.sort-btn-active {
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #e46e8a;
  border: 1px solid rgba(228, 110, 138, 0.3);
  background: rgba(228, 110, 138, 0.08);
  transition: all 0.15s;
}

/* User inputs */
.user-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #111827;
  transition: border-color 0.2s;
}

.user-input:focus {
  outline: none;
  border-color: #e46e8a;
}

.user-input::placeholder {
  color: #9ca3af;
}

:global(.dark) .user-input {
  background: #2a2b3d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

:global(.dark) .user-input::placeholder {
  color: #6b7280;
}

.date-input { color-scheme: light; }
:global(.dark) .date-input { color-scheme: dark; }

/* Action buttons */
.action-btn {
  flex: 1;
  padding: 0.625rem;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 1024px) {
  .action-btn { flex: none; }
}

.action-btn-blue   { background: rgba(0, 100, 214, 0.15); color: #0064d6; }
.action-btn-blue:hover   { background: rgba(0, 100, 214, 0.3); }
.action-btn-pink   { background: rgba(228, 110, 138, 0.15); color: #e46e8a; }
.action-btn-pink:hover   { background: rgba(228, 110, 138, 0.3); }
.action-btn-red    { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.action-btn-red:hover    { background: rgba(239, 68, 68, 0.3); }
.action-btn-orange { background: rgba(249, 115, 22, 0.15); color: #fb923c; }
.action-btn-orange:hover { background: rgba(249, 115, 22, 0.3); }
.action-btn-green  { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.action-btn-green:hover  { background: rgba(34, 197, 94, 0.3); }

/* Modal styles */
.modal-overlay {
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

.modal-content {
  position: relative;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

:global(.dark) .modal-content {
  background: #404157;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-sm { max-width: 28rem; }
.modal-md { max-width: 36rem; }
.modal-lg { max-width: 48rem; }

.modal-close {
  position: absolute;
  right: 1rem;
  top: 1rem;
  color: #e46e8a;
  transition: opacity 0.2s;
}

.modal-close:hover { opacity: 0.7; }

.modal-input {
  width: 100%;
  padding: 0.625rem 1rem;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #111827;
  transition: border-color 0.2s;
}

.modal-input:focus {
  outline: none;
  border-color: #e46e8a;
}

.modal-input::placeholder { color: #9ca3af; }

:global(.dark) .modal-input {
  background: #2a2b3d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

:global(.dark) .modal-input::placeholder { color: #6b7280; }

.modal-btn-cancel {
  padding: 0.5rem 1rem;
  color: #374151;
  transition: opacity 0.2s;
}

.modal-btn-cancel:hover { opacity: 0.7; }
:global(.dark) .modal-btn-cancel { color: #e46e8a; }

.modal-btn-primary {
  padding: 0.5rem 1.25rem;
  background: linear-gradient(to right, #e46e8a, #b0669f);
  color: #fff;
  font-weight: 500;
  border-radius: 8px;
  transition: opacity 0.2s;
}

.modal-btn-primary:hover { opacity: 0.85; }
.modal-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
