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
        @click="openCreateModal($event)"
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
        v-for="role in roleOptions"
        :key="role.value"
        @click="toggleRoleFilter(role.value)"
        :class="roleFilter === role.value ? 'filter-chip-active' : 'filter-chip'"
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
    <div v-if="isUsersLoading" class="py-16 text-center text-gray-500 dark:text-gray-400" role="status">
      Cargando usuarios…
    </div>
    <div v-else-if="isUsersError" class="py-16 text-center text-gray-500 dark:text-gray-400" role="alert">
      <p>Error al cargar usuarios</p>
      <button class="mt-3 text-sm text-rv-pink hover:underline" @click="retryUsers">Reintentar</button>
    </div>
    <div v-else class="space-y-3">
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
              <label class="block text-xs text-rv-pink mb-1.5 font-medium">Rol</label>
              <select
                :value="user.role"
                @change="updateRole(user, $event)"
                class="user-input"
                aria-label="Rol del usuario"
              >
                <option v-if="!isUserRole(user.role)" :value="user.role ?? ''" disabled>Rol no reconocido</option>
                <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                  {{ role.label }}
                </option>
              </select>
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

            <button @click="openNotesModal(user, $event)" class="action-btn action-btn-blue" title="Notas" :aria-label="`Editar notas de ${user.username}`">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <button @click="openPasswordModal(user, $event)" class="action-btn action-btn-pink" title="Cambiar contraseña" :aria-label="`Cambiar contraseña de ${user.username}`">
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

    <CreateUserDialog
      :open="showCreateModal"
      v-model="newUser"
      :password-error="passwordValidation(newUser.password)"
      v-model:password-visible="showCreatePassword"
      @submit="createUser"
      @close="closeCreateModal"
    />

    <UserPasswordDialog
      :open="showPasswordModal"
      :username="selectedUser?.username"
      v-model="newPassword"
      v-model:password-visible="showChangePassword"
      :validation-error="passwordValidation(newPassword)"
      @submit="updatePassword"
      @close="closePasswordModal"
    />

    <UserNotesDialog
      :open="showNotesModal"
      :username="selectedUser?.username"
      v-model="userNotes"
      @submit="saveNotes"
      @close="closeNotesModal"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, nextTick } from "vue";
import { useAuthStore } from "@/modules/identity/auth/stores/auth";
import { useAdminUsersQuery } from "@/modules/identity/users/composables/useAdminUsersQuery";
import { useAdminUserMutations } from "@/modules/identity/users/composables/useAdminUserMutations";
import SwalService from "@services/swal/SwalService";
import type { AdminUser, RegisterUserPayload } from "@/modules/identity/users/types/users";
import { USER_ROLES, type UserRole } from "@/modules/identity/shared/types/auth";
import CreateUserDialog from "./components/CreateUserDialog.vue";
import UserPasswordDialog from "./components/UserPasswordDialog.vue";
import UserNotesDialog from "./components/UserNotesDialog.vue";

type User = AdminUser;

type SortField = 'username' | 'email' | 'createdAt';
type SortDir = 'asc' | 'desc';

