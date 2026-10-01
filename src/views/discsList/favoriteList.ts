export interface FavoriteListDisc {
  id: string;
}

export function removeFavoriteFromList<T extends FavoriteListDisc>(
  discs: T[],
  discId: string,
  offset: number,
  totalItems: number,
  totalFavorites: string,
) {
  const index = discs.findIndex((disc) => disc.id === discId);
  if (index < 0) return null;

  const nextOffset = Math.max(0, offset - 1);
  const nextTotalItems = Math.max(0, totalItems - 1);
  return {
    discs: [...discs.slice(0, index), ...discs.slice(index + 1)],
    offset: nextOffset,
    totalItems: nextTotalItems,
    totalFavorites: String(Math.max(0, Number(totalFavorites) - 1)),
    hasMore: nextOffset < nextTotalItems,
  };
}
