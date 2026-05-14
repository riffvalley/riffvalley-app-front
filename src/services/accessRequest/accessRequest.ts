import api from '@services/api/api';

export interface AccessRequestDto {
  email: string;
  alias: string;
}

export async function sendAccessRequest(dto: AccessRequestDto): Promise<void> {
  await api.post('/access-requests', dto);
}
