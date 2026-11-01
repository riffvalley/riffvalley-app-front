import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { toValue, type MaybeRefOrGetter } from "vue";
import { editorialClientId } from "@/shared/realtime/editorialClientId";
import { createContent, type CreateContentDto } from "@services/contents/contents";
import {
  createPoint,
  createReunion,
  deletePoint,
  deleteReunion,
  updatePoint,
  updateReunion,
} from "../api/reunionsApi";
import { reunionsQueryKeys } from "./reunionsQueries";
import type {
  CreatePointDto,
  CreateReunionDto,
  UpdatePointDto,
  UpdateReunionDto,
} from "../types/reunions";

export const REUNIONS_MUTATION_KEY = ["editorial", "reunions", "mutation"] as const;

export function useReunionsMutations(session: {
  userId: MaybeRefOrGetter<string | null>;
  generation: MaybeRefOrGetter<number>;
  role: MaybeRefOrGetter<string | null>;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: reunionsQueryKeys.root(
        toValue(session.userId),
        toValue(session.generation),
        toValue(session.role)
      ),
    });

  const createReunionMutation = useMutation({
    mutationKey: REUNIONS_MUTATION_KEY,
    mutationFn: (input: CreateReunionDto) => createReunion(input, editorialClientId),
    onSuccess: invalidate,
  });
  const updateReunionMutation = useMutation({
    mutationKey: REUNIONS_MUTATION_KEY,
    mutationFn: ({ id, dto }: { id: string; dto: UpdateReunionDto }) =>
      updateReunion(id, dto, editorialClientId),
    onSuccess: invalidate,
  });
  const deleteReunionMutation = useMutation({
    mutationKey: REUNIONS_MUTATION_KEY,
    mutationFn: (id: string) => deleteReunion(id, editorialClientId),
    onSuccess: invalidate,
  });
  const createPointMutation = useMutation({
    mutationKey: REUNIONS_MUTATION_KEY,
    mutationFn: (input: CreatePointDto) => createPoint(input, editorialClientId),
    onSuccess: invalidate,
  });
  const updatePointMutation = useMutation({
    mutationKey: REUNIONS_MUTATION_KEY,
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePointDto }) =>
      updatePoint(id, dto, editorialClientId),
    onSuccess: invalidate,
  });
  const deletePointMutation = useMutation({
    mutationKey: REUNIONS_MUTATION_KEY,
    mutationFn: (id: string) => deletePoint(id, editorialClientId),
    onSuccess: invalidate,
  });
  const createReunionFromContentMutation = useMutation({
    mutationKey: REUNIONS_MUTATION_KEY,
    mutationFn: (input: Extract<CreateContentDto, { type: "reunion" }>) =>
      createContent(input, editorialClientId),
    onSuccess: async () => {
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({
          queryKey: ["editorial", "contents", "content-calendar"],
        }),
      ]);
    },
  });

  return {
    createReunionMutation,
    updateReunionMutation,
    deleteReunionMutation,
    createPointMutation,
    updatePointMutation,
    deletePointMutation,
    createReunionFromContentMutation,
  };
}
