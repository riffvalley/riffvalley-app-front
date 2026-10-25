// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import CreateUserDialog from './CreateUserDialog.vue';

type CreateUserDialogWrapper = VueWrapper<InstanceType<typeof CreateUserDialog>>;

describe('CreateUserDialog', () => {
  let wrapper: CreateUserDialogWrapper | undefined;

  function render(props: Partial<InstanceType<typeof CreateUserDialog>['$props']> = {}) {
    wrapper = mount(CreateUserDialog, {
      attachTo: document.body,
      props: {
        open: true,
        modelValue: { email: 'new@example.test', username: 'new-user', password: 'Password1' },
        passwordError: '',
        passwordVisible: false,
        ...props,
      },
    });
    return wrapper;
  }

  function teleported<T extends Element>(selector: string) {
    const element = document.body.querySelector<T>(selector);
    if (!element) throw new Error(`Missing teleported element: ${selector}`);
    return element;
  }

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    document.body.innerHTML = '';
  });

  it('renders the provided values, fields and fixed User role message', () => {
    render();

    expect((teleported('input[type="email"]') as HTMLInputElement).value).toBe('new@example.test');
    expect((teleported('input[placeholder="nombreusuario"]') as HTMLInputElement).value).toBe('new-user');
    expect((teleported('input[placeholder="Mínimo 6 caracteres"]') as HTMLInputElement).value).toBe('Password1');
    expect(document.body.textContent).toContain('Las cuentas nuevas se crean con el rol User.');
    expect(document.body.textContent).toContain('Crear Nuevo Usuario');
  });

  it('emits updated form values and password visibility changes', async () => {
    const component = render();
    const username = teleported<HTMLInputElement>('input[placeholder="nombreusuario"]');
    username.value = 'updated-user';
    username.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(component.emitted('update:modelValue')).toEqual([
      [{ email: 'new@example.test', username: 'updated-user', password: 'Password1' }],
    ]);

    teleported<HTMLButtonElement>('.modal-content button[type="button"]:not(.modal-close)').click();
    expect(component.emitted('update:passwordVisible')).toEqual([[true]]);
  });

  it('emits confirmation and cancellation without performing business work', () => {
    const component = render();
    const form = teleported<HTMLFormElement>('form');
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(component.emitted('submit')).toHaveLength(1);

    teleported<HTMLButtonElement>('.modal-btn-cancel').click();
    expect(component.emitted('close')).toHaveLength(1);
  });

  it('emits close when the overlay itself is clicked', () => {
    const component = render();
    teleported<HTMLDivElement>('.modal-overlay').click();

    expect(component.emitted('close')).toHaveLength(1);
  });

  it('exposes a named modal, labelled fields, named icon buttons and keyboard focus behavior', async () => {
    const component = render();
    await nextTick();
    const dialog = teleported<HTMLElement>('[role="dialog"]');
    const email = teleported<HTMLInputElement>('#create-user-email');
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('create-user-dialog-title');
    expect(teleported<HTMLButtonElement>('.modal-close').getAttribute('aria-label')).toBe('Cerrar diálogo de creación de usuario');
    expect(teleported<HTMLButtonElement>('.relative button').getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(teleported<HTMLLabelElement>('label[for="create-user-email"]').control).toBe(email);
    expect(email).toBe(document.activeElement);

    focusable[0].focus();
    const backwardsTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    focusable[0].dispatchEvent(backwardsTab);
    expect(backwardsTab.defaultPrevented).toBe(true);
    expect(focusable.at(-1)).toBe(document.activeElement);

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(component.emitted('close')).toHaveLength(1);
  });

  it('hides when closed and displays validation errors while disabling confirmation', () => {
    render({ open: false });
    expect(document.body.querySelector('.modal-overlay')).toBeNull();

    wrapper?.unmount();
    wrapper = render({ passwordError: 'Incluir mayúscula' });

    expect(document.body.textContent).toContain('Incluir mayúscula');
    expect(teleported<HTMLButtonElement>('.modal-btn-primary').disabled).toBe(true);
  });
});
