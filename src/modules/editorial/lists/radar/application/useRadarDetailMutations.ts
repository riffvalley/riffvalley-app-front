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
import { editorialClientId } from "@/shared/realtime/editorialClientId";
import { LIST_ASSIGNMENT_MUTATION_KEY } from "../../shared/application/listsRealtime";

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
    mutationKey: LIST_ASSIGNMENT_MUTATION_KEY,
    mutationFn: (payload: CreateAsignationPayload) =>
      postAsignationService(payload, editorialClientId),
    onSuccess: async () => {
      await Promise.all([refreshAssignments(), refreshCatalog(), refreshCalendarList()]);
    },
  });
  const updateAssignment = useMutation({
    mutationKey: LIST_ASSIGNMENT_MUTATION_KEY,
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAsignationPayload }) =>
      updateAsignationService(
        id,
        payload,
        payload.position !== undefined ? editorialClientId : undefined
      ),
    onSuccess: async () => {
      await Promise.all([refreshAssignments(), refreshCatalog(), refreshCalendarList()]);
    },
  });
  const removeAssignment = useMutation({
    mutationKey: LIST_ASSIGNMENT_MUTATION_KEY,
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
