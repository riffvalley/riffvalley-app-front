import { beforeEach, describe, expect, it } from 'vitest';
import api from '@/services/api/api';
import { configureAuthHttp } from '@/modules/auth';
import { getDashboardPreferences, patchDashboardPreferences } from './preferences';

describe('dashboard preferences API', () => {
  beforeEach(() => {
    api.defaults.adapter = async (config) => ({
      data: {
        method: config.method,
        url: config.url,
        payload: config.data ? JSON.parse(config.data) : undefined,
        authorization: config.headers.Authorization,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });
  });

  it('loads preferences through the shared authenticated Axios client', async () => {
    configureAuthHttp(api, { getAccessToken: () => 'TOKEN', onUnauthorized: () => undefined });
    await expect(getDashboardPreferences()).resolves.toMatchObject({
      method: 'get',
      url: '/dashboard/preferences',
      authorization: 'Bearer TOKEN',
    });
  });

  it('patches both complete preference arrays', async () => {
    const preferences = {
      dashboardConfig: [{ id: 'desktop', enabled: true }],
      mobileDashboardConfig: [{ id: 'mobile', enabled: false }],
    };
    let request: { method?: string; url?: string; payload?: unknown } | undefined;
    api.defaults.adapter = async (config) => {
      request = {
        method: config.method,
        url: config.url,
        payload: config.data ? JSON.parse(config.data) : undefined,
      };
      return { data: undefined, status: 204, statusText: 'No Content', headers: {}, config };
    };
    await patchDashboardPreferences(preferences);
    expect(request).toEqual({ method: 'patch', url: '/dashboard/preferences', payload: preferences });
  });
});
