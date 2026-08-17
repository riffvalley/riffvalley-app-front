import api from '@/services/api/api';
import type { LoginCredentials } from '../model/auth.types';
import type { LoginResponseDto } from './auth.dto';
import { mapLoginResponse, type LoginBootstrapResult } from '../model/auth.mapper';

export async function requestLogin(credentials: LoginCredentials): Promise<LoginBootstrapResult> {
  const response = await api.post<LoginResponseDto>('/auth/login', credentials, {
    authMeta: { skipAccessToken: true, skipGlobalUnauthorized: true },
  });
  return mapLoginResponse(response.data);
}
