import { describe, expect, it } from "vitest";
import { lineupNameCacheKey, splitLineupNames } from "./lineupText";

describe("lineup text helpers", () => {
  it("splits on plus, trims outer spaces, drops empty segments, and preserves order", () => {
    expect(splitLineupNames("  Architects  + Spiritbox ++  + Loathe ")).toEqual([
      "Architects",
      "Spiritbox",
      "Loathe",
    ]);
  });

  it("normalizes equivalent artist names for request caching", () => {
    expect(lineupNameCacheKey("  Spiritbox ")).toBe(lineupNameCacheKey("spiritbox"));
    expect(lineupNameCacheKey("Bury   Tomorrow")).toBe(lineupNameCacheKey("bury tomorrow"));
  });
});
