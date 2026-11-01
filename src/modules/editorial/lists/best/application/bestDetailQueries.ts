import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import { getRvUsers, type RvUser } from "@/modules/identity/users";
import { getListDetails, type RadarListDetails } from "@services/list/list";
import { getAsignationsByListService } from "@services/asignation/asignation";
import { getDiscsDated, type DiscsResponse, type GroupedDiscs } from "@services/discs/discs";
import { getAllGenres, type Genre } from "@services/genres/genres";
import { getRatesByUser, type UserDiscRateListItem } from "@services/rates/rates";

export const bestDetailQueryRoot = ["editorial", "radar-best-lists", "best-detail"] as const;
export const BEST_CATALOG_PAGE_SIZE = 300;

export interface BestSession {
  userId: string | null;
  generation: number;
}

export const bestDetailQueryKeys = {
  root: bestDetailQueryRoot,
  list: (session: BestSession, listId: string) =>
    [...bestDetailQueryRoot, "list", listId, session.userId, session.generation] as const,
  assignments: (session: BestSession, listId: string) =>
    [...bestDetailQueryRoot, "assignments", listId, session.userId, session.generation] as const,
  catalog: (session: BestSession, listId: string, period: string) =>
    [
      ...bestDetailQueryRoot,
      "catalog",
      listId,
      period,
      session.userId,
      session.generation,
    ] as const,
  users: (session: BestSession) =>
    [
      "identity",
      "users",
      "rv-assignable",
      session.userId,
      session.generation,
      "riffvalley",
    ] as const,
  genres: (session: BestSession) =>
    [...bestDetailQueryRoot, "genres", session.userId, session.generation] as const,
  votes: (session: BestSession, period: string) =>
    [...bestDetailQueryRoot, "votes", period, session.userId, session.generation] as const,
};

function useSession() {
  const auth = useAuthStore();
  const session = computed(() => ({ userId: auth.userId, generation: auth.authSessionGeneration }));
  const enabled = computed(
    () => auth.authStatus === "authenticated" && auth.isAuthenticated && Boolean(auth.userId)
  );
  return { session, enabled };
}

function assertSession(requested: BestSession, current: BestSession, signal: AbortSignal): void {
  if (
    signal.aborted ||
    !requested.userId ||
    requested.userId !== current.userId ||
    requested.generation !== current.generation
  ) {
    throw new Error("La sesión cambió antes de completar la consulta de Mejores del Mes.");
  }
}

export function getBestMonthRange(date: string) {
  const start = new Date(date);
  if (Number.isNaN(start.getTime())) return null;
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setTime(end.getTime() - 1);
  return { start, end };
}

export function useBestDetailQuery(listId: MaybeRefOrGetter<string>) {
  const { session, enabled } = useSession();
  return useQuery({
    queryKey: computed(() => bestDetailQueryKeys.list(session.value, toValue(listId))),
    enabled: computed(() => enabled.value && Boolean(toValue(listId))),
    staleTime: 0,
    retry: 1,
    queryFn: async ({ queryKey, signal }): Promise<RadarListDetails> => {
      const requested = { userId: queryKey[5] as string | null, generation: queryKey[6] as number };
      assertSession(requested, session.value, signal);
      const list = await getListDetails(queryKey[4] as string, signal);
      assertSession(requested, session.value, signal);
      return list;
    },
  });
}

export function useBestAssignmentsQuery(listId: MaybeRefOrGetter<string>) {
  const { session, enabled } = useSession();
  return useQuery({
    queryKey: computed(() => bestDetailQueryKeys.assignments(session.value, toValue(listId))),
    enabled: computed(() => enabled.value && Boolean(toValue(listId))),
    staleTime: 0,
    retry: 1,
    queryFn: async ({ queryKey, signal }) => {
      const requested = { userId: queryKey[5] as string | null, generation: queryKey[6] as number };
      assertSession(requested, session.value, signal);
      const items = await getAsignationsByListService(queryKey[4] as string, signal);
      assertSession(requested, session.value, signal);
      return items;
    },
  });
}

export function useBestAssignableUsersQuery() {
  const { session, enabled } = useSession();
  return useQuery({
    queryKey: computed(() => bestDetailQueryKeys.users(session.value)),
    enabled,
    staleTime: 60_000,
    queryFn: async ({ queryKey, signal }): Promise<RvUser[]> => {
      const requested = { userId: queryKey[3] as string | null, generation: queryKey[4] as number };
      assertSession(requested, session.value, signal);
      const users = await getRvUsers(signal);
      assertSession(requested, session.value, signal);
      return users;
    },
  });
}

