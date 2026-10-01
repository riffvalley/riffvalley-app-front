import type { ArtistManagementDisc } from "@/modules/catalog";
import { loadCommunityVotes } from "@/app/dependencies/community";
import type { CommunityArtistManagementDisc } from "@/app/dependencies/communityArtistManagement";

export interface LegacyDiscCardSelection extends ArtistManagementDisc {
  artistName: string;
  userDiscRate: string | null;
  rate: number | null;
  cover: number | null;
  averageRate: number;
  rateCount: number;
}

/** Keeps the Artist Management legacy card contract while Community owns vote reads. */
export async function loadLegacyDiscCard(
  disc: CommunityArtistManagementDisc,
  artistName: string,
  userId: string,
): Promise<LegacyDiscCardSelection> {
  try {
    const votes = await loadCommunityVotes(userId, disc.id);
    const ownVote = votes.find((vote) => vote.user.id === userId);
    return {
      ...disc,
      averageRate: disc.communityRating.averageRate,
      rateCount: disc.communityRating.rateCount,
      artistName,
      userDiscRate: ownVote?.id ?? null,
      rate: ownVote?.rate ?? null,
      cover: ownVote?.cover ?? null,
    };
  } catch {
    return {
      ...disc,
      averageRate: disc.communityRating.averageRate,
      rateCount: disc.communityRating.rateCount,
      artistName,
      userDiscRate: null,
      rate: null,
      cover: null,
    };
  }
}