export default defineComponent({
  name: "ManageUsers",
  components: { CreateUserDialog, UserPasswordDialog, UserNotesDialog },
  setup() {
    const authStore = useAuthStore();
    const canManageUsers = () =>
      authStore.authStatus === "authenticated" &&
      authStore.isAuthenticated &&
      authStore.hasRole("superadmin");
    const usersQuery = useAdminUsersQuery();
    const adminMutations = useAdminUserMutations();
    const users = ref<User[]>([]);

    // Search
    const searchQuery = ref("");

    // Filters
    const roleFilter = ref<UserRole | null>(null);
    const filterBanned = ref(false);

    // Sort
    const sortBy = ref<SortField>('username');
    const sortDir = ref<SortDir>('asc');

    // Copy feedback
    const copiedUserId = ref<string | null>(null);

    const roleLabels: Record<UserRole, string> = {
      user: "User",
      collaborator: "Collaborator",
      riffvalley: "Riff Valley",
      superadmin: "Superadmin",
    };
    const roleOptions = USER_ROLES.map((value) => ({ value, label: roleLabels[value] }));
    const validRoleValues = new Set<string>(USER_ROLES);
    const isUserRole = (value: unknown): value is UserRole =>
      typeof value === "string" && validRoleValues.has(value);

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
      !!searchQuery.value.trim() || roleFilter.value !== null || filterBanned.value
    );

    const filteredUsers = computed(() => {
      let list = [...users.value];

      const q = searchQuery.value.trim().toLowerCase();
      if (q) {
        list = list.filter(u =>
          u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        );
      }

      if (roleFilter.value !== null) {
        list = list.filter(u => u.role === roleFilter.value);
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
      if (roleFilter.value !== null) return 'No hay usuarios con ese rol';
      return 'No hay usuarios registrados';
    });

    const toggleRoleFilter = (role: UserRole) => {
      filterBanned.value = false;
      roleFilter.value = roleFilter.value === role ? null : role;
    };

    const toggleBannedFilter = () => {
      filterBanned.value = !filterBanned.value;
      roleFilter.value = null;
    };

    const clearFilters = () => {
      roleFilter.value = null;
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
      if (!canManageUsers()) return;
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
    const activeDialogTrigger = ref<HTMLElement | null>(null);
    const showCreatePassword = ref(false);
    const showChangePassword = ref(false);

    const newUser = ref({ email: "", username: "", password: "" });
    let dialogOperationSequence = 0;
    let createDialogGeneration = 0;
    let passwordDialogGeneration = 0;
    let notesDialogGeneration = 0;
    const createPendingOperation = ref<{ generation: number; id: number } | null>(null);
    const passwordPendingOperation = ref<{ generation: number; id: number } | null>(null);
    const notesPendingOperation = ref<{ generation: number; id: number } | null>(null);

    const originalValues = ref<Map<string, Partial<User>>>(new Map());

    const clearAdminViewState = () => {
      createDialogGeneration++;
      passwordDialogGeneration++;
      notesDialogGeneration++;
      createPendingOperation.value = null;
      passwordPendingOperation.value = null;
      notesPendingOperation.value = null;
      users.value = [];
      originalValues.value.clear();
      selectedUser.value = null;
      newPassword.value = "";
      userNotes.value = "";
      newUser.value = { email: "", username: "", password: "" };
      showCreateModal.value = false;
      showPasswordModal.value = false;
      showNotesModal.value = false;
      activeDialogTrigger.value = null;
      showCreatePassword.value = false;
      showChangePassword.value = false;
      copiedUserId.value = null;
    };

    const isUsersLoading = computed(() => usersQuery.isPending.value);
    const isUsersError = computed(() => usersQuery.isError.value && !usersQuery.data.value);
    const retryUsers = () => usersQuery.refetch();

    const syncUsersFromQuery = (queryUsers: User[] | undefined) => {
      if (!canManageUsers()) {
        clearAdminViewState();
        return;
      }
      if (!queryUsers) return;
      users.value = queryUsers.map((user) => ({ ...user }));
      originalValues.value = new Map(users.value.map((user) => [user.id, {
        username: user.username,
        email: user.email,
        role: user.role,
      }]));
    };

    watch(usersQuery.data, syncUsersFromQuery, { immediate: true });
    watch(usersQuery.error, (error) => {
      if (error) {
        console.error("Error loading users:", error);
        SwalService.error("Error al cargar usuarios");
      }
    });
    watch(
      () => [authStore.authStatus, authStore.userId, authStore.authSessionGeneration, canManageUsers()] as const,
      ([status, userId, generation, hasPermission], [previousStatus, previousUserId, previousGeneration, hadPermission]) => {
        const sessionChanged =
          status !== "authenticated" ||
          userId !== previousUserId ||
          generation !== previousGeneration ||
          previousStatus !== "authenticated";
        const permissionRevoked = hadPermission && !hasPermission;
        if (sessionChanged || permissionRevoked) clearAdminViewState();
      },
      { flush: "sync" },
    );

    const formatDateForInput = (dateString: string) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    };

    const updateCreatedAt = async (user: User, event: Event) => {
      const input = event.target as HTMLInputElement;
      const newDate = input.value ? new Date(input.value) : null;
      if (!newDate) return;
      const session = adminMutations.captureSession();
      if (!session) return;
      try {
        await adminMutations.updateUser.mutateAsync({
          session,
          payload: { userId: user.id, changes: { createdAt: newDate.toISOString() } },
        });
        if (!adminMutations.isCurrentSession(session)) return;
        user.createdAt = newDate.toISOString();
        SwalService.success("Fecha actualizada");
      } catch (error) {
        if (!adminMutations.isCurrentSession(session)) return;
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
      const session = adminMutations.captureSession();
      if (!session) return;
      try {
        await adminMutations.updateUser.mutateAsync({
          session,
          payload: { userId: user.id, changes: { [field]: (user as any)[field] } },
        });
        if (!adminMutations.isCurrentSession(session)) return;
        originalValues.value.set(user.id, { ...original, [field]: (user as any)[field] });
        SwalService.success(`${field} actualizado`);
      } catch (error) {
        if (!adminMutations.isCurrentSession(session)) return;
        console.error(`Error updating ${field}:`, error);
        (user as any)[field] = (original as any)[field];
        SwalService.error(`Error al actualizar ${field}`);
      }
    };

    const updateRole = async (user: User, event: Event) => {
      const selectedRole = (event.target as HTMLSelectElement).value;
      if (!isUserRole(selectedRole) || selectedRole === user.role) return;
      const session = adminMutations.captureSession();
      if (!session) return;

      try {
        await adminMutations.updateUser.mutateAsync({
          session,
          payload: { userId: user.id, changes: { role: selectedRole } },
        });
        if (!adminMutations.isCurrentSession(session)) return;
        user.role = selectedRole;
        const original = originalValues.value.get(user.id);
        if (original) originalValues.value.set(user.id, { ...original, role: selectedRole });
        SwalService.success("Rol actualizado");
      } catch (error) {
        if (!adminMutations.isCurrentSession(session)) return;
        console.error("Error updating role:", error);
        SwalService.error("Error al actualizar el rol");
      }
    };

    const rememberDialogTrigger = (event?: Event) => {
      const eventTarget = event?.currentTarget;
      if (typeof HTMLElement !== "undefined" && eventTarget instanceof HTMLElement) {
        activeDialogTrigger.value = eventTarget;
      } else if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        activeDialogTrigger.value = document.activeElement;
      }
    };

    const restoreDialogTriggerFocus = () => {
      const trigger = activeDialogTrigger.value;
      activeDialogTrigger.value = null;
      void nextTick(() => {
        if (
          trigger?.isConnected &&
          !showCreateModal.value &&
          !showPasswordModal.value &&
          !showNotesModal.value
        ) trigger.focus();
      });
    };

    const openCreateModal = (event?: Event) => {
      if (!canManageUsers()) return;
      rememberDialogTrigger(event);
      createDialogGeneration++;
      createPendingOperation.value = null;
      newUser.value = { email: "", username: "", password: "" };
      showCreateModal.value = true;
    };

    const closeCreateModal = () => {
      createDialogGeneration++;
      createPendingOperation.value = null;
      showCreateModal.value = false;
      showCreatePassword.value = false;
      restoreDialogTriggerFocus();
    };

    const createUser = async () => {
      if (passwordValidation(newUser.value.password)) return;
      if (createPendingOperation.value?.generation === createDialogGeneration) return;
      const session = adminMutations.captureSession();
      if (!session || !showCreateModal.value) return;
      const generation = createDialogGeneration;
      const operationId = ++dialogOperationSequence;
      createPendingOperation.value = { generation, id: operationId };
      try {
        const payload: RegisterUserPayload = {
          email: newUser.value.email,
          username: newUser.value.username,
          password: newUser.value.password,
        };
        await adminMutations.createUser.mutateAsync({ session, payload });
        if (!adminMutations.isCurrentSession(session) || !showCreateModal.value || createDialogGeneration !== generation) return;
        closeCreateModal();
        SwalService.success("Usuario creado correctamente");
      } catch (error) {
        if (!adminMutations.isCurrentSession(session) || !showCreateModal.value || createDialogGeneration !== generation) return;
        console.error("Error creating user:", error);
        SwalService.error("Error al crear usuario");
      } finally {
        if (createPendingOperation.value?.id === operationId) createPendingOperation.value = null;
      }
    };

    const openPasswordModal = (user: User, event?: Event) => {
      if (!canManageUsers()) return;
      rememberDialogTrigger(event);
      passwordDialogGeneration++;
      passwordPendingOperation.value = null;
      selectedUser.value = user;
      newPassword.value = "";
      showPasswordModal.value = true;
    };

    const closePasswordModal = () => {
      passwordDialogGeneration++;
      passwordPendingOperation.value = null;
      showPasswordModal.value = false;
      selectedUser.value = null;
      newPassword.value = "";
      showChangePassword.value = false;
      restoreDialogTriggerFocus();
    };

    const updatePassword = async () => {
      if (!selectedUser.value || passwordValidation(newPassword.value)) return;
      if (passwordPendingOperation.value?.generation === passwordDialogGeneration) return;
      const session = adminMutations.captureSession();
      const targetUser = selectedUser.value;
      if (!session || !showPasswordModal.value) return;
      const generation = passwordDialogGeneration;
      const operationId = ++dialogOperationSequence;
      passwordPendingOperation.value = { generation, id: operationId };
      try {
        await adminMutations.updateUser.mutateAsync({
          session,
          payload: { userId: targetUser.id, changes: { password: newPassword.value } },
        });
        if (
          !adminMutations.isCurrentSession(session) ||
          !showPasswordModal.value ||
          passwordDialogGeneration !== generation ||
          selectedUser.value !== targetUser
        ) return;
        closePasswordModal();
        SwalService.success("Contraseña actualizada");
      } catch (error) {
        if (
          !adminMutations.isCurrentSession(session) ||
          !showPasswordModal.value ||
          passwordDialogGeneration !== generation ||
          selectedUser.value !== targetUser
        ) return;
        console.error("Error updating password:", error);
        SwalService.error("Error al actualizar contraseña");
      } finally {
        if (passwordPendingOperation.value?.id === operationId) passwordPendingOperation.value = null;
      }
    };

    const openNotesModal = (user: User, event?: Event) => {
      if (!canManageUsers()) return;
      rememberDialogTrigger(event);
      notesDialogGeneration++;
      notesPendingOperation.value = null;
      selectedUser.value = user;
      userNotes.value = user.notes || "";
      showNotesModal.value = true;
    };

    const closeNotesModal = () => {
      notesDialogGeneration++;
      notesPendingOperation.value = null;
      showNotesModal.value = false;
      selectedUser.value = null;
      userNotes.value = "";
      restoreDialogTriggerFocus();
    };

    const saveNotes = async () => {
      if (!selectedUser.value) return;
      if (notesPendingOperation.value?.generation === notesDialogGeneration) return;
      const session = adminMutations.captureSession();
      if (!session || !showNotesModal.value) return;
      const targetUser = selectedUser.value;
      const notes = userNotes.value || null;
      const generation = notesDialogGeneration;
      const operationId = ++dialogOperationSequence;
      notesPendingOperation.value = { generation, id: operationId };
      try {
        await adminMutations.updateUser.mutateAsync({
          session,
          payload: { userId: targetUser.id, changes: { notes } },
        });
        if (
          !adminMutations.isCurrentSession(session) ||
          !showNotesModal.value ||
          notesDialogGeneration !== generation ||
          selectedUser.value !== targetUser
        ) return;
        targetUser.notes = notes;
        closeNotesModal();
        SwalService.success("Notas guardadas");
      } catch (error) {
        if (
          !adminMutations.isCurrentSession(session) ||
          !showNotesModal.value ||
          notesDialogGeneration !== generation ||
          selectedUser.value !== targetUser
        ) return;
        console.error("Error saving notes:", error);
        SwalService.error("Error al guardar notas");
      } finally {
        if (notesPendingOperation.value?.id === operationId) notesPendingOperation.value = null;
      }
    };

    const confirmBanUser = async (user: User) => {
      const session = adminMutations.captureSession();
      if (!session) return;
      const action = user.isActive ? 'banear' : 'reactivar';
      const title = user.isActive ? '¿Banear usuario?' : '¿Reactivar usuario?';
      const text = user.isActive
        ? `${user.username} no podrá iniciar sesión. Puedes reactivarlo en cualquier momento.`
        : `${user.username} podrá volver a iniciar sesión.`;
      const result = await SwalService.confirm(title, text, 'Confirmar', 'Cancelar');
      if (!result.isConfirmed || !adminMutations.isCurrentSession(session)) return;
      try {
        await adminMutations.setUserActive.mutateAsync({
          session,
          payload: { userId: user.id, active: !user.isActive },
        });
        if (!adminMutations.isCurrentSession(session)) return;
        user.isActive = !user.isActive;
        SwalService.success(user.isActive
          ? `${user.username} reactivado correctamente`
          : `${user.username} baneado correctamente`);
      } catch (error) {
        if (!adminMutations.isCurrentSession(session)) return;
        console.error(`Error al ${action} usuario:`, error);
        SwalService.error(`Error al ${action} usuario`);
      }
    };

    const confirmDeleteUser = async (user: User) => {
      const session = adminMutations.captureSession();
      if (!session) return;
      const result = await SwalService.confirm(
        "¿Eliminar usuario permanentemente?",
        `Se borrarán todos los datos de ${user.username} y no se podrá recuperar.`,
        'Sí, eliminar', 'Cancelar'
      );
      if (!result.isConfirmed || !adminMutations.isCurrentSession(session)) return;
      try {
        await adminMutations.deleteUser.mutateAsync({ session, payload: { userId: user.id } });
        if (!adminMutations.isCurrentSession(session)) return;
        users.value = users.value.filter((u) => u.id !== user.id);
        originalValues.value.delete(user.id);
        SwalService.success("Usuario eliminado");
      } catch (error) {
        if (!adminMutations.isCurrentSession(session)) return;
        console.error("Error deleting user:", error);
        SwalService.error("Error al eliminar usuario");
      }
    };

    return {
      users,
      isUsersLoading,
      isUsersError,
      retryUsers,
      searchQuery,
      filteredUsers,
      isFiltered,
      emptyMessage,
      stats,
      roleFilter,
      roleOptions,
      isUserRole,
      filterBanned,
      sortBy,
      sortDir,
      sortOptions,
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
      createPendingOperation,
      passwordPendingOperation,
      notesPendingOperation,
      formatDateForInput,
      updateCreatedAt,
      passwordValidation,
      updateField,
      updateRole,
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

</style>
