// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SuggestionsPage from '../../../../src/views/suggestions/SuggestionsPage.vue';

const { get, post, success, error } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@services/api/api.ts', () => ({ default: { get, post } }));
vi.mock('@services/swal/SwalService', () => ({ default: { success, error } }));

const ownSuggestion = {
  id: 'suggestion-1', title: 'Mejorar búsqueda', description: 'Añadir filtros',
  type: 'suggestion', status: 'in_progress', priority: 'medium', rejectionReason: null,
  userId: 'user-1', user: { id: 'user-1', username: 'ana', image: null },
  versionItemId: null, versionItem: null, createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('/suggestions legacy characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: { data: [ownSuggestion], counts: { in_progress: 1, done: 0, rejected: 0 } } });
    post.mockResolvedValue({ data: ownSuggestion });
  });

  it('loads only the authenticated user’s list and renders status counts', async () => {
    let finish!: (value: { data: { data: typeof ownSuggestion[]; counts: { in_progress: number; done: number; rejected: number } } }) => void;
    get.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const wrapper = mount(SuggestionsPage);
    await nextTick();
    expect(wrapper.text()).toContain('Cargando...');
    finish({ data: { data: [ownSuggestion], counts: { in_progress: 1, done: 0, rejected: 0 } } });
    await flushPromises();

    expect(get).toHaveBeenCalledWith('/suggestions/my', { params: undefined });
    expect(wrapper.text()).toContain('Mejorar búsqueda');
    expect(wrapper.text()).toContain('1 pendiente');
  });

  it('posts the selected type and trimmed fields, then refreshes and shows success', async () => {
    const wrapper = mount(SuggestionsPage);
    await flushPromises();
    await wrapper.findAll('button')[1].trigger('click'); // Bug option
    await wrapper.get('input').setValue('  No carga  ');
    await wrapper.get('textarea').setValue('  Se queda en blanco  ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(post).toHaveBeenCalledWith('/suggestions', {
      title: '  No carga  ', description: '  Se queda en blanco  ', type: 'bug',
    });
    expect(get).toHaveBeenCalledTimes(2);
    expect(success).toHaveBeenCalledWith('Enviado correctamente');
    expect(wrapper.get('input').element.value).toBe('');
    expect(wrapper.get('textarea').element.value).toBe('');
  });

  it('shows an empty message for no own suggestions and keeps list-load failures silent', async () => {
    get.mockResolvedValueOnce({ data: { data: [], counts: { in_progress: 0, done: 0, rejected: 0 } } });
    const empty = mount(SuggestionsPage);
    await flushPromises();
    expect(empty.text()).toContain('Sin envíos todavía');
    empty.unmount();

    get.mockRejectedValueOnce(new Error('offline'));
    const failed = mount(SuggestionsPage);
    await flushPromises();
    expect(failed.text()).not.toContain('Cargando...');
    expect(failed.text()).toContain('Sin envíos todavía');
    expect(error).not.toHaveBeenCalled();
  });

  it('uses the API message on create failure and does not reload the list', async () => {
    post.mockRejectedValueOnce({ response: { data: { message: 'Título duplicado' } } });
    const wrapper = mount(SuggestionsPage);
    await flushPromises();
    await wrapper.findAll('button')[1].trigger('click');
    await wrapper.get('input').setValue('Título');
    await wrapper.get('textarea').setValue('Descripción');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(error).toHaveBeenCalledWith('Título duplicado');
    expect(get).toHaveBeenCalledTimes(1);
  });
});
