import type { ArtistManagementDisc } from "@/modules/catalog";
import { loadCommunityVotes } from "@/app/dependencies/community";
import type { LegacyDiscCardSelection } from "@views/artists/artistManagementCommunityBridge";

/** Keeps the Artist Management legacy card contract while Community owns vote reads. */
export async function loadLegacyDiscCard(
  disc: ArtistManagementDisc,
  artistName: string,
  userId: string,
): Promise<LegacyDiscCardSelection> {
  try {
    const votes = await loadCommunityVotes(userId, disc.id);
    const ownVote = votes.find((vote) => vote.user.id === userId);
    return {
      ...disc,
      artistName,
      userDiscRate: ownVote?.id ?? null,
      rate: ownVote?.rate ?? null,
      cover: ownVote?.cover ?? null,
    };
  } catch {
    return { ...disc, artistName, userDiscRate: null, rate: null, cover: null };
  }
}
export type { LegacyDiscCardSelection } from "@views/artists/artistManagementCommunityBridge";
