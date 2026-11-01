import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { getContents, getContentsByMonth, type Content } from "@services/contents/contents";

export const contentCalendarQueryKeys = {
  root: (userId: string | null, sessionGeneration: number, role: string | null) =>
    ["editorial", "contents", "content-calendar", userId, sessionGeneration, role] as const,
  month: (
    userId: string | null,
    sessionGeneration: number,
    role: string | null,
    year: number,
    month: number
  ) =>
    [
      ...contentCalendarQueryKeys.root(userId, sessionGeneration, role),
      "month",
      year,
      month,
    ] as const,
  backlog: (userId: string | null, sessionGeneration: number, role: string | null) =>
    [...contentCalendarQueryKeys.root(userId, sessionGeneration, role), "backlog"] as const,
};

export function mergeContentsById(...collections: readonly (readonly Content[])[]): Content[] {
  return [...new Map(collections.flat().map((content) => [content.id, content])).values()];
}

export function useContentCalendarQueries(
  year: MaybeRefOrGetter<number>,
  month: MaybeRefOrGetter<number>,
  userId: MaybeRefOrGetter<string | null>,
  sessionGeneration: MaybeRefOrGetter<number>,
  role: MaybeRefOrGetter<string | null>
) {
  const monthQuery = useQuery({
    queryKey: computed(() =>
      contentCalendarQueryKeys.month(
        toValue(userId),
        toValue(sessionGeneration),
        toValue(role),
        toValue(year),
        toValue(month)
      )
    ),
    enabled: computed(() => Boolean(toValue(userId))),
    queryFn: ({ queryKey, signal }) => getContentsByMonth(queryKey[7], queryKey[8], signal),
    staleTime: 30_000,
  });

  const backlogQuery = useQuery({
    queryKey: computed(() =>
      contentCalendarQueryKeys.backlog(toValue(userId), toValue(sessionGeneration), toValue(role))
    ),
    enabled: computed(() => Boolean(toValue(userId))),
    queryFn: ({ signal }) => getContents(true, signal),
    staleTime: 30_000,
  });

  const allContents = computed(() =>
    mergeContentsById(backlogQuery.data.value ?? [], monthQuery.data.value ?? [])
  );

  return { monthQuery, backlogQuery, allContents };
}
