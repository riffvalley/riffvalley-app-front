// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SuggestionsManagement from '../../../../src/views/suggestions/SuggestionsManagement.vue';
import { useSupportStore } from '../../../../src/stores/support/support';

const { get, post, patch, deleteRequest, success, error, confirm } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), deleteRequest: vi.fn(),
  success: vi.fn(), error: vi.fn(), confirm: vi.fn(),
}));

vi.mock('@services/api/api.ts', () => ({ default: { get, post, patch, delete: deleteRequest } }));
vi.mock('@services/swal/SwalService', () => ({ default: { success, error, confirm } }));

const suggestion = (overrides: Record<string, unknown> = {}) => ({
  id: 'suggestion-1', title: 'Mejorar búsqueda', description: 'Añadir filtros',
  type: 'bug', status: 'in_progress', priority: 'low', rejectionReason: null,
  userId: 'user-1', user: { id: 'user-1', username: 'ana', image: null },
  versionItemId: null, versionItem: null, createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z', ...overrides,
});

function mountManagement() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(SuggestionsManagement, { global: { plugins: [pinia] }, attachTo: document.body });
  return { wrapper, support: useSupportStore() };
}

const button = (wrapper: ReturnType<typeof mountManagement>['wrapper'], label: string) =>
  wrapper.findAll('button').find((item) => item.text().includes(label));

const bodyButton = (label: string) => Array.from(document.body.querySelectorAll('button'))
  .find((item) => item.textContent?.includes(label));

