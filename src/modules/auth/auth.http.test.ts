import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { configureAuthHttp } from './auth.http';

function unauthorized(config: AxiosRequestConfig): Promise<never> {
  return Promise.reject(new AxiosError('unauthorized', '401', config as never, undefined, {
    status: 401, statusText: 'Unauthorized', headers: {}, config: config as never, data: {},
  }));
}

describe('auth HTTP integration', () => {
  it('attaches the current token and can explicitly skip it', async () => {
    const client = axios.create();
    configureAuthHttp(client, { getAccessToken: () => 'TOKEN', onUnauthorized: vi.fn() });
    client.defaults.adapter = async (config) => ({ data: config.headers.Authorization ?? null, status: 200, statusText: 'OK', headers: {}, config });
    await expect(client.get('/private')).resolves.toMatchObject({ data: 'Bearer TOKEN' });
    await expect(client.post('/login', {}, { auth: { skipAccessToken: true } })).resolves.toMatchObject({ data: null });
  });

  it('does not globally process login 401 responses', async () => {
    const client = axios.create(); const expired = vi.fn();
    configureAuthHttp(client, { getAccessToken: () => 'TOKEN', onUnauthorized: expired });
    client.defaults.adapter = unauthorized;
    await expect(client.post('/login', {}, { auth: { skipAccessToken: true, skipGlobalUnauthorized: true } })).rejects.toBeInstanceOf(Error);
    expect(expired).not.toHaveBeenCalled();
  });

  it('coalesces simultaneous 401 responses', async () => {
    const client = axios.create(); const expired = vi.fn(async () => Promise.resolve());
    configureAuthHttp(client, { getAccessToken: () => 'TOKEN', onUnauthorized: expired });
    client.defaults.adapter = unauthorized;
    await Promise.allSettled([client.get('/one'), client.get('/two')]);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('ignores a late 401 sent with an old token', async () => {
    const client = axios.create(); let token = 'TOKEN-A'; const expired = vi.fn();
    configureAuthHttp(client, { getAccessToken: () => token, onUnauthorized: expired });
    client.defaults.adapter = async (config) => { token = 'TOKEN-B'; return unauthorized(config); };
    await expect(client.get('/late')).rejects.toBeInstanceOf(Error);
    expect(expired).not.toHaveBeenCalled();
  });
});
