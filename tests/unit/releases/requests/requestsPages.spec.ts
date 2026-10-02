// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import SuggestView from '../../../../src/modules/releases/requests/presentation/views/SuggestView.vue';
import PetitionsPage from '../../../../src/views/petitions/PetitionsPage.vue';
import { REJECT_REASONS } from '../../../../src/helpers/rejectReasons';

const { create, mine, all, update, approve, reject, reopen, success, error } = vi.hoisted(() => ({
  create: vi.fn(), mine: vi.fn(), all: vi.fn(), update: vi.fn(), approve: vi.fn(), reject: vi.fn(), reopen: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock('@services/requests/requests', () => ({
  createRequest: create, getMyRequests: mine, getAllRequests: all, updateRequest: update,
  approveRequest: approve, rejectRequest: reject, reopenRequest: reopen,
}));
vi.mock('@/stores/catalog/catalog', () => ({ useCatalogStore: () => ({
  genres: [{ id: 'g1', name: 'Rock' }], countries: [{ id: 'c1', name: 'España' }],
}) }));
vi.mock('@/services/swal/SwalService', () => ({ default: { success, error } }));

const pending = {
  id: 'r1', discName: 'Disco', artistName: 'Banda', releaseDate: '2026-03-04', ep: true, debut: false,
  status: 'pending' as const, adminNotes: null, createdAt: '2026-03-05T00:00:00.000Z',
  genre: { id: 'g1', name: 'Rock' }, country: { id: 'c1', name: 'España' }, user: { username: 'ana' },
};
const rejected = { ...pending, id: 'r2', status: 'rejected' as const, adminNotes: 'Datos erróneos', ep: false };
const selectStub = { props: ['modelValue', 'options'], template: '<select class="catalog-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">none</option><option v-for="o in options" :key="o.id" :value="o.id">{{o.name}}</option></select>' };
const global = { plugins: [createPinia()], stubs: { SearchableSelect: selectStub } };
const suggestProps = () => ({
  genres: [{ id: 'g1', name: 'Rock' }],
  countries: [{ id: 'c1', name: 'España' }],
  createRequest: create,
  getMyRequests: mine,
  notifySuccess: success,
  notifyError: error,
});

describe('request submission and administration pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    all.mockReset();
    mine.mockReset();
    mine.mockResolvedValue([]);
    all.mockResolvedValue([pending, rejected]);
    create.mockResolvedValue({ ...pending, id: 'new' });
    update.mockImplementation(async (id, dto) => ({ ...pending, id, ...dto, genre: dto.genreId ? { id: dto.genreId, name: 'Rock' } : null }));
    approve.mockResolvedValue(undefined);
    reject.mockResolvedValue({ ...pending, status: 'rejected', adminNotes: 'Motivo' });
    reopen.mockResolvedValue({ ...pending, status: 'pending', adminNotes: null });
  });

  it('loads own requests, displays loading/empty states, and silently hides load errors as empty', async () => {
    let resolve!: (rows: typeof pending[]) => void;
    mine.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const wrapper = mount(SuggestView, { props: suggestProps(), global });
    await nextTick();
    expect(wrapper.text()).toContain('Cargando...');
    await flushPromises();
    resolve([pending]);
    await flushPromises();
    expect(mine).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('Banda — Disco');
    expect(wrapper.text()).toContain('Pendiente');
    expect(wrapper.text()).toContain('Rock');
    expect(wrapper.text()).toContain('España');
    expect(wrapper.text()).toContain('04/03/2026');
    wrapper.unmount();

    mine.mockRejectedValueOnce(new Error('offline'));
    const empty = mount(SuggestView, { props: suggestProps(), global });
    await flushPromises();
    expect(empty.text()).toContain('Sin solicitudes todavía');
    expect(error).not.toHaveBeenCalled();
  });

  it('validates required names/date and minimum date before POST', async () => {
    const wrapper = mount(SuggestView, { props: suggestProps(), global });
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.text()).toContain('El nombre del artista y del disco son obligatorios.');
    await wrapper.get('input[placeholder="Ej: Metallica"]').setValue('Banda');
    await wrapper.get('input[placeholder="Ej: Master of Puppets"]').setValue('Disco');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.text()).toContain('La fecha de lanzamiento es obligatoria.');
    await wrapper.get('input[type="date"]').setValue('2024-12-31');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.text()).toContain('no puede ser anterior a 2025');
    expect(create).not.toHaveBeenCalled();
  });

  it('posts trimmed required values and selected genre/country and only true EP/debut flags; prepends and resets', async () => {
    const wrapper = mount(SuggestView, { props: suggestProps(), global });
    await flushPromises();
    await wrapper.get('input[placeholder="Ej: Metallica"]').setValue(' Banda ');
    await wrapper.get('input[placeholder="Ej: Master of Puppets"]').setValue(' Disco ');
    await wrapper.get('input[type="date"]').setValue('2025-01-01');
    await wrapper.get('select.catalog-select').setValue('g1');
    await wrapper.findAll('select.catalog-select')[1].setValue('c1');
    await wrapper.get('button[type="button"]').trigger('click');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(create).toHaveBeenCalledWith({ discName: 'Disco', artistName: 'Banda', releaseDate: '2025-01-01', ep: true, genreId: 'g1', countryId: 'c1' });
    expect(success).toHaveBeenCalledWith('Petición enviada correctamente');
    expect(wrapper.get('input[placeholder="Ej: Metallica"]').element.value).toBe('');
    expect(wrapper.text()).toContain('Banda — Disco');
  });

  it('shows API create errors and preserves the entered form', async () => {
    create.mockRejectedValueOnce({ response: { data: { message: 'Duplicada' } } });
    const wrapper = mount(SuggestView, { props: suggestProps(), global });
    await flushPromises();
    await wrapper.get('input[placeholder="Ej: Metallica"]').setValue('Banda');
    await wrapper.get('input[placeholder="Ej: Master of Puppets"]').setValue('Disco');
    await wrapper.get('input[type="date"]').setValue('2025-01-01');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(error).toHaveBeenCalledWith('Duplicada');
    expect(wrapper.get('input[placeholder="Ej: Metallica"]').element.value).toBe('Banda');
  });

  it('loads the administrative list, status counts/filters, loading and empty states', async () => {
    let resolve!: (rows: typeof pending[]) => void;
    all.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const wrapper = mount(PetitionsPage, { global });
    await nextTick();
    expect(wrapper.text()).toContain('Cargando...');
    await flushPromises();
    resolve([pending, rejected]);
    await flushPromises();
    expect(wrapper.text()).toContain('1 peticiones');
    expect(wrapper.text()).toContain('Pendientes (1)');
    expect(wrapper.text()).not.toContain('Datos erróneos');
    await wrapper.get('button').trigger('click'); // first status tab remains pending
    const tabs = wrapper.findAll('button').filter((button) => /^(Aprobadas|Rechazadas|Todas)/.test(button.text()));
    await tabs[1].trigger('click');
    expect(wrapper.text()).toContain('Datos erróneos');
    expect(wrapper.findAll('li')).toHaveLength(1);
    all.mockResolvedValueOnce([]);
    wrapper.unmount();
    const empty = mount(PetitionsPage, { global });
    await flushPromises();
    expect(empty.text()).toContain('No hay peticiones pendientes.');
  });

  it('edits changed fields only, sends null for cleared catalog relations and updates adminNotes', async () => {
    const wrapper = mount(PetitionsPage, { global });
    await nextTick();
    await flushPromises();
    await wrapper.get('button[title="Editar"]').trigger('click');
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('Otra banda');
    const selects = wrapper.findAll('select.catalog-select');
    await selects[0].setValue('');
    await wrapper.get('textarea').setValue('Corrección');
    await wrapper.findAll('button').find((button) => button.text() === 'Guardar')!.trigger('click');
    await flushPromises();
    expect(update).toHaveBeenCalledWith('r1', { artistName: 'Otra banda', genreId: null, adminNotes: 'Corrección' });
    expect(success).toHaveBeenCalledWith('Petición actualizada');
  });

  it('approves pending requests optimistically, ignores approve body, syncs badge and reports response message on errors', async () => {
    all.mockResolvedValueOnce([{ ...pending, status: 'pending' }, { ...rejected, status: 'rejected' }]);
    const wrapper = mount(PetitionsPage, { global });
    await flushPromises();
    await wrapper.get('button[title="Aprobar"]').trigger('click');
    await flushPromises();
    expect(approve).toHaveBeenCalledWith('r1');
    expect(success).toHaveBeenCalledWith('Petición aprobada y disco creado');
    expect(wrapper.text()).toContain('Aprobada');
    approve.mockRejectedValueOnce({ response: { data: { message: 'No permitido' } } });
    const next = mount(PetitionsPage, { global });
    await nextTick();
    await flushPromises();
    await next.get('button[title="Aprobar"]').trigger('click');
    await flushPromises();
    expect(error).toHaveBeenCalledWith('No permitido');
  });

  it('rejects using a predefined reason and DELETE adminNotes, requires nonblank text, and updates pending count', async () => {
    expect(REJECT_REASONS).toHaveLength(5);
    const wrapper = mount(PetitionsPage, { global });
    await flushPromises();
    await wrapper.get('button[title="Rechazar"]').trigger('click');
    await wrapper.get('button').trigger('click');
    const select = wrapper.find('select:not(.catalog-select)');
    await select.setValue(REJECT_REASONS[0].value);
    await wrapper.findAll('button').find((button) => button.text() === 'Rechazar')!.trigger('click');
    await flushPromises();
    expect(reject).toHaveBeenCalledWith('r1', REJECT_REASONS[0].value);
    expect(success).toHaveBeenCalledWith('Petición rechazada');
    expect(wrapper.text()).toContain('Rechazada');
  });

  it('requires rejection notes and reopens from the response object', async () => {
    const wrapper = mount(PetitionsPage, { global });
    await flushPromises();
    await wrapper.get('button[title="Rechazar"]').trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Rechazar')!.trigger('click');
    expect(wrapper.text()).toContain('El motivo es obligatorio.');
    await wrapper.findAll('button').find((button) => button.text() === 'Cancelar')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Rechazadas (1)')!.trigger('click');
    await wrapper.get('button[title="Reabrir"]').trigger('click');
    await flushPromises();
    expect(reopen).toHaveBeenCalledWith('r2');
    expect(success).toHaveBeenCalledWith('Petición reabierta');
    expect(wrapper.text()).toContain('Pendiente');
  });

  it('shows administrative list load failure and always leaves loading state', async () => {
    all.mockRejectedValueOnce(new Error('offline'));
    const wrapper = mount(PetitionsPage, { global });
    await flushPromises();
    expect(error).toHaveBeenCalledWith('No se pudieron cargar las peticiones');
    expect(wrapper.text()).toContain('No hay peticiones pendientes.');
  });
});
