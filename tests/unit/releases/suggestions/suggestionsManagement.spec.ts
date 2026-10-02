// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuggestionsManagement from '../../../../src/views/suggestions/SuggestionsManagement.vue';

const {
  list, create, updatePriority, progress, reject, complete, remove, versionOptions,
  setPendingIds, success, error, confirm,
} = vi.hoisted(() => ({
  list: vi.fn(), create: vi.fn(), updatePriority: vi.fn(), progress: vi.fn(),
  reject: vi.fn(), complete: vi.fn(), remove: vi.fn(), versionOptions: vi.fn(),
  setPendingIds: vi.fn(),
  success: vi.fn(), error: vi.fn(), confirm: vi.fn(),
}));

vi.mock('@/app/dependencies/suggestions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/app/dependencies/suggestions')>();
  return {
    ...actual,
    fetchManagedSuggestions: list,
    createManagedSuggestion: create,
    updateManagedSuggestionPriority: updatePriority,
    progressManagedSuggestion: progress,
    rejectManagedSuggestion: reject,
    completeManagedSuggestion: complete,
    deleteManagedSuggestion: remove,
    fetchSuggestionVersionOptions: versionOptions,
    setPendingSuggestionIds: setPendingIds,
  };
});
vi.mock('@services/swal/SwalService', () => ({ default: { success, error, confirm } }));

const mountedWrappers: VueWrapper[] = [];

const suggestion = (overrides: Record<string, unknown> = {}) => ({
  id: 'suggestion-1', title: 'Mejorar búsqueda', description: 'Añadir filtros',
  type: 'bug', status: 'in_progress', priority: 'low', rejectionReason: null,
  userId: 'user-1', user: { id: 'user-1', username: 'ana', image: null },
  versionItemId: null, createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z', ...overrides,
});

function mountManagement() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(SuggestionsManagement, { attachTo: document.body, global: { plugins: [pinia] } });
  mountedWrappers.push(wrapper);
  return wrapper;
}

function unmountManagement(wrapper: VueWrapper): void {
  wrapper.unmount();
  const index = mountedWrappers.indexOf(wrapper);
  if (index !== -1) mountedWrappers.splice(index, 1);
}

const button = (wrapper: ReturnType<typeof mountManagement>, label: string) =>
  wrapper.findAll('button').find((item) => item.text().includes(label));

const bodyButton = (label: string) => Array.from(document.body.querySelectorAll('.fixed.inset-0 button'))
  .find((item) => item.textContent?.includes(label));

