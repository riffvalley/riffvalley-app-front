import { describe, expect, it, vi } from "vitest";
import { readAndRemoveResetTokenFragment } from "./readResetToken";

describe("readAndRemoveResetTokenFragment", () => {
  it("captures the token and replaces the current URL without the fragment", () => {
    const replaceState = vi.fn();
    const history = { state: { page: 1 }, replaceState };

    const token = readAndRemoveResetTokenFragment(
      { hash: "#token=abc%2B123", pathname: "/reset-password", search: "?source=email" },
      history,
      "Riff Valley"
    );

    expect(token).toBe("abc+123");
    expect(replaceState).toHaveBeenCalledOnce();
    expect(replaceState).toHaveBeenCalledWith(
      { page: 1 },
      "Riff Valley",
      "/reset-password?source=email"
    );
  });

  it("returns null when the token is absent and still removes the whole fragment", () => {
    const replaceState = vi.fn();

    expect(
      readAndRemoveResetTokenFragment(
        { hash: "#other=value", pathname: "/reset-password", search: "" },
        { state: null, replaceState },
        "Riff Valley"
      )
    ).toBeNull();
    expect(replaceState).toHaveBeenCalledWith(null, "Riff Valley", "/reset-password");
  });
});
