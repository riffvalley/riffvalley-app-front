import type { Session, SessionPersistence } from "../application/session";

export type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createSessionPersistence(getStorage: () => SessionStorage): SessionPersistence {
  function readRoles(): string[] {
    const raw = getStorage().getItem("roles");
    if (!raw) return [];
    try {
      const value: unknown = JSON.parse(raw);
      return Array.isArray(value) ? value.filter((role): role is string => typeof role === "string") : [];
    } catch {
      if (raw.includes("[") || raw.includes("{")) return [];
      return raw.split(",").map((role) => role.trim()).filter(Boolean);
    }
  }
  return {
    read: () => ({
      token: getStorage().getItem("token"), username: getStorage().getItem("username"),
      userId: getStorage().getItem("userId"), image: getStorage().getItem("image"), roles: readRoles(),
    }),
    write(session: Session) {
      const storage = getStorage();
      storage.setItem("token", session.token ?? "");
      storage.setItem("username", session.username ?? "");
      storage.setItem("userId", session.userId ?? "");
      storage.setItem("image", session.image || "");
      storage.setItem("roles", JSON.stringify(session.roles));
    },
    writeImage: (image) => getStorage().setItem("image", image || ""),
    clear() {
      for (const key of ["token", "username", "userId", "image", "roles"]) getStorage().removeItem(key);
    },
  };
}

/** Raw compatibility reads for consumers whose legacy interpretation differs from auth. */
export function readLegacySessionValue(getStorage: () => SessionStorage, key: "roles" | "image"): string | null {
  return getStorage().getItem(key);
}