export function useBestGenresQuery() {
  const { session, enabled } = useSession();
  return useQuery({
    queryKey: computed(() => bestDetailQueryKeys.genres(session.value)),
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async ({ queryKey, signal }): Promise<Genre[]> => {
      const requested = { userId: queryKey[4] as string | null, generation: queryKey[5] as number };
      assertSession(requested, session.value, signal);
      const genres = await getAllGenres(signal);
      assertSession(requested, session.value, signal);
      return genres;
    },
  });
}

export function useBestDiscCatalogQuery(
  listId: MaybeRefOrGetter<string>,
  date: MaybeRefOrGetter<string>,
  active: MaybeRefOrGetter<boolean> = true
) {
  const { session, enabled } = useSession();
  const queryKey = computed(() =>
    bestDetailQueryKeys.catalog(session.value, toValue(listId), toValue(date))
  );
  const query = useInfiniteQuery({
    queryKey,
    enabled: computed(
      () => enabled.value && toValue(active) && Boolean(toValue(listId)) && Boolean(toValue(date))
    ),
    initialPageParam: 0,
    staleTime: 0,
    retry: 1,
    queryFn: async ({ queryKey: requestedKey, pageParam, signal }): Promise<DiscsResponse> => {
      const requested = {
        userId: requestedKey[6] as string | null,
        generation: requestedKey[7] as number,
      };
      assertSession(requested, session.value, signal);
      const range = getBestMonthRange(requestedKey[5] as string);
      if (!range) throw new Error("La fecha mensual de Mejores no es válida.");
      const response = await getDiscsDated(
        BEST_CATALOG_PAGE_SIZE,
        pageParam,
        [range.start.toISOString(), range.end.toISOString()],
        undefined,
        signal
      );
      assertSession(requested, session.value, signal);
      return response;
    },
    getNextPageParam: (lastPage, pages, lastPageParam) => {
      if (!lastPage.data.length || lastPage.currentPage >= lastPage.totalPages) return undefined;
      const previousDiscIds = new Set(pages.slice(0, -1).flatMap(getDiscIds));
      const hasNewDisc = getDiscIds(lastPage).some((discId) => !previousDiscIds.has(discId));
      if (!hasNewDisc) return undefined;
      return Number(lastPageParam) + BEST_CATALOG_PAGE_SIZE;
    },
  });
  return { ...query, queryKey };
}

function getDiscIds(page: DiscsResponse): string[] {
  return page.data.flatMap((item) =>
    "discs" in item ? item.discs.map((disc) => disc.id) : [item.id]
  );
}

export function useBestVotesQuery(
  listDate: MaybeRefOrGetter<string>,
  active: MaybeRefOrGetter<boolean> = true
) {
  const { session, enabled } = useSession();
  const period = computed(() => toValue(listDate));
  return useQuery({
    queryKey: computed(() => bestDetailQueryKeys.votes(session.value, period.value)),
    enabled: computed(
      () => enabled.value && toValue(active) && Boolean(getBestMonthRange(period.value))
    ),
    staleTime: 0,
    retry: 1,
    queryFn: async ({ queryKey, signal }): Promise<UserDiscRateListItem[]> => {
      const requested = { userId: queryKey[5] as string | null, generation: queryKey[6] as number };
      assertSession(requested, session.value, signal);
      const range = getBestMonthRange(queryKey[4] as string);
      if (!range) throw new Error("La fecha mensual de Mejores no es válida.");
      const response = await getRatesByUser(
        500,
        0,
        undefined,
        [range.start.toISOString(), range.end.toISOString()],
        undefined,
        undefined,
        "rate",
        "rate.rate:DESC,artist.name:ASC",
        signal
      );
      assertSession(requested, session.value, signal);
      return (response.data ?? []).filter((vote) => !vote.disc?.ep);
    },
  });
}

export function flattenBestCatalogPages(pages: readonly DiscsResponse[] | undefined) {
  const groups = new Map<string, GroupedDiscs>();
  for (const page of pages ?? []) {
    for (const item of page.data) {
      if (!("discs" in item)) continue;
      const key = new Date(item.releaseDate).toISOString().slice(0, 10);
      const group = groups.get(key) ?? { releaseDate: item.releaseDate, discs: [] };
      const existing = new Set(group.discs.map((disc) => disc.id));
      for (const disc of item.discs) {
        if (existing.has(disc.id)) continue;
        existing.add(disc.id);
        group.discs.push(disc);
      }
      groups.set(key, group);
    }
  }
  return [...groups.entries()].map(([key, group]) => ({ key, ...group }));
}
