import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
vi.mock("@/services/api/api", () => ({ default: { post } }));

import { requestPasswordReset, resetPassword } from "./passwordRecovery";

describe("password recovery API", () => {
  beforeEach(() => post.mockReset());

  it("requests a neutral recovery email using the shared API client", async () => {
    post.mockResolvedValue({ status: 202 });

    await requestPasswordReset("mara@example.com");

    expect(post).toHaveBeenCalledWith("/auth/forgot-password", { email: "mara@example.com" });
  });

  it("sends the token and new password and accepts the no-content response", async () => {
    post.mockResolvedValue({ status: 204 });

    await resetPassword({ token: "a".repeat(43), password: "Strong1" });

    expect(post).toHaveBeenCalledWith("/auth/reset-password", {
      token: "a".repeat(43),
      password: "Strong1",
    });
  });

  it("rejects successful HTTP statuses that do not match the recovery contract", async () => {
    post.mockResolvedValue({ status: 200 });
    await expect(requestPasswordReset("mara@example.com")).rejects.toThrow(
      "Unexpected password recovery response"
    );
    await expect(resetPassword({ token: "token", password: "Strong1" })).rejects.toThrow(
      "Unexpected password reset response"
    );
  });
});
