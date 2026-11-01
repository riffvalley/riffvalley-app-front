import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import {
  deleteAsignationService,
  postAsignationService,
  updateAsignationService,
  type CreateAsignationPayload,
  type UpdateAsignationPayload,
} from "@services/asignation/asignation";
import { updateDisc } from "@services/discs/discs";
import { generateBestDiscsWpPost, updateList, type ListUpdatePayload } from "@services/list/list";
import { bestDetailQueryKeys } from "./bestDetailQueries";
import { editorialClientId } from "@/shared/realtime/editorialClientId";
import { LIST_ASSIGNMENT_MUTATION_KEY } from "../../shared/application/listsRealtime";

export function useBestDetailMutations(listId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient();
  const auth = useAuthStore();
  const session = computed(() => ({ userId: auth.userId, generation: auth.authSessionGeneration }));
  const assignmentsKey = computed(() =>
    bestDetailQueryKeys.assignments(session.value, toValue(listId))
  );
  const catalogPrefix = computed(() => [...bestDetailQueryKeys.root, "catalog", toValue(listId)]);

  const refreshAssignments = () =>
    queryClient.invalidateQueries({ queryKey: assignmentsKey.value });
  const refreshCatalog = () => queryClient.invalidateQueries({ queryKey: catalogPrefix.value });
  const refreshList = () =>
    queryClient.invalidateQueries({
      queryKey: bestDetailQueryKeys.list(session.value, toValue(listId)),
    });
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
  const refreshAssignmentsAndCatalog = async () =>
    Promise.all([refreshAssignments(), refreshCatalog(), refreshCalendarList()]);

  const assign = useMutation({
    mutationKey: LIST_ASSIGNMENT_MUTATION_KEY,
    mutationFn: (payload: CreateAsignationPayload) =>
      postAsignationService(payload, editorialClientId),
    onSuccess: refreshAssignmentsAndCatalog,
  });
  const updateAssignment = useMutation({
    mutationKey: LIST_ASSIGNMENT_MUTATION_KEY,
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAsignationPayload }) =>
      updateAsignationService(id, payload),
    onSuccess: refreshAssignmentsAndCatalog,
  });
  const removeAssignment = useMutation({
    mutationKey: LIST_ASSIGNMENT_MUTATION_KEY,
    mutationFn: (id: string) => deleteAsignationService(id),
    onSuccess: refreshAssignmentsAndCatalog,
  });
  const toggleFeatured = useMutation({
    mutationFn: ({ discId, pinned }: { discId: string; pinned: boolean }) =>
      updateDisc(discId, { pinned }),
    onSuccess: refreshCatalog,
  });
  const updateListDetails = useMutation({
    mutationFn: (payload: ListUpdatePayload) => updateList(toValue(listId), payload),
    onSuccess: async () => Promise.all([refreshList(), refreshCalendarList()]),
  });
  const publishToWordPress = useMutation({
    mutationFn: () => generateBestDiscsWpPost(toValue(listId)),
    onSuccess: async () => Promise.all([refreshList(), refreshCalendarList()]),
  });

  return {
    assign: assign.mutateAsync,
    updateAssignment: updateAssignment.mutateAsync,
    removeAssignment: removeAssignment.mutateAsync,
    toggleFeatured: toggleFeatured.mutateAsync,
    updateList: updateListDetails.mutateAsync,
    publishToWordPress: publishToWordPress.mutateAsync,
    isPending: computed(
      () =>
        assign.isPending.value ||
        updateAssignment.isPending.value ||
        removeAssignment.isPending.value ||
        toggleFeatured.isPending.value ||
        updateListDetails.isPending.value ||
        publishToWordPress.isPending.value
    ),
  };
}
