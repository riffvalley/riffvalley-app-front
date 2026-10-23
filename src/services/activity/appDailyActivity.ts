import api from "@services/api/api";

export function notifyAppDailyActivity(): void {
  try {
    void api.post("/activity/app/daily").catch(() => undefined);
  } catch {
    // Activity capture is best effort and must not affect authentication.
  }
}
