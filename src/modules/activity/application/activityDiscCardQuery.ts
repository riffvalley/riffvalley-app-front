import { getDiscById } from "@services/discs/discs";
import { getDiscRates } from "@services/rates/rates";
import type { ActivityDiscDetails } from "./activityDiscCard";

export interface ActivityDiscCardSession {
  authStatus: string;
  isAuthenticated: boolean;
  userId: string | null;
  authSessionGeneration: number;
}

export const activityDiscCardStaleTime = 60_000;

export function activityDiscCardQueryKey(
  discId: string,
  userId: string | null,
  authSessionGeneration: number,
) {
  return ["activity", "disc-card", discId, userId, authSessionGeneration] as const;
}

export async function fetchActivityDiscCard(
  discId: string,
  userId: string | null,
  sessionGeneration: number,
  session: ActivityDiscCardSession,
  signal: AbortSignal,
) {
  if (
    !userId ||
    session.authStatus !== "authenticated" ||
    !session.isAuthenticated ||
    session.userId !== userId ||
    session.authSessionGeneration !== sessionGeneration
  ) {
    throw new Error("La sesión ya no está disponible.");
  }

  const [disc, rates] = await Promise.all([
    getDiscById(discId, signal),
    getDiscRates(discId, signal),
  ]);

  if (
    signal.aborted ||
    session.authStatus !== "authenticated" ||
    !session.isAuthenticated ||
    session.userId !== userId ||
    session.authSessionGeneration !== sessionGeneration
  ) {
    throw new Error("La sesión cambió antes de completar la ficha.");
  }
  return { disc: disc as ActivityDiscDetails, rates, userId };
}
