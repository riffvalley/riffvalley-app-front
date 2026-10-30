import { describe, expect, it } from "vitest";
import type { TopRankedDisc } from "../types/topDiscs";
import { separateTopDiscs } from "./separateTopDiscs";

function disc(id: string, voteCount: number): TopRankedDisc {
  return {
    id,
    name: id,
    description: "",
    image: `${id}.jpg`,
    releaseDate: "2026-01-01",
    artist: { id: `artist-${id}`, name: `Artist ${id}`, description: "", image: "" },
    verified: true,
    voteCount,
    averageRate: voteCount > 0 ? 0 : null,
    weightedScore: voteCount > 0 ? 0 : null,
  };
}

describe("separateTopDiscs", () => {
  it.each([
    { voted: 11, unrated: 0, featured: 3, secondary: 8 },
    { voted: 8, unrated: 3, featured: 3, secondary: 8 },
    { voted: 2, unrated: 5, featured: 2, secondary: 5 },
    { voted: 0, unrated: 5, featured: 0, secondary: 5 },
  ])("separates $voted voted and $unrated unrated discs", ({ voted, unrated, featured, secondary }) => {
    const votedDiscs = Array.from({ length: voted }, (_, index) => disc(`voted-${index}`, 1));
    const unratedDiscs = Array.from({ length: unrated }, (_, index) => disc(`pinned-${index}`, 0));
    const result = separateTopDiscs([...votedDiscs, ...unratedDiscs]);

    expect(result.featured).toEqual(votedDiscs.slice(0, 3));
    expect(result.featured).toHaveLength(featured);
    expect(result.secondary).toEqual([...votedDiscs.slice(3), ...unratedDiscs]);
    expect(result.secondary).toHaveLength(secondary);
    expect(new Set([...result.featured, ...result.secondary].map(({ id }) => id)).size)
      .toBe(voted + unrated);
  });

  it("keeps a valid zero average among voted discs and an empty result stays empty", () => {
    const zeroRated = disc("zero-rated", 1);
    expect(zeroRated.averageRate).toBe(0);
    expect(separateTopDiscs([zeroRated])).toEqual({ featured: [zeroRated], secondary: [] });
    expect(separateTopDiscs([])).toEqual({ featured: [], secondary: [] });
  });
});
