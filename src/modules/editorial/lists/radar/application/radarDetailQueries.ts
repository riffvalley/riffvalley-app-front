import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import { getRvUsers, type RvUser } from "@/modules/identity/users";
import { getListDetails, type RadarListDetails } from "@services/list/list";
import { getAsignationsByListService } from "@services/asignation/asignation";
import { getDiscsDated, type DiscsResponse } from "@services/discs/discs";
import { getAllGenres, type Genre } from "@services/genres/genres";
import { getEditorialWeekRange, toEditorialWeekApiDate } from "../utils/editorialWeek";

export const radarDetailQueryRoot = ["editorial", "radar-best-lists", "radar-detail"] as const;
export const RADAR_CATALOG_PAGE_SIZE = 300;

export interface RadarSession {
  userId: string | null;
  generation: number;
}

export const radarDetailQueryKeys = {
  root: radarDetailQueryRoot,
  list: (session: RadarSession, listId: string) =>
    [...radarDetailQueryRoot, "list", listId, session.userId, session.generation] as const,
  assignments: (session: RadarSession, listId: string) =>
    [...radarDetailQueryRoot, "assignments", listId, session.userId, session.generation] as const,
  catalog: (session: RadarSession, listId: string, date: string, search: string, genre: string) =>
    [
      ...radarDetailQueryRoot,
      "catalog",
      listId,
      date,
      search,
      genre,
      session.userId,
      session.generation,
    ] as const,
  users: (session: RadarSession) =>
    [
      "identity",
      "users",
      "rv-assignable",
      session.userId,
      session.generation,
      "riffvalley",
    ] as const,
  genres: (session: RadarSession) =>
    [...radarDetailQueryRoot, "genres", session.userId, session.generation] as const,
};

function useSession() {
  const auth = useAuthStore();
  const session = computed(() => ({ userId: auth.userId, generation: auth.authSessionGeneration }));
  const enabled = computed(
    () => auth.authStatus === "authenticated" && auth.isAuthenticated && Boolean(auth.userId)
  );
  return { session, enabled };
}

function assertSession(requested: RadarSession, current: RadarSession, signal: AbortSignal): void {
  if (
    signal.aborted ||
    !requested.userId ||
    requested.userId !== current.userId ||
    requested.generation !== current.generation
  ) {
    throw new Error("La sesión cambió antes de completar la consulta de Radar.");
  }
}

export function useRadarDetailQuery(listId: MaybeRefOrGetter<string>) {
  const { session, enabled } = useSession();
  return useQuery({
    queryKey: computed(() => radarDetailQueryKeys.list(session.value, toValue(listId))),
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

export function useRadarAssignmentsQuery(listId: MaybeRefOrGetter<string>) {
  const { session, enabled } = useSession();
  return useQuery({
    queryKey: computed(() => radarDetailQueryKeys.assignments(session.value, toValue(listId))),
    enabled: computed(() => enabled.value && Boolean(toValue(listId))),
    staleTime: 0,
    retry: 1,
    queryFn: async ({ queryKey, signal }) => {
      const requested = { userId: queryKey[5] as string | null, generation: queryKey[6] as number };
      assertSession(requested, session.value, signal);
      const assignments = await getAsignationsByListService(queryKey[4] as string, signal);
      assertSession(requested, session.value, signal);
      return assignments;
    },
  });
}

export function useRadarAssignableUsersQuery(enabledOverride: MaybeRefOrGetter<boolean> = true) {
  const { session, enabled } = useSession();
  return useQuery({
    queryKey: computed(() => radarDetailQueryKeys.users(session.value)),
    enabled: computed(() => enabled.value && toValue(enabledOverride)),
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

export function useRadarGenresQuery(enabledOverride: MaybeRefOrGetter<boolean> = true) {
  const { session, enabled } = useSession();
  return useQuery({
    queryKey: computed(() => radarDetailQueryKeys.genres(session.value)),
    enabled: computed(() => enabled.value && toValue(enabledOverride)),
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

export function useRadarDiscCatalogQuery(
  listId: MaybeRefOrGetter<string>,
  date: MaybeRefOrGetter<string>,
  search: MaybeRefOrGetter<string>,
  genre: MaybeRefOrGetter<string>
) {
  const { session, enabled } = useSession();
  const queryKey = computed(() =>
    radarDetailQueryKeys.catalog(
      session.value,
      toValue(listId),
      toValue(date),
      toValue(search),
      toValue(genre)
    )
  );
  const query = useInfiniteQuery({
    queryKey,
    enabled: computed(() => enabled.value && Boolean(toValue(listId)) && Boolean(toValue(date))),
    initialPageParam: 0,
    staleTime: 0,
    retry: 1,
    queryFn: async ({ queryKey: requestedKey, pageParam, signal }): Promise<DiscsResponse> => {
      const requested = {
        userId: requestedKey[8] as string | null,
        generation: requestedKey[9] as number,
      };
      assertSession(requested, session.value, signal);
      const week = getEditorialWeekRange(requestedKey[5] as string);
      if (!week) throw new Error("La fecha editorial del Radar no es válida.");
      const response = await getDiscsDated(
        RADAR_CATALOG_PAGE_SIZE,
        pageParam,
        [toEditorialWeekApiDate(week.start), toEditorialWeekApiDate(week.end, true)],
        undefined,
        signal
      );
      assertSession(requested, session.value, signal);
      return response;
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.data.length > 0 ? pages.length * RADAR_CATALOG_PAGE_SIZE : undefined,
  });
  return { ...query, queryKey };
}
