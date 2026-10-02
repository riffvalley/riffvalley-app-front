// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SpotifyFestivalsKanban from '../../../../src/views/spotify/SpotifyFestivalsKanban.vue';
import {
  festivalPlaylistLifecycleKey,
  festivalPlaylistRegistrationsKey,
} from '../../../../src/modules/editorial';

const mocks = vi.hoisted(() => ({
  getFestivalRegistrations: vi.fn(),
  deleteFestivalRegistration: vi.fn(),
  getUsersRv: vi.fn(),
  getSpotifyConnection: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  hasRole: vi.fn(),
}));

vi.mock('@services/auth/auth', () => ({ getUsersRv: mocks.getUsersRv }));
vi.mock('@services/swal/SwalService', () => ({
  default: { confirm: mocks.confirm, success: mocks.success, error: mocks.error },
}));
vi.mock('@services/spotify/spotify', () => ({
  createSpotifyContent: vi.fn(),
}));
vi.mock('@services/spotify/festivalPlaylists', () => ({
  connectSpotify: vi.fn(),
  disconnectSpotify: vi.fn(),
  getSpotifyConnection: mocks.getSpotifyConnection,
}));
vi.mock('@stores/auth/auth', () => ({
  useAuthStore: () => ({ hasRole: mocks.hasRole }),
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}));

const festival = {
  id: 'festival-1',
  name: 'Festival',
  status: 'in_progress',
  link: '',
  type: 'festival',
  updateDate: '2026-10-02',
  createdAt: '2026-10-01',
  updatedAt: '2026-10-02',
  content: null,
};

afterEach(() => vi.clearAllMocks());

async function mountBoard() {
  mocks.getFestivalRegistrations.mockResolvedValue([festival]);
  mocks.getUsersRv.mockResolvedValue([]);
  mocks.getSpotifyConnection.mockResolvedValue({
    connected: false,
    spotifyUserId: null,
    displayName: null,
    canUploadImages: false,
    missingScopes: [],
    authorizationStatus: 'disconnected',
    reauthorizationRequired: false,
    reauthorizationReason: null,
    authorizedAt: null,
    refreshTokenExpiresAt: null,
    daysUntilReauthorization: null,
  });
  mocks.hasRole.mockReturnValue(true);
  const wrapper = mount(SpotifyFestivalsKanban, {
    global: {
      provide: {
        [festivalPlaylistRegistrationsKey as symbol]: {
          getFestivalRegistrations: mocks.getFestivalRegistrations,
        },
        [festivalPlaylistLifecycleKey as symbol]: {
          deleteFestivalRegistration: mocks.deleteFestivalRegistration,
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('Festival registration deletion', () => {
  it('keeps the registration when the confirmation is cancelled', async () => {
    mocks.confirm.mockResolvedValue({ isConfirmed: false });
    const wrapper = await mountBoard();
    await wrapper.get('nav[aria-label="Secciones de festivales"] button:nth-child(2)').trigger('click');

    await wrapper.find('button[title="Eliminar registro antiguo"]').trigger('click');
    await flushPromises();

    expect(mocks.deleteFestivalRegistration).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Festival');
  });

  it('preserves the registration and shows the legacy message when deletion fails', async () => {
    mocks.confirm.mockResolvedValue({ isConfirmed: true });
    mocks.deleteFestivalRegistration.mockRejectedValue(new Error('delete failed'));
    const wrapper = await mountBoard();
    await wrapper.get('nav[aria-label="Secciones de festivales"] button:nth-child(2)').trigger('click');

    await wrapper.find('button[title="Eliminar registro antiguo"]').trigger('click');
    await flushPromises();

    expect(mocks.deleteFestivalRegistration).toHaveBeenCalledWith('festival-1');
    expect(mocks.error).toHaveBeenCalledWith('No se pudo eliminar el festival');
    expect(wrapper.text()).toContain('Festival');
  });
});
