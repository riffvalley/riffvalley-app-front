import api from "@services/api/api.ts";

export async function postAsignationService(payload: any): Promise<void> {
  const response = await api.post("/asignations", payload);
  return response.data;
}

export async function getAsignationsByListService(listId: string): Promise<void> {
  const response = await api.get<any>(`/asignations/list/${listId}`); // Usamos la ruta correcta para obtener un detalle específico
  return response.data;
}

export async function deleteAsignationService(id: string): Promise<void> {
  await api.delete(`/asignations/${id}`);
}

export async function updateAsignationService(
  id: string,
  data: {
    done?: boolean;
    userId?: string;
  }
): Promise<void> {
  await api.patch(`/asignations/${id}`, data);
}
