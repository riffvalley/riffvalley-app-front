import type { TopRankedDisc } from "../types/topDiscs";

export interface TopDiscsSections {
  featured: TopRankedDisc[];
  secondary: TopRankedDisc[];
}

/** Keeps backend order within each group and never promotes unrated discs to the podium. */
export function separateTopDiscs(discs: TopRankedDisc[]): TopDiscsSections {
  const voted = discs.filter((disc) => disc.voteCount > 0);
  const unrated = discs.filter((disc) => disc.voteCount === 0);

  return {
    featured: voted.slice(0, 3),
    secondary: [...voted.slice(3), ...unrated],
  };
}