describe('/suggestions/management legacy characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    get.mockImplementation(async (path: string) => {
      if (path === '/suggestions') return { data: [suggestion()] };
      if (path === '/versions/current/items') return { data: [{ id: 'version-item-1', type: 'feature', description: 'Filtros nuevos' }] };
      return { data: [] };
    });
    patch.mockImplementation(async (path: string, payload?: Record<string, unknown>) => {
      if (path.endsWith('/reject')) return { data: suggestion({ status: 'rejected', rejectionReason: payload?.rejectionReason }) };
      if (path.endsWith('/progress')) return { data: suggestion({ status: 'in_progress' }) };
      if (path.endsWith('/done')) return { data: suggestion({ status: 'done', versionItemId: payload?.versionItemId ?? null }) };
      return { data: suggestion({ priority: payload?.priority }) };
    });
    post.mockResolvedValue({ data: suggestion() });
    deleteRequest.mockResolvedValue({ data: undefined });
    success.mockResolvedValue(undefined);
    error.mockResolvedValue(undefined);
    confirm.mockResolvedValue({ isConfirmed: true });
  });

  it('starts on pending/all, supports array and { data } list responses, and derives pending IDs from the active result', async () => {
    let finish!: (value: { data: ReturnType<typeof suggestion>[] }) => void;
    get.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { wrapper, support } = mountManagement();
    await nextTick();
    expect(wrapper.text()).toContain('Cargando...');
    finish({ data: [suggestion()] });
    await flushPromises();
    expect(get).toHaveBeenCalledWith('/suggestions', { params: { status: 'in_progress' } });
    expect(wrapper.text()).toContain('Mejorar búsqueda');
    expect(support.unreadCount).toBe(1);

    get.mockResolvedValueOnce({ data: { data: [suggestion({ id: 'done-1', status: 'done' })] } });
    await button(wrapper, 'Hechas')?.trigger('click');
    await flushPromises();
    expect(get).toHaveBeenLastCalledWith('/suggestions', { params: { status: 'done' } });
    expect(wrapper.text()).toContain('Hecho');
    expect(support.unreadCount).toBe(0);

    get.mockResolvedValueOnce({ data: [suggestion({ id: 'bug-1' })] });
    await button(wrapper, 'Bugs')?.trigger('click');
    await flushPromises();
    expect(get).toHaveBeenLastCalledWith('/suggestions', { params: { type: 'bug', status: 'done' } });
  });

  it('shows the type/state-specific empty message when the filtered list has no matches', async () => {
    get.mockResolvedValueOnce({ data: [] });
    const { wrapper } = mountManagement();
    await flushPromises();
    expect(wrapper.text()).toContain('No hay entradas en este estado.');
    wrapper.unmount();
  });

  it('creates with the selected form values and reports the current success/error messages', async () => {
    const wrapper = mountManagement().wrapper;
    await flushPromises();
    await button(wrapper, 'Nueva entrada')?.trigger('click');
    const fields = document.body.querySelectorAll('input, textarea');
    (fields[0] as HTMLInputElement).value = 'Título';
    (fields[0] as HTMLInputElement).dispatchEvent(new Event('input', { bubbles: true }));
    (fields[1] as HTMLTextAreaElement).value = 'Descripción';
    (fields[1] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
    await bodyButton('Crear')?.click();
    await flushPromises();

    expect(post).toHaveBeenCalledWith('/suggestions', {
      title: 'Título', description: 'Descripción', type: 'suggestion', priority: 'medium',
    });
    expect(success).toHaveBeenCalledWith('Creado correctamente');

    post.mockRejectedValueOnce(new Error('offline'));
    await button(wrapper, 'Nueva entrada')?.trigger('click');
    const nextFields = document.body.querySelectorAll('input, textarea');
    (nextFields[0] as HTMLInputElement).value = 'Otro';
    nextFields[0].dispatchEvent(new Event('input', { bubbles: true }));
    (nextFields[1] as HTMLTextAreaElement).value = 'Texto';
    nextFields[1].dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
    await bodyButton('Crear')?.click();
    await flushPromises();
    expect(error).toHaveBeenCalledWith('Error al crear');
  });

  it('updates priority optimistically and rolls back on transport failure', async () => {
    const { wrapper } = mountManagement();
    await flushPromises();
    const priority = wrapper.find('button[title="Click para cambiar prioridad"]');
    patch.mockImplementationOnce(() => new Promise(() => undefined));
    await priority.trigger('click');
    expect(priority.text()).toContain('Media');
    expect(patch).toHaveBeenCalledWith('/suggestions/suggestion-1', { priority: 'medium' });

    patch.mockRejectedValueOnce(new Error('offline'));
    await priority.trigger('click');
    await flushPromises();
    expect(priority.text()).toContain('Media');
    expect(error).toHaveBeenCalledWith('Error al cambiar la prioridad');
  });

  it('rejects with a reason, returns rejected entries to pending, and records read IDs', async () => {
    const { wrapper, support } = mountManagement();
    await flushPromises();
    get.mockResolvedValueOnce({ data: [suggestion({ status: 'rejected' })] });
    await button(wrapper, 'Rechazadas')?.trigger('click');
    await flushPromises();
    await button(wrapper, 'Volver a pendiente')?.trigger('click');
    await flushPromises();
    expect(patch).toHaveBeenCalledWith('/suggestions/suggestion-1/progress');
    expect(success).toHaveBeenCalledWith('Vuelta a pendiente');

    // Refresh with pending row, mark read, and verify legacy localStorage format.
    await button(wrapper, 'Pendientes')?.trigger('click');
    await flushPromises();
    await button(wrapper, 'Marcar como leído')?.trigger('click');
    expect(localStorage.getItem('rv_support_read_ids')).toBe('["suggestion-1"]');
    expect(support.isRead('suggestion-1')).toBe(true);
    expect(button(wrapper, 'Marcar como leído')).toBeUndefined();

    await button(wrapper, 'Rechazar')?.trigger('click');
    expect(document.body.querySelector('textarea')).not.toBeNull();
    const vm = wrapper.vm as unknown as {
      rejectModal: { suggestion: ReturnType<typeof suggestion> | null; reason: string };
      handleReject: () => Promise<void>;
    };
    vm.rejectModal.reason = 'No se puede reproducir';
    await vm.handleReject();
    expect(patch).toHaveBeenCalledWith('/suggestions/suggestion-1/reject', { rejectionReason: 'No se puede reproducir' });
    expect(success).toHaveBeenCalledWith('Rechazada');
  });

  it('closes internally or with a version item and deletes only after confirmation', async () => {
    const { wrapper } = mountManagement();
    await flushPromises();

    let finishItems!: (value: { data: Array<{ id: string; type: string; description: string }> }) => void;
    get.mockImplementationOnce(() => new Promise((resolve) => { finishItems = resolve; }));
    await button(wrapper, 'Marcar como hecho')?.trigger('click');
    expect(get).toHaveBeenCalledWith('/versions/current/items');
    expect(document.body.textContent).toContain('Cargando items...');
    finishItems({ data: [{ id: 'version-item-1', type: 'feature', description: 'Filtros nuevos' }] });
    await flushPromises();
    const internal = document.body.querySelector<HTMLInputElement>('input[type="checkbox"]');
    internal?.click();
    await flushPromises();
    await bodyButton('Confirmar')?.click();
    await flushPromises();
    expect(patch).toHaveBeenCalledWith('/suggestions/suggestion-1/done', { versionItemId: undefined });
    expect(success).toHaveBeenCalledWith('Marcada como hecha');

    // A fresh pending row exercises the associated-to-version branch.
    wrapper.unmount();
    patch.mockClear();
    get.mockImplementation(async (path: string) => path === '/suggestions'
      ? { data: [suggestion()] }
      : { data: [{ id: 'version-item-1', type: 'feature', description: 'Filtros nuevos' }] });
    const linked = mountManagement().wrapper;
    await flushPromises();
    await button(linked, 'Marcar como hecho')?.trigger('click');
    await flushPromises();
    const select = document.body.querySelector('select');
    if (select) {
      select.value = 'version-item-1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await flushPromises();
    await bodyButton('Confirmar')?.click();
    await flushPromises();
    expect(patch).toHaveBeenCalledWith('/suggestions/suggestion-1/done', { versionItemId: 'version-item-1' });

    await button(linked, 'Eliminar')?.trigger('click');
    await flushPromises();
    expect(confirm).toHaveBeenCalledWith('¿Eliminar esta entrada?', 'Esta acción no se puede deshacer.', 'Sí, eliminar', 'Cancelar');
    expect(deleteRequest).toHaveBeenCalledWith('/suggestions/suggestion-1');
    expect(success).toHaveBeenCalledWith('Eliminada');
    expect(linked.text()).toContain('No hay entradas en este estado.');
  });
});
