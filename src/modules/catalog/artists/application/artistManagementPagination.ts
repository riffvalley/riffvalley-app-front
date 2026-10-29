export type ArtistManagementPaginationState =
  { mode: "hidden" } | { mode: "pages" } | { mode: "recovery"; page: number };

export function getArtistManagementPaginationState(
  currentPage: number,
  totalPages: number,
): ArtistManagementPaginationState {
  if (totalPages <= 0) return { mode: "hidden" };
  if (currentPage > totalPages) {
    return { mode: "recovery", page: totalPages };
  }
  if (totalPages > 1) return { mode: "pages" };
  return { mode: "hidden" };
}

export function canNavigateToArtistPage(
  page: number,
  currentPage: number,
  totalPages: number,
  loading: boolean,
): boolean {
  return !loading && page >= 1 && page <= totalPages && page !== currentPage;
}
