// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SuggestionsPage from '../../../../src/views/suggestions/SuggestionsPage.vue';

const { create, listMine, versionOptions, success, error } = vi.hoisted(() => ({
  create: vi.fn(),
  listMine: vi.fn(),
  versionOptions: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/app/dependencies/suggestions', () => ({
  createOwnSuggestion: create,
  fetchOwnSuggestions: listMine,
  fetchSuggestionVersionOptions: versionOptions,
}));
vi.mock('@services/swal/SwalService', () => ({ default: { success, error } }));

const ownSuggestion = {
  id: 'suggestion-1', title: 'Mejorar búsqueda', description: 'Añadir filtros',
  type: 'suggestion', status: 'in_progress', priority: 'medium', rejectionReason: null,
  userId: 'user-1', user: { id: 'user-1', username: 'ana', image: null },
  versionItemId: null, versionItem: null, createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('/suggestions Releases presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMine.mockResolvedValue({ suggestions: [ownSuggestion], counts: { in_progress: 1, done: 0, rejected: 0 } });
    versionOptions.mockResolvedValue([]);
    create.mockResolvedValue(ownSuggestion);
  });

  it('loads only the authenticated user’s list and renders status counts', async () => {
    let finish!: (value: { suggestions: typeof ownSuggestion[]; counts: { in_progress: number; done: number; rejected: number } }) => void;
    listMine.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const wrapper = mount(SuggestionsPage);
    await nextTick();
    expect(wrapper.text()).toContain('Cargando...');
    finish({ suggestions: [ownSuggestion], counts: { in_progress: 1, done: 0, rejected: 0 } });
    await flushPromises();

    expect(listMine).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('Mejorar búsqueda');
    expect(wrapper.text()).toContain('1 pendiente');
  });

  it('resolves the linked version item from the app projection without adding it to the suggestion contract', async () => {
    listMine.mockResolvedValueOnce({
      suggestions: [{ ...ownSuggestion, versionItemId: 'version-item-1' }],
      counts: { in_progress: 1, done: 0, rejected: 0 },
    });
    versionOptions.mockResolvedValueOnce([{
      id: 'version-item-1', type: 'feat', description: 'Búsqueda avanzada',
    }]);

    const wrapper = mount(SuggestionsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Incluido en: Búsqueda avanzada');
  });

  it('posts the selected type and trimmed fields, then refreshes and shows success', async () => {
    const wrapper = mount(SuggestionsPage);
    await flushPromises();
    await wrapper.findAll('button')[1].trigger('click'); // Bug option
    await wrapper.get('input').setValue('  No carga  ');
    await wrapper.get('textarea').setValue('  Se queda en blanco  ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(create).toHaveBeenCalledWith({
      title: '  No carga  ', description: '  Se queda en blanco  ', type: 'bug',
    });
    expect(listMine).toHaveBeenCalledTimes(2);
    expect(success).toHaveBeenCalledWith('Enviado correctamente');
    expect(wrapper.get('input').element.value).toBe('');
    expect(wrapper.get('textarea').element.value).toBe('');
  });

  it('shows an empty message for no own suggestions and keeps list-load failures silent', async () => {
    listMine.mockResolvedValueOnce({ suggestions: [], counts: { in_progress: 0, done: 0, rejected: 0 } });
    const empty = mount(SuggestionsPage);
    await flushPromises();
    expect(empty.text()).toContain('Sin envíos todavía');
    empty.unmount();

    listMine.mockRejectedValueOnce(new Error('offline'));
    const failed = mount(SuggestionsPage);
    await flushPromises();
    expect(failed.text()).not.toContain('Cargando...');
    expect(failed.text()).toContain('Sin envíos todavía');
    expect(error).not.toHaveBeenCalled();
  });

  it('uses the API message on create failure and does not reload the list', async () => {
    create.mockRejectedValueOnce({ response: { data: { message: 'Título duplicado' } } });
    const wrapper = mount(SuggestionsPage);
    await flushPromises();
    await wrapper.findAll('button')[1].trigger('click');
    await wrapper.get('input').setValue('Título');
    await wrapper.get('textarea').setValue('Descripción');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(error).toHaveBeenCalledWith('Título duplicado');
    expect(listMine).toHaveBeenCalledTimes(1);
  });

  it('keeps required-field validation before calling the Releases operation', async () => {
    const wrapper = mount(SuggestionsPage);
    await flushPromises();
    await wrapper.get('input').setValue('   ');
    await wrapper.get('textarea').setValue('Descripción');

    expect((wrapper.get('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(true);
    await wrapper.get('form').trigger('submit');

    expect(create).not.toHaveBeenCalled();
  });
});
