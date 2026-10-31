import { describe, expect, it } from "vitest";
import { getPasswordValidationError } from "./passwordValidation";

describe("password reset password policy", () => {
  it("accepts the backend's number or symbol policy", () => {
    expect(getPasswordValidationError("Strong1")).toBeNull();
    expect(getPasswordValidationError("Strong!")).toBeNull();
    expect(getPasswordValidationError(".Strong1")).toBeNull();
  });

  it.each(["Short", "strong1", "STRONG1", "Strong", "Strong1" + "a".repeat(44)])(
    "rejects an invalid password (%s)",
    (password) => {
      expect(getPasswordValidationError(password)).not.toBeNull();
    }
  );
});
