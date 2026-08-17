import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginBackground from './LoginBackground.vue';

describe('LoginBackground lifecycle', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(), createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })), createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });
  it('creates and explicitly cleans RAF, resize, and mousemove resources', () => {
    const add = vi.spyOn(window, 'addEventListener'); const remove = vi.spyOn(window, 'removeEventListener');
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42); const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const wrapper = mount(LoginBackground);
    expect(raf).toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(add).toHaveBeenCalledWith('mousemove', expect.any(Function));
    wrapper.unmount();
    expect(cancel).toHaveBeenCalledWith(42);
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function));
  });
});
