import api from "@services/api/api.ts";

export interface AlbumEntry {
  line: string;
  genreId?: string;
  countryId?: string;
  ep?: boolean;
  debut?: boolean;
}

export async function fetchManualData(date: string, albums: AlbumEntry[]) {
  try {
    const response = await api.post(`/scraping/process-manual-data`, { date, albums });
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
