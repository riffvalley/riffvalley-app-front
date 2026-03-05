import api from "@services/api/api.ts";

/**
 * Envia datos manuales para ser procesados en el backend.
 * @param date Fecha en formato MM-DD-YYYY.
 * @param albums Lista de álbumes.
 */
export async function fetchManualData(date: string, albums: string[]) {
  try {
    const response = await api.post(`/scraping/process-manual-data`, {
      date,
      albums,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Error processing data');
    } else {
      throw new Error('Network error or server is unreachable');
    }
  }
}

/**
 * Descarga la plantilla Excel para importar discos.
 */
export async function downloadDiscTemplate(): Promise<Blob> {
  const response = await api.get('/excel/template/download', {
    responseType: 'blob',
  });
  return response.data;
}

export interface ImportResult {
  created: number;
  errors: { row: number; disc: string; artist: string; error: string }[];
}

/**
 * Sube un archivo Excel con discos para importar.
 */
export async function uploadDiscFile(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ImportResult>('/excel/template/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
