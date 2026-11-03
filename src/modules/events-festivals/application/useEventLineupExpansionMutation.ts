import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { artistDirectoryQueryKey } from "@/modules/catalog/artists";
import { existingEventDetailQueryKeys } from "../api/eventImport";
import { entityResolutionQueryKeys } from "./entityResolutionQueries";
import {
  EventLineupExpansionConflictError,
  EventLineupExpansionProtocolError,
  importEventLineupExpansion,
  type EventLineupExpansionResponse,
} from "../api/eventLineupExpansion";
import type { LineupExpansionSnapshot } from "./eventLineupExpansionPreparation";

export type EventLineupExpansionExecution =
  | { state: "invalid"; message: string }
  | { state: "sending" }
  | {
      state: "updated";
      result: EventLineupExpansionResponse;
      reconciliation: "removed" | "kept" | "already-handled";
    }
  | { state: "conflict" | "failed"; message: string; operationKey: string }
  | { state: "uncertain"; message: string; operationKey: string };

const inFlightExpansions = new Set<string>();
const authorizations = new WeakSet<object>();
const authorizationSecret: unique symbol = Symbol("confirmed-lineup-expansion");

export interface ConfirmedLineupExpansion {
  readonly snapshot: LineupExpansionSnapshot;
  readonly confirmationSignature: string;
  readonly [authorizationSecret]: true;
}

export function authorizeLineupExpansion(
  snapshot: LineupExpansionSnapshot,
  confirmationSignature: string
): ConfirmedLineupExpansion {
  if (!confirmationSignature) throw new Error("La propuesta no tiene confirmación vigente.");
  const authorization = Object.freeze({
    snapshot,
    confirmationSignature,
    [authorizationSecret]: true as const,
  });
  authorizations.add(authorization);
  return authorization;
}

export class EventLineupExpansionAlreadyInFlightError extends Error {
  constructor() {
    super("Esta ampliación ya se está enviando.");
    this.name = "EventLineupExpansionAlreadyInFlightError";
  }
}

export function useEventLineupExpansionMutation() {
  const queryClient = useQueryClient();

  return useMutation<EventLineupExpansionResponse, unknown, ConfirmedLineupExpansion>({
    mutationFn: async (authorization) => {
      if (!authorizations.has(authorization)) {
        throw new Error("La ampliación debe contar con autorización explícita.");
      }
      const { snapshot } = authorization;
      const key = JSON.stringify([
        snapshot.eventId,
        snapshot.operation.batchId,
        snapshot.operation.rowId,
      ]);
      if (inFlightExpansions.has(key)) throw new EventLineupExpansionAlreadyInFlightError();
      inFlightExpansions.add(key);
      try {
        return await importEventLineupExpansion(snapshot);
      } finally {
        inFlightExpansions.delete(key);
      }
    },
    retry: false,
    onSuccess: async (_response, authorization) => {
      const { eventId } = authorization.snapshot;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: existingEventDetailQueryKeys.detail(eventId) }),
        queryClient.invalidateQueries({ queryKey: existingEventDetailQueryKeys.lineup(eventId) }),
        queryClient.invalidateQueries({ queryKey: artistDirectoryQueryKey }),
        queryClient.invalidateQueries({ queryKey: entityResolutionQueryKeys.artistsRoot }),
      ]);
    },
  });
}

export type LineupExpansionFailureKind = "conflict" | "global" | "uncertain";

export function lineupExpansionFailureKind(error: unknown): LineupExpansionFailureKind {
  if (error instanceof EventLineupExpansionConflictError) {
    if (error.code === "IMPORT_OPERATION_IN_PROGRESS") return "uncertain";
    if (error.code === "IMPORT_OPERATION_ID_REUSED") return "global";
    return "conflict";
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 409) {
      const data = error.response?.data as { code?: unknown } | undefined;
      if (data?.code === "IMPORT_OPERATION_IN_PROGRESS") return "uncertain";
      if (data?.code === "IMPORT_OPERATION_ID_REUSED") return "global";
      return "conflict";
    }
    if (!status || status >= 500) return "uncertain";
    return "global";
  }
  if (error instanceof EventLineupExpansionProtocolError) return "uncertain";
  return "global";
}

export function lineupExpansionErrorMessage(error: unknown): string {
  if (error instanceof EventLineupExpansionConflictError) {
    const details = error.details as { conflicts?: unknown; candidates?: unknown } | undefined;
    const structured = details?.conflicts ?? details?.candidates;
    return `${error.code ? `${error.code}: ` : ""}${error.message}${structured ? ` · Detalle: ${JSON.stringify(structured)}` : ""}`;
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 400) {
      const data = error.response?.data as
        { code?: unknown; message?: unknown; errors?: unknown } | undefined;
      const code = typeof data?.code === "string" ? `${data.code}: ` : "";
      const message =
        typeof data?.message === "string"
          ? data.message
          : "El backend rechazó la estructura del snapshot confirmado.";
      const errors = data?.errors ? ` · Detalle: ${JSON.stringify(data.errors)}` : "";
      return `${code}${message}${errors}`;
    }
    if (status === 401) return "La sesión no es válida. Inicia sesión de nuevo para continuar.";
    if (status === 403) return "No tienes permisos para ampliar este lineup.";
    if (status === 404) return "El evento confirmado ya no está disponible.";
    if (status && status >= 500) return "El servidor no confirmó el resultado de la ampliación.";
    if (error.response) return "No se pudo completar la ampliación.";
    return "No se recibió respuesta. El servidor podría haber aplicado la ampliación.";
  }
  if (error instanceof EventLineupExpansionProtocolError) return error.message;
  return "No se pudo completar la ampliación.";
}
