<template>
  <div class="view-container p-4 md:p-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <h2 class="text-2xl font-bold text-rv-pink">Gestión de Usuarios</h2>
      <button
        @click="openCreateModal"
        class="flex items-center justify-center gap-2 px-5 py-2.5 bg-rv-pink hover:bg-rv-purple text-white font-medium rounded-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Crear Usuario
      </button>
    </div>

    <!-- Lista de usuarios -->
    <div class="space-y-3">
      <div
        v-for="user in users"
        :key="user.id"
        class="user-card"
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
              <label class="block text-xs text-rv-pink mb-1.5 font-medium">Email</label>
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
                  <span class="text-sm text-gray-300">{{ role.label }}</span>
                </label>
              </div>
            </div>

            <!-- Fecha -->
            <div>
              <label class="block text-xs text-rv-pink mb-1.5 font-medium">Creado</label>
              <span class="inline-block px-3 py-2 text-sm text-gray-400 bg-black/20 rounded-lg">
                {{ formatDate(user.createdAt) }}
              </span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex items-center gap-2 lg:ml-4 pt-3 lg:pt-0 border-t border-white/10 lg:border-0">
            <button
              @click="openNotesModal(user)"
              class="action-btn action-btn-blue"
              title="Notas"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <button
              @click="openPasswordModal(user)"
              class="action-btn action-btn-pink"
              title="Cambiar contraseña"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </button>

            <button
              @click="confirmDeleteUser(user)"
              class="action-btn action-btn-red"
              title="Eliminar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="users.length === 0" class="text-center py-16 text-gray-500">
        No hay usuarios registrados
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
          <h3 class="text-xl font-bold text-white mb-6">Crear Nuevo Usuario</h3>
          <form @submit.prevent="createUser" class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-rv-pink mb-1.5 font-medium">Email</label>
                <input
                  v-model="newUser.email"
                  type="email"
                  placeholder="email@ejemplo.com"
                  class="modal-input"
                  required
                />
              </div>
              <div>
                <label class="block text-sm text-rv-pink mb-1.5 font-medium">Username</label>
                <input
                  v-model="newUser.username"
                  type="text"
                  placeholder="nombreusuario"
                  class="modal-input"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-rv-pink mb-1.5 font-medium">Contraseña</label>
                <input
                  v-model="newUser.password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  class="modal-input"
                  required
                />
                <p v-if="passwordValidation(newUser.password)" class="mt-1.5 text-sm text-red-400">
                  {{ passwordValidation(newUser.password) }}
                </p>
              </div>
              <div>
                <label class="block text-sm text-rv-pink mb-2 font-medium">Roles</label>
                <div class="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                  <label
                    v-for="role in availableRoles"
                    :key="role.value"
                    class="inline-flex items-center gap-2 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      v-model="newUser.roles"
                      :value="role.value"
                      class="w-4 h-4 rounded border-gray-600 bg-transparent text-rv-pink focus:ring-rv-pink focus:ring-offset-0"
                    />
                    <span class="text-sm text-gray-300">{{ role.label }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button type="button" @click="closeCreateModal" class="modal-btn-cancel">
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="!!passwordValidation(newUser.password)"
                class="modal-btn-primary"
              >
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
          <h3 class="text-xl font-bold text-white mb-1">Cambiar Contraseña</h3>
          <p class="text-gray-400 mb-6">Usuario: <span class="text-rv-pink font-medium">{{ selectedUser?.username }}</span></p>

          <form @submit.prevent="updatePassword">
            <div>
              <label class="block text-sm text-rv-pink mb-1.5 font-medium">Nueva contraseña</label>
              <input
                v-model="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                class="modal-input"
                required
              />
              <p v-if="passwordValidation(newPassword)" class="mt-1.5 text-sm text-red-400">
                {{ passwordValidation(newPassword) }}
              </p>
            </div>

            <div class="flex justify-end gap-3 pt-6 mt-6 border-t border-white/10">
              <button type="button" @click="closePasswordModal" class="modal-btn-cancel">
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="!!passwordValidation(newPassword)"
                class="modal-btn-primary"
              >
                Guardar
              </button>
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
          <h3 class="text-xl font-bold text-white mb-1">Notas</h3>
          <p class="text-gray-400 mb-6">Usuario: <span class="text-rv-pink font-medium">{{ selectedUser?.username }}</span></p>

          <div>
            <textarea
              v-model="userNotes"
              rows="6"
              class="modal-input resize-none"
              placeholder="Escribe notas sobre este usuario..."
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-white/10">
            <button type="button" @click="closeNotesModal" class="modal-btn-cancel">
              Cancelar
            </button>
            <button @click="saveNotes" class="modal-btn-primary">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useUserStore } from "@stores/user/users";
import SwalService from "@services/swal/SwalService";

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  createdAt: string;
  notes: string | null;
}

