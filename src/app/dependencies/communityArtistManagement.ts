import type {
  ArtistManagementDisc,
  ArtistManagementItem,
  ArtistManagementMatch,
} from "@/modules/catalog";

export interface CommunityRatingSummary {
  rateCount: number;
  averageRate: number;
}

export interface CommunityArtistManagementDisc extends ArtistManagementDisc {
  communityRating: CommunityRatingSummary;
}

export type CommunityArtistManagementItem = ArtistManagementItem<CommunityArtistManagementDisc>;
export type CommunityArtistManagementMatch = ArtistManagementMatch<CommunityArtistManagementDisc>;

function numeric(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function addCommunityRatingSummary<TItem extends { discs: ArtistManagementDisc[] }>(
  item: TItem,
): Omit<TItem, "discs"> & { discs: CommunityArtistManagementDisc[] } {
  return {
    ...item,
    discs: item.discs.map((disc) => {
      const transport = disc as unknown as Record<string, unknown>;
      const catalogDisc = { ...disc } as unknown as Record<string, unknown>;
      delete catalogDisc.rateCount;
      delete catalogDisc.averageRate;
      return {
        ...catalogDisc,
        communityRating: {
          rateCount: numeric(transport.rateCount),
          averageRate: numeric(transport.averageRate),
        },
      } as unknown as CommunityArtistManagementDisc;
    }),
  };
}
