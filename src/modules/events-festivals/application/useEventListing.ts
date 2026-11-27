import { computed, shallowRef } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";
import { getEventListing, EVENT_LISTING_PAGE_SIZE } from "../api/eventListing";
import type { EventListingRequest, ListedEventType } from "../types/eventListing";

export interface EventListingFilters {
  dateFrom: string;
  dateTo: string;
}

export function eventListingQueryKey(
  request: EventListingRequest,
  userId: string | null,
  generation: number
) {
  return ["events-festivals", "listing", request, userId, generation] as const;
}

export function useEventListing(type: ListedEventType, active: () => boolean) {
  const auth = useAuthStore();
  const filters = shallowRef<EventListingFilters>({ dateFrom: "", dateTo: "" });
  const offset = shallowRef(0);
  const invalidDateRange = computed(() =>
    Boolean(
      filters.value.dateFrom &&
      filters.value.dateTo &&
      filters.value.dateTo < filters.value.dateFrom
    )
  );
  const canRead = computed(
    () =>
      active() &&
      !invalidDateRange.value &&
      auth.authStatus === "authenticated" &&
      auth.isAuthenticated &&
      hasMinimumRole(auth.role, "riffvalley") &&
      Boolean(auth.userId)
  );
  const request = computed<EventListingRequest>(() => ({
    type,
    limit: EVENT_LISTING_PAGE_SIZE,
    offset: offset.value,
    ...(filters.value.dateFrom ? { dateFrom: filters.value.dateFrom } : {}),
    ...(filters.value.dateTo ? { dateTo: filters.value.dateTo } : {}),
  }));
  const queryKey = computed(() =>
    eventListingQueryKey(request.value, auth.userId, auth.authSessionGeneration)
  );

  const query = useQuery({
    queryKey,
    enabled: canRead,
    queryFn: async ({ queryKey: key, signal }) => {
      const [, , requested, userId, generation] = key;
      if (!canRead.value || auth.userId !== userId || auth.authSessionGeneration !== generation) {
        throw new Error("La sesión cambió antes de consultar los eventos.");
      }
      const page = await getEventListing(requested, signal);
      if (
        signal.aborted ||
        !canRead.value ||
        auth.userId !== userId ||
        auth.authSessionGeneration !== generation
      ) {
        throw new Error("La sesión cambió durante la consulta de eventos.");
      }
      return page;
    },
    staleTime: 30_000,
    retry: false,
  });

  function updateFilter(key: keyof EventListingFilters, value: string) {
    if (filters.value[key] === value) return;
    filters.value = { ...filters.value, [key]: value };
    offset.value = 0;
  }

  function goToPage(page: number) {
    const totalPages = query.data.value?.totalPages;
    if (page < 1 || (totalPages !== undefined && page > totalPages)) return;
    offset.value = (page - 1) * EVENT_LISTING_PAGE_SIZE;
  }

  function clearFilters() {
    filters.value = { dateFrom: "", dateTo: "" };
    offset.value = 0;
  }

  return {
    filters,
    offset,
    request,
    query,
    invalidDateRange,
    updateFilter,
    goToPage,
    clearFilters,
  };
}
