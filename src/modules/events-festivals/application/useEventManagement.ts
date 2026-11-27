import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { deleteEvent, updateEvent } from "../api/eventManagement";
import type { UpdateEventRequest } from "../api/eventManagement";

export function useUpdateEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEventRequest }) =>
      updateEvent(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events-festivals", "listing"] }),
        queryClient.invalidateQueries({
          queryKey: ["events-festivals", "event-detail", variables.id],
        }),
      ]);
    },
  });
}

export function useDeleteEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events-festivals", "listing"] });
    },
  });
}
