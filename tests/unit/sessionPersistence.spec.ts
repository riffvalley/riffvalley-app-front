import { describe, expect, it } from "vitest";
import { createSessionPersistence, readLegacySessionValue } from "../../src/modules/identity/infrastructure/sessionStorage";

function persistence(values: Record<string, string> = {}) {
  const storage = {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => { values[key] = value; },
    removeItem: (key: string) => { delete values[key]; },
  };
  return { adapter: createSessionPersistence(() => storage), storage, values };
}

describe("session persistence adapter", () => {
  it("restores old scalar fields verbatim, without interpreting token expiry or rewriting roles", () => {
    const { adapter, values } = persistence({ token: "opaque-legacy-token", username: "ana", userId: "7", image: "", roles: " user,superUser " });
    expect(adapter.read()).toEqual({ token: "opaque-legacy-token", username: "ana", userId: "7", image: "", roles: ["user", "superUser"] });
    expect(values.roles).toBe(" user,superUser ");
  });
  it("narrows unexpected JSON role elements without crashing permission consumers", () => {
    const { adapter } = persistence({ roles: '["user",null,17,{}]' });
    expect(adapter.read().roles).toEqual(["user"]);
  });
  it.each(['["riffValley"]', '"riffValley"', "riffValley", "user,riffValley"])("preserves raw roles %s for the existing moderation reader", (raw) => {
    const { storage } = persistence({ roles: raw });
    expect(readLegacySessionValue(() => storage, "roles")).toBe(raw);
  });
  it("preserves the persisted avatar fallback and restricts clear to session keys", () => {
    const { adapter, storage, values } = persistence({ image: "saved-avatar", theme: "dark", dashboardConfig: "[]" });
    expect(readLegacySessionValue(() => storage, "image")).toBe("saved-avatar");
    adapter.clear();
    expect(values).toEqual({ theme: "dark", dashboardConfig: "[]" });
  });
});
