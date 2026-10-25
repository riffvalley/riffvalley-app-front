import { defineStore } from "pinia";
import { updateUserService, getRvUsers } from "@/modules/identity/users/api/users";

export const useUserStore = defineStore("user", {
  state: () => ({
    usersRv: [] as any[], // Lista de usuarios RV
  }),

  actions: {
    async loadRvUsers() {
      try {
        const response = await getRvUsers();
        this.usersRv = response;
      } catch (error) {
        console.error("Error loading usersRv:", error);
        throw error; // Opcional: lanzar el error para manejarlo en el componente
      }
    },

    async updateUserStore(updatedUser: any) {
      try {
        const data: any = {};
        if (updatedUser?.password) data.password = updatedUser.password;
        if (updatedUser?.image) data.image = updatedUser.image;
        if (typeof updatedUser?.dashboardButtonsEnabled === "boolean") {
          data.dashboardButtonsEnabled = updatedUser.dashboardButtonsEnabled;
        }
        if (updatedUser?.dashboardConfig) data.dashboardConfig = updatedUser.dashboardConfig;
        if (updatedUser?.mobileDashboardConfig) data.mobileDashboardConfig = updatedUser.mobileDashboardConfig;
        await updateUserService(data);
      } catch (error) {
        console.error("Error updating asignation:", error);
        throw error;
      }
    },
  },
});