function fill(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('/suggestions/management Releases presentation', () => {
  afterEach(() => {
    mountedWrappers.forEach((wrapper) => wrapper.unmount());
    mountedWrappers.length = 0;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    list.mockResolvedValue([suggestion()]);
    create.mockResolvedValue(suggestion());
    updatePriority.mockResolvedValue(suggestion({ priority: 'medium' }));
    progress.mockResolvedValue(suggestion());
    reject.mockResolvedValue(suggestion({ status: 'rejected', rejectionReason: 'Duplicado' }));
    complete.mockResolvedValue(suggestion({ status: 'done' }));
    remove.mockResolvedValue(undefined);
    versionOptions.mockResolvedValue([
      { id: 'version-item-1', type: 'feat', description: 'Filtros nuevos' },
    ]);
    setPendingIds.mockImplementation(() => undefined);
    success.mockResolvedValue(undefined);
    error.mockResolvedValue(undefined);
    confirm.mockResolvedValue({ isConfirmed: true });
  });

  it('loads pending/all, sends current filters, and coordinates pending IDs from the result', async () => {
    let finish!: (value: ReturnType<typeof suggestion>[]) => void;
    list.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const wrapper = mountManagement();
    await flushPromises();
    expect(wrapper.text()).toContain('Cargando...');
    finish([suggestion()]);
    await flushPromises();

    expect(list).toHaveBeenCalledWith({ status: 'in_progress' });
    expect(wrapper.text()).toContain('Mejorar búsqueda');
    expect(setPendingIds).toHaveBeenCalledWith(['suggestion-1']);

    list.mockResolvedValueOnce([suggestion({ id: 'done-1', status: 'done' })]);
    await button(wrapper, 'Hechas')?.trigger('click');
    await flushPromises();
    expect(list).toHaveBeenLastCalledWith({ status: 'done' });
    expect(setPendingIds).toHaveBeenLastCalledWith([]);

    list.mockResolvedValueOnce([suggestion({ id: 'bug-done', type: 'bug', status: 'done' })]);
    await button(wrapper, 'Bugs')?.trigger('click');
    await flushPromises();
    expect(list).toHaveBeenLastCalledWith({ type: 'bug', status: 'done' });
  });

  it('shows the type/state-specific empty message', async () => {
    list.mockResolvedValueOnce([]);
    const wrapper = mountManagement();
    await flushPromises();
    expect(wrapper.text()).toContain('No hay entradas en este estado.');
    unmountManagement(wrapper);
  });

  it('creates with selected values, closes on success, and reports failure', async () => {
    const wrapper = mountManagement();
    await flushPromises();
    await button(wrapper, 'Nueva entrada')?.trigger('click');
    const fields = document.body.querySelectorAll('input, textarea');
    fill(fields[0] as HTMLInputElement, 'Título');
    fill(fields[1] as HTMLTextAreaElement, 'Descripción');
    await bodyButton('Alta')?.click();
    await bodyButton('Crear')?.click();
    await flushPromises();

    expect(create).toHaveBeenCalledWith({
      title: 'Título', description: 'Descripción', type: 'suggestion', priority: 'high',
    });
    expect(success).toHaveBeenCalledWith('Creado correctamente');
    expect(wrapper.text()).not.toContain('Nueva sugerencia / bug');

    create.mockRejectedValueOnce(new Error('offline'));
    await button(wrapper, 'Nueva entrada')?.trigger('click');
    const retryFields = document.body.querySelectorAll('input, textarea');
    fill(retryFields[0] as HTMLInputElement, 'Otro título');
    fill(retryFields[1] as HTMLTextAreaElement, 'Otro texto');
    await flushPromises();
    await bodyButton('Crear')?.click();
    await flushPromises();
    expect(create).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledWith('Error al crear');
  });

  it('updates priority optimistically and rolls it back on failure', async () => {
    const wrapper = mountManagement();
    await flushPromises();
    const priority = wrapper.find('button[title="Click para cambiar prioridad"]');
    let finish!: (value: ReturnType<typeof suggestion>) => void;
    updatePriority.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await priority.trigger('click');
    expect(priority.text()).toContain('Media');
    expect(updatePriority).toHaveBeenCalledWith('suggestion-1', 'medium');
    finish(suggestion({ priority: 'medium' }));
    await flushPromises();

    updatePriority.mockRejectedValueOnce(new Error('offline'));
    await priority.trigger('click');
    await flushPromises();
    expect(priority.text()).toContain('Media');
    expect(error).toHaveBeenCalledWith('Error al cambiar la prioridad');
  });

  it('rejects with the entered reason and shows the rejection error', async () => {
    const wrapper = mountManagement();
    await flushPromises();
    await button(wrapper, 'Rechazar')?.trigger('click');
    fill(document.body.querySelector('textarea') as HTMLTextAreaElement, 'No se puede reproducir');
    await flushPromises();
    await bodyButton('Rechazar')?.click();
    await flushPromises();

    expect(reject).toHaveBeenCalledWith('suggestion-1', { rejectionReason: 'No se puede reproducir' });
    expect(success).toHaveBeenCalledWith('Rechazada');
    expect(wrapper.text()).toContain('Duplicado');

    unmountManagement(wrapper);
    list.mockResolvedValueOnce([suggestion()]);
    const retry = mountManagement();
    await flushPromises();
    reject.mockRejectedValueOnce(new Error('offline'));
    await button(retry, 'Rechazar')?.trigger('click');
    fill(document.body.querySelector('textarea') as HTMLTextAreaElement, 'Motivo');
    await flushPromises();
    await bodyButton('Rechazar')?.click();
    await flushPromises();
    expect(error).toHaveBeenCalledWith('Error al rechazar');
  });

  it('returns a rejected suggestion to pending and reports errors', async () => {
    list.mockResolvedValueOnce([suggestion({ status: 'rejected' })]);
    const wrapper = mountManagement();
    await flushPromises();
    await button(wrapper, 'Volver a pendiente')?.trigger('click');
    await flushPromises();
    expect(progress).toHaveBeenCalledWith('suggestion-1');
    expect(success).toHaveBeenCalledWith('Vuelta a pendiente');

    unmountManagement(wrapper);
    list.mockResolvedValueOnce([suggestion({ status: 'rejected' })]);
    const retry = mountManagement();
    await flushPromises();
    progress.mockRejectedValueOnce(new Error('offline'));
    await button(retry, 'Volver a pendiente')?.trigger('click');
    await flushPromises();
    expect(error).toHaveBeenCalledWith('Error');
  });

  it('persists read IDs in the legacy format and hides the read action', async () => {
    const wrapper = mountManagement();
    await flushPromises();
    await button(wrapper, 'Marcar como leído')?.trigger('click');
    expect(localStorage.getItem('rv_support_read_ids')).toBe('["suggestion-1"]');
    expect(button(wrapper, 'Marcar como leído')).toBeUndefined();
  });

  it('completes internally or links a version item and reports completion errors', async () => {
    const wrapper = mountManagement();
    await flushPromises();
    await button(wrapper, 'Marcar como hecho')?.trigger('click');
    await flushPromises();
    expect(versionOptions).toHaveBeenCalledOnce();
    (document.body.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    await flushPromises();
    await bodyButton('Confirmar')?.click();
    await flushPromises();
    expect(complete).toHaveBeenCalledWith('suggestion-1', { versionItemId: undefined });
    expect(success).toHaveBeenCalledWith('Marcada como hecha');

    unmountManagement(wrapper);
    list.mockResolvedValueOnce([suggestion()]);
    const linked = mountManagement();
    await flushPromises();
    complete.mockResolvedValueOnce(suggestion({ status: 'done', versionItemId: 'version-item-1' }));
    await button(linked, 'Marcar como hecho')?.trigger('click');
    await flushPromises();
    const select = document.body.querySelector('select') as HTMLSelectElement;
    select.value = 'version-item-1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await flushPromises();
    await bodyButton('Confirmar')?.click();
    await flushPromises();
    expect(complete).toHaveBeenLastCalledWith('suggestion-1', { versionItemId: 'version-item-1' });
    expect(linked.text()).toContain('Filtros nuevos');

    unmountManagement(linked);
    list.mockResolvedValueOnce([suggestion()]);
    const retry = mountManagement();
    await flushPromises();
    complete.mockRejectedValueOnce(new Error('offline'));
    await button(retry, 'Marcar como hecho')?.trigger('click');
    await flushPromises();
    const retrySelect = document.body.querySelector('select') as HTMLSelectElement;
    retrySelect.value = 'version-item-1';
    retrySelect.dispatchEvent(new Event('change', { bubbles: true }));
    await flushPromises();
    await bodyButton('Confirmar')?.click();
    await flushPromises();
    expect(error).toHaveBeenCalledWith('Error al marcar como hecha');
  });

  it('deletes only after confirmation and reports delete errors', async () => {
    const wrapper = mountManagement();
    await flushPromises();
    confirm.mockResolvedValueOnce({ isConfirmed: false });
    await button(wrapper, 'Eliminar')?.trigger('click');
    expect(remove).not.toHaveBeenCalled();

    await button(wrapper, 'Eliminar')?.trigger('click');
    await flushPromises();
    expect(confirm).toHaveBeenCalledWith('¿Eliminar esta entrada?', 'Esta acción no se puede deshacer.', 'Sí, eliminar', 'Cancelar');
    expect(remove).toHaveBeenCalledWith('suggestion-1');
    expect(success).toHaveBeenCalledWith('Eliminada');

    list.mockResolvedValueOnce([suggestion()]);
    const retry = mountManagement();
    await flushPromises();
    remove.mockRejectedValueOnce(new Error('offline'));
    await button(retry, 'Eliminar')?.trigger('click');
    await flushPromises();
    expect(error).toHaveBeenCalledWith('Error al eliminar');
  });
});
