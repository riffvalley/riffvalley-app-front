import { createDashboardStore, createDashboardPersistence } from "@/modules/workspace";

export const useWorkspaceStore = createDashboardStore(createDashboardPersistence(() => localStorage));
