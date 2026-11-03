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
  | {
      state: "conflict" | "failed";
      message: string;
      operationKey: string;
      technicalDetail?: unknown;
    }
  | { state: "uncertain"; message: string; operationKey: string; technicalDetail?: unknown };

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
    if (error.code === "IMPORT_IDEMPOTENCY_CONFLICT" || error.code === "IMPORT_OPERATION_ID_REUSED")
      return "global";
    return "conflict";
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { code?: unknown } | undefined;
    if (status === 409) {
      if (data?.code === "IMPORT_OPERATION_IN_PROGRESS") return "uncertain";
      if (
        data?.code === "IMPORT_IDEMPOTENCY_CONFLICT" ||
        data?.code === "IMPORT_OPERATION_ID_REUSED"
      )
        return "global";
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
    if (error.code === "IMPORT_OPERATION_IN_PROGRESS")
      return "No sabemos si la operación terminó. Comprueba el resultado reintentando la misma operación.";
    if (error.code === "IMPORT_IDEMPOTENCY_CONFLICT" || error.code === "IMPORT_OPERATION_ID_REUSED")
      return "Esta operación ya no coincide con la solicitud original. No se puede reintentar con datos diferentes.";
    return "El concierto o los artistas cambiaron y la propuesta ya no es válida. Revisa los datos antes de continuar.";
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { code?: unknown } | undefined;
    if (data?.code === "IMPORT_OPERATION_IN_PROGRESS")
      return "No sabemos si la operación terminó. Comprueba el resultado reintentando la misma operación.";
    if (data?.code === "IMPORT_IDEMPOTENCY_CONFLICT" || data?.code === "IMPORT_OPERATION_ID_REUSED")
      return "Esta operación ya no coincide con la solicitud original. No se puede reintentar con datos diferentes.";
    if (status === 400) {
      return "Hay información que debes corregir antes de continuar.";
    }
    if (status === 401) return "La sesión no es válida. Inicia sesión de nuevo para continuar.";
    if (status === 403) return "No tienes permisos para ampliar este lineup.";
    if (status === 404) return "El concierto ya no está disponible. Vuelve a revisar la propuesta.";
    if (status && status >= 500) return "No se pudo completar la operación. Puedes reintentarlo.";
    if (error.response) return "No se pudo completar la operación. Puedes reintentarlo.";
    return "No sabemos si la operación terminó. Comprueba el resultado reintentando la misma operación.";
  }
  if (error instanceof EventLineupExpansionProtocolError)
    return "No sabemos si la operación terminó. Comprueba el resultado reintentando la misma operación.";
  return "No se pudo completar la operación. Puedes reintentarlo.";
}
