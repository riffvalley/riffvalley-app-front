import { describe, expect, it } from "vitest";
import { hasMinimumRole } from "./permissions";

describe("hasMinimumRole", () => {
  it("preserves the user < collaborator < riffvalley < superadmin hierarchy", () => {
    const roles = ["user", "collaborator", "riffvalley", "superadmin"] as const;

    roles.forEach((role, currentIndex) => {
      roles.forEach((minimumRole, minimumIndex) => {
        expect(hasMinimumRole(role, minimumRole)).toBe(currentIndex >= minimumIndex);
      });
    });
  });

  it("denies missing or unrecognized roles", () => {
    expect(hasMinimumRole(null, "user")).toBe(false);
    expect(hasMinimumRole(undefined, "user")).toBe(false);
    expect(hasMinimumRole("unknown" as never, "user")).toBe(false);
    expect(hasMinimumRole("superadmin", "unknown" as never)).toBe(false);
  });
});
