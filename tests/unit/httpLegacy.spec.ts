import { expect, it, vi } from "vitest";
import { AxiosError } from "axios";
const session = { token: "old-token", version: 0, logout: vi.fn(), push: vi.fn() };
import api from "../../src/services/api/api";
import { configureHttpSession } from "../../src/shared/infrastructure/http/client";

it("legacy HTTP attaches restored token, clears session and navigates on 401 while rejecting", async () => {
  configureHttpSession({ getToken: () => session.token, getSessionVersion: () => session.version,
    onUnauthorized: () => { session.logout(); session.push({ name: "Login" }); } });
  api.defaults.adapter = async (config) => {
    expect(config.headers.Authorization).toBe("Bearer old-token");
    throw new AxiosError("unauthorized", "ERR_BAD_REQUEST", config, undefined,
      { status: 401, statusText: "Unauthorized", headers: {}, config, data: {} });
  };
  await expect(api.get("/protected")).rejects.toThrow("unauthorized");
  expect(session.logout).toHaveBeenCalledTimes(1);
  expect(session.push).toHaveBeenCalledWith({ name: "Login" });
});
