// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import SuggestRequestPage from '../../../src/app/components/SuggestRequestPage.vue';

const { fetchOptions, create, fetchMine, success, error } = vi.hoisted(() => ({
  fetchOptions: vi.fn(), create: vi.fn(), fetchMine: vi.fn(), success: vi.fn(), error: vi.fn(),
}));

vi.mock('@/app/dependencies/requests', () => ({
  fetchRequestCatalogOptions: fetchOptions,
  createDiscRequest: create,
  fetchMyDiscRequests: fetchMine,
}));
const selectStub = {
  props: ['modelValue', 'options'],
  template: '<select :value="modelValue"><option v-for="option in options" :key="option.id">{{ option.name }}</option></select>',
};

describe('/suggest app composition', () => {
  it('loads Catalog through app and passes minimal genre/country options to the Releases view', async () => {
    fetchOptions.mockResolvedValueOnce({
      genres: [{ id: 'g1', name: 'Rock', color: '#123456' }],
      countries: [{ id: 'c1', name: 'España', isoCode: 'ES' }],
    });
    fetchMine.mockResolvedValueOnce([]);
    const wrapper = mount(SuggestRequestPage, {
      props: { notifySuccess: success, notifyError: error },
      global: { stubs: { SearchableSelect: selectStub } },
    });
    await flushPromises();

    expect(fetchOptions).toHaveBeenCalledOnce();
    expect(fetchMine).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('Rock');
    expect(wrapper.text()).toContain('España');
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
