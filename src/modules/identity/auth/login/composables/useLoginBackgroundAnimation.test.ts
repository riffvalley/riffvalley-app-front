// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import {
  useLoginBackgroundAnimation,
  type LoginBackgroundMode,
} from './useLoginBackgroundAnimation';

describe('useLoginBackgroundAnimation', () => {
  let frameId: number;
  let frames: Map<number, FrameRequestCallback>;
  let context: {
    clearRect: ReturnType<typeof vi.fn>;
    createLinearGradient: ReturnType<typeof vi.fn>;
    createRadialGradient: ReturnType<typeof vi.fn>;
    beginPath: ReturnType<typeof vi.fn>;
    moveTo: ReturnType<typeof vi.fn>;
    lineTo: ReturnType<typeof vi.fn>;
    arc: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
    stroke: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    frameId = 0;
    frames = new Map();
    const gradient = { addColorStop: vi.fn() };
    context = {
      clearRect: vi.fn(),
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    };
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      const id = ++frameId;
      frames.set(id, callback);
      return id;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function mountAnimation(mode: LoginBackgroundMode = 'none') {
    const TestHost = defineComponent({
      setup() {
        const canvasEl = ref<HTMLCanvasElement | null>(null);
        const bgMode = ref(mode);
        useLoginBackgroundAnimation(canvasEl, bgMode);
        return { canvasEl };
      },
      template: '<canvas ref="canvasEl"></canvas>',
    });

    return mount(TestHost);
  }

  it('initializes the canvas engine and registers its window listeners', () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    const wrapper = mountAnimation();
    const canvas = wrapper.get('canvas').element as HTMLCanvasElement;

    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    expect(canvas.width).toBe(window.innerWidth);
    expect(canvas.height).toBe(window.innerHeight);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
    expect(addListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(addListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(frames.size).toBe(1);

    wrapper.unmount();
  });

  it.each([
    ['waves', 'createLinearGradient'],
    ['constellation', 'arc'],
    ['nebula', 'createRadialGradient'],
  ] as const)('runs the %s renderer selected by the current mode', (mode, rendererCall) => {
    const wrapper = mountAnimation(mode);

    expect(context[rendererCall]).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('continues the RAF loop and cancels it with both listeners on unmount', () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const wrapper = mountAnimation();
    const [[activeFrameId, callback]] = [...frames.entries()];

    frames.delete(activeFrameId);
    callback(16);

    expect(context.clearRect).toHaveBeenCalledTimes(2);
    expect(frames.size).toBe(1);

    wrapper.unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(frameId);
    expect(frames.size).toBe(0);
    expect(removeListener).toHaveBeenCalledWith('resize', addListener.mock.calls[0][1]);
    expect(removeListener).toHaveBeenCalledWith('mousemove', addListener.mock.calls[1][1]);
  });
});
