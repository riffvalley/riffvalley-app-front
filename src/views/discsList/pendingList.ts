export interface PendingListDisc {
  id: string;
}

export function removePendingFromList<T extends PendingListDisc>(
  discs: T[],
  discId: string,
  offset: number,
  totalItems: number,
  totalPendings: string,
) {
  const index = discs.findIndex((disc) => disc.id === discId);
  if (index < 0) return null;

  const nextOffset = Math.max(0, offset - 1);
  const nextTotalItems = Math.max(0, totalItems - 1);
  return {
    discs: [...discs.slice(0, index), ...discs.slice(index + 1)],
    offset: nextOffset,
    totalItems: nextTotalItems,
    totalPendings: String(Math.max(0, Number(totalPendings) - 1)),
    hasMore: nextOffset < nextTotalItems,
  };
}

export function isCurrentPendingListResponse(requestVersion: number, currentVersion: number): boolean {
  return requestVersion === currentVersion;
}
