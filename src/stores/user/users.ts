import { defineStore } from "pinia";
import {
  getUsers,
  postUserService,
  updateUserService,
  updateUserSuperAdminService,
  deleteUserService,
  getRvUsers,
} from "@services/users/users";

export const useUserStore = defineStore("user", {
  state: () => ({
    users: [] as any[], // Lista de usuarios
    usersRv: [] as any[], // Lista de usuarios RV
    user: null as any | null, // 👈 usuario actual (lo pide el componente)
  }),

  actions: {
    // 👇 necesario porque el componente llama a fetchUser()
    async fetchUser() {
      // Si ya tienes un endpoint tipo "getMe", úsalo aquí.
      // Parche mínimo: no hacemos petición; solo devolvemos lo que haya.
      return this.user;
    },
    // 👇 lo usa el componente para mantener la sesión en memoria
    setUser(user: any) {
      this.user = user;
    },
    async loadUsers() {
      try {
        const response = await getUsers();
        this.users = response;
      } catch (error) {
        console.error("Error loading users:", error);
        throw error; // Opcional: lanzar el error para manejarlo en el componente
      }
    },

    async loadRvUsers() {
      try {
        const response = await getRvUsers();
        this.usersRv = response;
      } catch (error) {
        console.error("Error loading usersRv:", error);
        throw error; // Opcional: lanzar el error para manejarlo en el componente
      }
    },

    async createUser(user: any) {
      try {
        const newUser = await postUserService(user);
        this.users.push(newUser);
        return newUser;
      } catch (error) {
        console.error("Error creating user:", error);
        throw error;
      }
    },

    addUser(user: any) {
      this.users.push(user);
    },

    async removeUser(userId: string) {
      this.users = this.users.filter((user) => user.id !== userId);
      await deleteUserService(userId);
    },

    async updateUserStore(updatedUser: any) {
      try {
        const data: any = {};
        if (updatedUser?.password) data.password = updatedUser.password;
        if (updatedUser?.image) data.image = updatedUser.image;
        await updateUserService(data);
      } catch (error) {
        console.error("Error updating asignation:", error);
        throw error;
      }
    },

    async updateUserSuperAdminStore(userId: string, updatedUser: any) {
      await updateUserSuperAdminService(userId, updatedUser);

      const index = this.users.findIndex((user) => user.id === updatedUser.id);
      if (index !== -1) {
        this.users[index] = {
          ...this.users[index],
          ...updatedUser,
        };
      }
    },
  },
  getters: {
    getUserById: (state) => (id: string) => {
      return state.users.find((user) => user.id === id);
    },
  },
});
