import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { getRvUsers, type RvUser } from "@/modules/identity/users";
import { getListDetails, type RadarListDetails } from "@services/list/list";

export interface ContentCalendarSession {
  userId: string | null;
  generation: number;
  role: string | null;
}

interface DeferredQueryOptions {
  session: () => ContentCalendarSession;
  enabled: MaybeRefOrGetter<boolean>;
}

export const contentCalendarDeferredQueryKeys = {
  root: (session: ContentCalendarSession) =>
    [
      "editorial",
      "content-calendar",
      "deferred",
      session.userId,
      session.generation,
      session.role,
    ] as const,
  assignableUsers: (session: ContentCalendarSession) =>
    [
      "identity",
      "users",
      "rv-assignable",
      session.userId,
      session.generation,
      session.role,
    ] as const,
  listDetails: (session: ContentCalendarSession, listId: string) =>
    [...contentCalendarDeferredQueryKeys.root(session), "list", listId] as const,
};

function sameSession(left: ContentCalendarSession, right: ContentCalendarSession): boolean {
  return (
    left.userId === right.userId && left.generation === right.generation && left.role === right.role
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRadarListDetails(value: unknown): value is RadarListDetails {
  if (!isRecord(value)) return false;
  const candidate = value;
  const types = ["month", "week", "special", "video"];
  const statuses = [
    "new",
    "assigned",
    "not_started",
    "in_progress",
    "editing",
    "ready",
    "published",
  ];
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.type !== "string" ||
    !types.includes(candidate.type) ||
    !Array.isArray(candidate.asignations)
  ) {
    return false;
  }
  if (
    candidate.status !== undefined &&
    candidate.status !== null &&
    (typeof candidate.status !== "string" || !statuses.includes(candidate.status))
  ) {
    return false;
  }
  if (
    !["listDate", "closeDate"].every(
      (field) =>
        candidate[field] === undefined ||
        candidate[field] === null ||
        typeof candidate[field] === "string"
    )
  ) {
    return false;
  }
  return candidate.asignations.every((asignation) => {
    if (!isRecord(asignation)) return false;
    const item = asignation;
    return (
      typeof item.id === "string" &&
      (typeof item.done === "boolean" || item.done === null) &&
      (typeof item.position === "number" || item.position === null) &&
      (typeof item.description === "string" || item.description === null)
    );
  });
}

export function useAssignableUsersQuery(options: DeferredQueryOptions) {
  const session = computed(options.session);

  return useQuery({
    queryKey: computed(() => contentCalendarDeferredQueryKeys.assignableUsers(session.value)),
    enabled: computed(() => Boolean(session.value.userId) && toValue(options.enabled)),
    staleTime: 60_000,
    queryFn: async ({ queryKey, signal }): Promise<RvUser[]> => {
      const requestedSession = {
        userId: queryKey[3],
        generation: queryKey[4],
        role: queryKey[5],
      } satisfies ContentCalendarSession;
      if (!requestedSession.userId || !sameSession(requestedSession, options.session())) {
        throw new Error("La sesión cambió antes de cargar los usuarios asignables.");
      }

      const users = await getRvUsers(signal);
      if (signal.aborted || !sameSession(requestedSession, options.session())) {
        throw new Error("La sesión cambió antes de completar la consulta de usuarios.");
      }
      return users;
    },
  });
}

export function useRadarListDetailsQuery(
  options: DeferredQueryOptions & { listId: MaybeRefOrGetter<string | null> }
) {
  const session = computed(options.session);
  const listId = computed(() => toValue(options.listId));

  return useQuery({
    queryKey: computed(() =>
      contentCalendarDeferredQueryKeys.listDetails(session.value, listId.value ?? "")
    ),
    enabled: computed(
      () => Boolean(session.value.userId && listId.value) && toValue(options.enabled)
    ),
    staleTime: 30_000,
    queryFn: async ({ queryKey, signal }): Promise<RadarListDetails> => {
      const requestedSession = {
        userId: queryKey[3],
        generation: queryKey[4],
        role: queryKey[5],
      } satisfies ContentCalendarSession;
      const requestedListId = queryKey[7];
      if (
        !requestedSession.userId ||
        !requestedListId ||
        !sameSession(requestedSession, options.session())
      ) {
        throw new Error("La sesión o la lista seleccionada ya no está disponible.");
      }

      const response: unknown = await getListDetails(requestedListId, signal);
      if (signal.aborted || !sameSession(requestedSession, options.session())) {
        throw new Error("La sesión cambió antes de completar la consulta de Lists.");
      }
      if (!isRadarListDetails(response) || response.id !== requestedListId) {
        throw new Error("La respuesta de la lista no tiene el formato esperado.");
      }
      return {
        ...response,
        asignations: [...response.asignations].sort(
          (left, right) => (left.position ?? 0) - (right.position ?? 0)
        ),
      };
    },
  });
}
