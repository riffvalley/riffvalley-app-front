import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginForm from './LoginForm.vue';

const mocks = vi.hoisted(() => ({ login: vi.fn(), push: vi.fn() }));
vi.mock('../model/auth.store', () => ({ useAuthStore: () => ({ login: mocks.login }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));

describe('LoginForm', () => {
  beforeEach(() => { mocks.login.mockReset(); mocks.push.mockReset(); });
  it('binds credentials, submits, and toggles password visibility', async () => {
    mocks.login.mockResolvedValue(undefined);
    const wrapper = mount(LoginForm);
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('ana'); await inputs[1].setValue('secret');
    expect(inputs[1].attributes('type')).toBe('password');
    await wrapper.get('button[type="button"]').trigger('click');
    expect(inputs[1].attributes('type')).toBe('text');
    await wrapper.get('form').trigger('submit');
    expect(mocks.login).toHaveBeenCalledWith({ username: 'ana', password: 'secret' });
  });
  it('disables the button while login is pending', async () => {
    let resolveLogin!: () => void;
    mocks.login.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));
    const wrapper = mount(LoginForm);
    await wrapper.get('form').trigger('submit'); await wrapper.vm.$nextTick();
    const submit = wrapper.get('button[type="submit"]');
    expect(submit.attributes()).toHaveProperty('disabled'); expect(submit.text()).toBe('Accediendo...');
    resolveLogin();
  });
  it('shows the stable login error', async () => {
    mocks.login.mockRejectedValue(new Error('bad credentials'));
    const wrapper = mount(LoginForm); await wrapper.get('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.text()).toContain('Acceso fallido. Revisa tus credenciales.'));
  });
});
