import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import {
  deleteAsignationService,
  postAsignationService,
  updateAsignationService,
  type CreateAsignationPayload,
  type EditorialAsignation,
  type UpdateAsignationPayload,
} from "@services/asignation/asignation";
import { updateDisc } from "@services/discs/discs";
import { radarDetailQueryKeys } from "./radarDetailQueries";

export function useRadarDetailMutations(listId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient();
  const auth = useAuthStore();
  const session = computed(() => ({
    userId: auth.userId,
    generation: auth.authSessionGeneration,
  }));
  const assignmentsKey = computed(() =>
    radarDetailQueryKeys.assignments(session.value, toValue(listId))
  );
  const catalogPrefix = computed(() => [...radarDetailQueryKeys.root, "catalog", toValue(listId)]);

  const refreshAssignments = () =>
    queryClient.invalidateQueries({ queryKey: assignmentsKey.value });
  const refreshCatalog = () => queryClient.invalidateQueries({ queryKey: catalogPrefix.value });
  const refreshCalendarList = () =>
    queryClient.invalidateQueries({
      queryKey: [
        "editorial",
        "content-calendar",
        "deferred",
        session.value.userId,
        session.value.generation,
      ],
    });

  const assign = useMutation({
    mutationFn: (payload: CreateAsignationPayload) => postAsignationService(payload),
    onSuccess: async () => {
      await Promise.all([refreshAssignments(), refreshCatalog(), refreshCalendarList()]);
    },
  });
  const updateAssignment = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAsignationPayload }) =>
      updateAsignationService(id, payload),
    onSuccess: async () => {
      await Promise.all([refreshAssignments(), refreshCatalog(), refreshCalendarList()]);
    },
  });
  const removeAssignment = useMutation({
    mutationFn: (id: string) => deleteAsignationService(id),
    onSuccess: async () => {
      await Promise.all([refreshAssignments(), refreshCatalog(), refreshCalendarList()]);
    },
  });
  const toggleFeatured = useMutation({
    mutationFn: ({ discId, pinned }: { discId: string; pinned: boolean }) =>
      updateDisc(discId, { pinned }),
    onSuccess: async () => {
      await refreshCatalog();
    },
  });

  return {
    assign: assign.mutateAsync,
    updateAssignment: updateAssignment.mutateAsync,
    removeAssignment: removeAssignment.mutateAsync,
    toggleFeatured: toggleFeatured.mutateAsync,
    isPending: computed(
      () =>
        assign.isPending.value ||
        updateAssignment.isPending.value ||
        removeAssignment.isPending.value ||
        toggleFeatured.isPending.value
    ),
  };
}

export type { EditorialAsignation };