export default defineComponent({
  name: "ManageUsers",
  setup() {
    const userStore = useUserStore();
    const users = ref<User[]>([]);
    const selectedUser = ref<User | null>(null);
    const newPassword = ref("");
    const userNotes = ref("");

    const showCreateModal = ref(false);
    const showPasswordModal = ref(false);
    const showNotesModal = ref(false);

    const newUser = ref({
      email: "",
      username: "",
      password: "",
      roles: [] as string[],
    });

    const availableRoles = [
      { value: "babyUser", label: "Baby" },
      { value: "user", label: "User" },
      { value: "riffValley", label: "RV" },
      { value: "superUser", label: "Super" },
    ];

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

    const formatDate = (dateString: string) => {
      if (!dateString) return "-";
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
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
        await userStore.updateUserSuperAdminStore(user.id, {
          [field]: (user as any)[field],
        });
        originalValues.value.set(user.id, {
          ...original,
          [field]: (user as any)[field],
        });
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
        if (original) {
          originalValues.value.set(user.id, { ...original, roles: [...newRoles] });
        }
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
    };

    const updatePassword = async () => {
      if (!selectedUser.value || passwordValidation(newPassword.value)) return;
      try {
        await userStore.updateUserSuperAdminStore(selectedUser.value.id, {
          password: newPassword.value,
        });
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
        await userStore.updateUserSuperAdminStore(selectedUser.value.id, {
          notes: userNotes.value || null,
        });
        selectedUser.value.notes = userNotes.value || null;
        closeNotesModal();
        SwalService.success("Notas guardadas");
      } catch (error) {
        console.error("Error saving notes:", error);
        SwalService.error("Error al guardar notas");
      }
    };

    const confirmDeleteUser = (user: User) => {
      SwalService.confirm(
        "¿Eliminar usuario?",
        `Se eliminará permanentemente a ${user.username}`,
        "warning"
      ).then(async (result) => {
        if (result.isConfirmed) {
          await deleteUser(user);
        }
      });
    };

    const deleteUser = async (user: User) => {
      try {
        await userStore.removeUser(user.id);
        users.value = users.value.filter((u) => u.id !== user.id);
        originalValues.value.delete(user.id);
        SwalService.success("Usuario eliminado");
      } catch (error) {
        console.error("Error deleting user:", error);
        SwalService.error("Error al eliminar usuario");
      }
    };

    return {
      users,
      newUser,
      selectedUser,
      newPassword,
      userNotes,
      availableRoles,
      showCreateModal,
      showPasswordModal,
      showNotesModal,
      formatDate,
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
      confirmDeleteUser,
    };
  },
});
</script>

<style scoped>
.view-container {
  background: #00021f;
  min-height: 100vh;
}

.user-card {
  background: rgba(0, 2, 31, 0.6);
  border: 1px solid rgba(176, 102, 159, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
}

.user-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(176, 102, 159, 0.3);
  border-radius: 8px;
  color: #fff;
  transition: border-color 0.2s;
}

.user-input:focus {
  outline: none;
  border-color: #e46e8a;
}

.user-input::placeholder {
  color: #6b7280;
}

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
  .action-btn {
    flex: none;
  }
}

.action-btn-blue {
  background: rgba(0, 100, 214, 0.15);
  color: #0064d6;
}

.action-btn-blue:hover {
  background: rgba(0, 100, 214, 0.3);
}

.action-btn-pink {
  background: rgba(228, 110, 138, 0.15);
  color: #e46e8a;
}

.action-btn-pink:hover {
  background: rgba(228, 110, 138, 0.3);
}

.action-btn-red {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.action-btn-red:hover {
  background: rgba(239, 68, 68, 0.3);
}

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
  background: #00021f;
  border: 1px solid rgba(176, 102, 159, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-sm {
  max-width: 28rem;
}

.modal-md {
  max-width: 36rem;
}

.modal-lg {
  max-width: 48rem;
}

.modal-close {
  position: absolute;
  right: 1rem;
  top: 1rem;
  color: #e46e8a;
  transition: opacity 0.2s;
}

.modal-close:hover {
  opacity: 0.7;
}

.modal-input {
  width: 100%;
  padding: 0.625rem 1rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(176, 102, 159, 0.3);
  border-radius: 8px;
  color: #fff;
  transition: border-color 0.2s;
}

.modal-input:focus {
  outline: none;
  border-color: #e46e8a;
}

.modal-input::placeholder {
  color: #6b7280;
}

.modal-btn-cancel {
  padding: 0.5rem 1rem;
  color: #e46e8a;
  transition: opacity 0.2s;
}

.modal-btn-cancel:hover {
  opacity: 0.7;
}

.modal-btn-primary {
  padding: 0.5rem 1.25rem;
  background: #e46e8a;
  color: #fff;
  font-weight: 500;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.modal-btn-primary:hover {
  background: #b0669f;
}

.modal-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
