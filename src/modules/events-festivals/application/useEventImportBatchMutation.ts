import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { artistDirectoryQueryKey } from "@/modules/catalog/artists";
import { venueCatalogQueryKey } from "@/modules/venues";
import {
  ImportBatchProtocolError,
  importEventBatch,
  type ImportBatchResponse,
} from "../api/eventImport";
import type { ImportSnapshot } from "./eventImportPreparation";

const inFlightBatchIds = new Set<string>();

export class EventImportBatchAlreadyInFlightError extends Error {
  constructor() {
    super("Este lote ya se está enviando.");
    this.name = "EventImportBatchAlreadyInFlightError";
  }
}

export function useEventImportBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation<ImportBatchResponse, unknown, ImportSnapshot>({
    mutationFn: async (snapshot) => {
      if (inFlightBatchIds.has(snapshot.batchId)) {
        throw new EventImportBatchAlreadyInFlightError();
      }
      inFlightBatchIds.add(snapshot.batchId);
      try {
        return await importEventBatch(snapshot);
      } finally {
        inFlightBatchIds.delete(snapshot.batchId);
      }
    },
    retry: false,
    onSuccess: async (response) => {
      if (!response.results.some(({ result }) => result.status === "created")) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events-festivals"] }),
        queryClient.invalidateQueries({ queryKey: artistDirectoryQueryKey }),
        queryClient.invalidateQueries({ queryKey: venueCatalogQueryKey }),
      ]);
    },
  });
}

export function eventImportGlobalErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 400)
      return "La petición fue rechazada por su estructura. Revisa los datos preparados.";
    if (status === 401) return "La sesión no es válida. Inicia sesión de nuevo para continuar.";
    if (status === 403) return "No tienes permisos para importar eventos.";
    if (status === 404) return "El servicio de importación no está disponible.";
    if (status && status >= 500)
      return "El servidor no pudo completar la petición. Puedes reintentar el mismo lote.";
    if (error.response) return "No se pudo completar la petición de importación.";
    return "No se recibió respuesta. Puedes reintentar el mismo lote con la misma identidad.";
  }
  if (error instanceof Error && error.name === "ImportBatchProtocolError") {
    return "La respuesta del servidor no coincide con las filas enviadas. No se ha confirmado ninguna fila.";
  }
  return "No se pudo completar la importación.";
}

export function eventImportErrorCanRetry(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    return !status || status >= 500;
  }
  return error instanceof ImportBatchProtocolError || error instanceof Error;
}
