import { describe, expect, it } from "vitest";
import {
  canNavigateToArtistPage,
  getArtistManagementPaginationState,
} from "./artistManagementPagination";

describe("Artists Management pagination", () => {
  it("hides pagination when one results page is available", () => {
    expect(getArtistManagementPaginationState(1, 1)).toEqual({
      mode: "hidden",
    });
  });

  it("keeps normal navigation available across multiple pages", () => {
    expect(getArtistManagementPaginationState(1, 3)).toEqual({
      mode: "pages",
    });
    expect(canNavigateToArtistPage(2, 1, 3, false)).toBe(true);
  });

  it("offers page 1 when page 2 becomes out of range", () => {
    expect(getArtistManagementPaginationState(2, 1)).toEqual({
      mode: "recovery",
      page: 1,
    });
    expect(canNavigateToArtistPage(1, 2, 1, false)).toBe(true);
  });

  it("recovers directly to the last valid page when totalPages is greater than 1", () => {
    expect(getArtistManagementPaginationState(5, 2)).toEqual({
      mode: "recovery",
      page: 2,
    });
    expect(canNavigateToArtistPage(2, 5, 2, false)).toBe(true);
  });

  it("keeps the empty state without pagination when there are no results", () => {
    expect(getArtistManagementPaginationState(2, 0)).toEqual({
      mode: "hidden",
    });
    expect(canNavigateToArtistPage(1, 2, 0, false)).toBe(false);
  });

  it("blocks same-page, invalid, and in-flight navigation to prevent duplicate requests", () => {
    expect(canNavigateToArtistPage(2, 2, 3, false)).toBe(false);
    expect(canNavigateToArtistPage(4, 2, 3, false)).toBe(false);
    expect(canNavigateToArtistPage(1, 2, 3, true)).toBe(false);
  });
});
