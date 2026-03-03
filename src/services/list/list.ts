import api from "@services/api/api.ts";

export async function postList(payload: any): Promise<void> {
  const response = await api.post("/lists", payload);
  return response.data;
}

export async function getListDetails(listId: string): Promise<any> {
  const response = await api.get<any>(`/lists/${listId}`); // Usamos la ruta correcta para obtener un detalle específico
  return response.data;
}

export async function updateList(id: string, data: any): Promise<any> {
  const response = await api.patch(`/lists/${id}`, data);
  return response.data;
}

export async function getLists(
  limit?: number,
  offset?: number,
  statusExclusions?: string[] // Nuevo parámetro para excluir estados
): Promise<any> {
  const response = await api.get<any>("/lists", {
    params: { limit, offset, statusExclusions }, // Agregar statusExclusions como parámetro
  });
  return response.data;
}

// Obtener listas semanales actuales
export async function getCurrentWeeklyLists(): Promise<any> {
  const response = await api.get<any>("/lists/weekly/current");
  return response.data;
}

// Obtener listas semanales pasadas por año y mes
export async function getPastWeeklyLists(year: number, month: number): Promise<any> {
  const response = await api.get<any>(`/lists/weekly/past/${year}/${month}`);
  return response.data;
}

// Obtener listas mensuales actuales
export async function getCurrentMonthlyLists(): Promise<any> {
  const response = await api.get<any>("/lists/month/current");
  return response.data;
}

// Obtener listas mensuales pasadas por año
export async function getPastMonthlyLists(year: number): Promise<any> {
  const response = await api.get<any>(`/lists/month/past/${year}`);
  return response.data;
}

// Obtener listas especiales
export async function getSpecialLists(): Promise<any> {
  const response = await api.get<any>("/lists/special");
  return response.data;
}

export async function deleteList(id: string): Promise<void> {
  await api.delete(`/lists/${id}`);
}

// Obtener listas de video actuales
export async function getCurrentVideoLists(): Promise<any> {
  const response = await api.get<any>("/lists/video/current");
  return response.data;
}

// Obtener listas de video pasadas por año
export async function getPastVideoLists(year: number): Promise<any> {
  const response = await api.get<any>(`/lists/video/past/${year}`);
  return response.data;
}
