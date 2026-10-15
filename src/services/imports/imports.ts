import api from "@services/api/api.ts";

export interface AlbumEntry {
  line: string;
  genreId?: string;
  countryId?: string;
  ep?: boolean;
  debut?: boolean;
}

export type CatalogImportResultStatus = "imported" | "duplicate" | "failed";

export type CatalogImportFailureReasonCode =
  "INVALID_INPUT" | "RE_RELEASE" | "REFERENCE_NOT_FOUND" | "PERSISTENCE_FAILED";

export type CatalogImportResultSource =
  | { kind: "manual"; inputLine?: string }
  | { kind: "excel"; sheet: string; rowNumber: number };

interface CatalogImportResultBase {
  inputIndex: number;
  source: CatalogImportResultSource;
  artistName?: string;
  discName?: string;
  message: string;
}

export interface CatalogImportImportedResult extends CatalogImportResultBase {
  status: "imported";
  artistName: string;
  discName: string;
  artistId: string;
  discId: string;
}

export interface CatalogImportDuplicateResult extends CatalogImportResultBase {
  status: "duplicate";
  artistName: string;
  discName: string;
  artistId: string;
  discId: string;
}

export interface CatalogImportFailedResult extends CatalogImportResultBase {
  status: "failed";
  reasonCode: CatalogImportFailureReasonCode;
  artistId?: string;
  discId?: string;
}

export type CatalogImportResultItem =
  | CatalogImportImportedResult
  | CatalogImportDuplicateResult
  | CatalogImportFailedResult;

export interface CatalogImportResultsData {
  results: CatalogImportResultItem[];
}

export interface ManualImportResponse {
  message: string;
  data: CatalogImportResultsData;
}

export interface ExcelImportResponse {
  data: CatalogImportResultsData;
}

function hasCatalogImportResults(
  response: unknown,
): response is { data: CatalogImportResultsData } {
  return (
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    typeof response.data === "object" &&
    response.data !== null &&
    "results" in response.data &&
    Array.isArray(response.data.results)
  );
}

const SAFE_SYSTEMIC_IMPORT_MESSAGES = new Set([
  "No se pudo completar la importación. Los discos confirmados antes del fallo se conservan.",
  "No se pudo completar la importación del archivo. Los resultados confirmados antes del fallo se conservan.",
]);

const PARTIAL_IMPORT_WARNING =
  "Algunos registros anteriores pueden haberse guardado. Comprueba el catálogo antes de volver a importar.";

export function getCatalogImportGlobalErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          status?: unknown;
          data?: { message?: unknown };
        };
      }
    ).response;
    const message = response?.data?.message;

    if (typeof message === "string") {
      if (SAFE_SYSTEMIC_IMPORT_MESSAGES.has(message)) {
        return `${message} ${PARTIAL_IMPORT_WARNING}`;
      }
      if (
        typeof response?.status === "number" &&
        response.status >= 400 &&
        response.status < 500
      ) {
        return message;
      }
    }
  }

  return "No se pudo completar la importación. Comprueba el catálogo antes de volver a intentarlo.";
}

export async function fetchManualData(
  date: string,
  albums: AlbumEntry[],
): Promise<ManualImportResponse> {
  const response = await api.post<ManualImportResponse>(
    "/catalog/import/manual",
    { date, albums },
  );
  if (
    !hasCatalogImportResults(response.data) ||
    typeof (response.data as ManualImportResponse).message !== "string"
  ) {
    throw new Error("Invalid catalog import response");
  }
  return response.data as ManualImportResponse;
}

/**
 * Descarga la plantilla Excel para importar discos.
 */
export async function downloadDiscTemplate(): Promise<Blob> {
  const response = await api.get("/catalog/import/excel/template", {
    responseType: "blob",
  });
  return response.data;
}

/**
 * Sube un archivo Excel con discos para importar.
 */
export async function uploadDiscFile(file: File): Promise<ExcelImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<ExcelImportResponse>(
    "/catalog/import/excel",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  if (!hasCatalogImportResults(response.data)) {
    throw new Error("Invalid catalog import response");
  }
  return response.data as ExcelImportResponse;
}
