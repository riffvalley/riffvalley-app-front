import api from '@/services/api/api';
import type { AuthSession, LoginCredentials } from '../model/auth.types';
import type { LoginResponseDto } from './auth.dto';
import { mapLoginResponse } from '../model/auth.mapper';

export async function requestLogin(credentials: LoginCredentials): Promise<AuthSession> {
  const response = await api.post<LoginResponseDto>('/auth/login', credentials, {
    authMeta: { skipAccessToken: true, skipGlobalUnauthorized: true },
  });
  return mapLoginResponse(response.data);
}
