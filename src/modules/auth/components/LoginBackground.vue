<template>
  <canvas ref="canvas" class="pointer-events-none fixed inset-0 z-0 w-full h-full"></canvas>
  <div class="relative z-10 mt-2 sm:mt-4 flex justify-center" @click.stop>
    <div class="relative flex items-center justify-center w-10 h-10">
      <button v-for="(option, index) in options" :key="option.mode" type="button"
        class="absolute w-9 h-9 top-1/2 left-1/2 -ml-[18px] -mt-[18px] rounded-full shadow-lg border transition-all duration-300"
        :class="mode === option.mode ? 'bg-rv-pink text-white' : 'bg-gray-100/95 dark:bg-white/15 dark:text-white'"
        :style="{ transform: open ? transforms[index] : 'translate(0,0) scale(.3)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }"
        :title="option.label" @click.stop="mode = option.mode; open = false">
        <i :class="option.icon"></i>
      </button>
      <button type="button" title="Cambiar fondo animado" @click.stop="open = !open"
        class="relative z-10 w-10 h-10 rounded-full border shadow-md transition-all bg-gray-100 dark:bg-white/15 text-gray-600 dark:text-white">
        <i class="fa-solid fa-wand-magic-sparkles text-sm"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

type Mode = 'none' | 'waves' | 'constellation' | 'nebula';
interface Particle { x: number; y: number; vx: number; vy: number }

const canvas = ref<HTMLCanvasElement | null>(null);
const mode = ref<Mode>((localStorage.getItem('bgMode') as Mode) || 'none');
const open = ref(false);
const options = [
  { mode: 'none' as Mode, icon: 'fa-solid fa-ban', label: 'Sin animación' },
  { mode: 'waves' as Mode, icon: 'fa-solid fa-water', label: 'Ondas' },
  { mode: 'constellation' as Mode, icon: 'fa-solid fa-circle-nodes', label: 'Constelaciones' },
  { mode: 'nebula' as Mode, icon: 'fa-solid fa-burst', label: 'Blur' },
];
const transforms = ['translate(-58px,38px)', 'translate(-22px,68px)', 'translate(22px,68px)', 'translate(58px,38px)'];
const particles: Particle[] = [];
let frame = 0;
let phase = 0;

function resize(): void {
  if (!canvas.value) return;
  canvas.value.width = window.innerWidth;
  canvas.value.height = window.innerHeight;
  particles.length = 0;
  const count = Math.min(90, Math.floor((canvas.value.width * canvas.value.height) / 10000));
  for (let i = 0; i < count; i++) particles.push({ x: Math.random() * canvas.value.width, y: Math.random() * canvas.value.height, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4 });
}

function draw(): void {
  const element = canvas.value;
  const ctx = element?.getContext('2d');
  if (!element || !ctx) return;
  ctx.clearRect(0, 0, element.width, element.height);
  phase += .01;
  const dark = document.documentElement.classList.contains('dark');
  if (mode.value === 'waves') {
    for (let row = 0; row < 7; row++) {
      ctx.beginPath();
      for (let x = 0; x <= element.width; x += 3) {
        const y = element.height * (.18 + row * .1) + Math.sin(x / element.width * Math.PI * (3 + row) + phase * (row + 1)) * (18 + row * 4);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = dark ? `rgba(192,132,252,${.12 + row * .015})` : `rgba(100,80,200,${.08 + row * .015})`;
      ctx.stroke();
    }
  } else if (mode.value === 'constellation') {
    for (const p of particles) {
      p.x = (p.x + p.vx + element.width) % element.width; p.y = (p.y + p.vy + element.height) % element.height;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fillStyle = dark ? '#c4b5fd' : '#7c3aed'; ctx.fill();
    }
  } else if (mode.value === 'nebula') {
    for (let i = 0; i < 5; i++) {
      const x = element.width * (.15 + i * .2) + Math.sin(phase + i) * 80;
      const y = element.height * (.3 + (i % 3) * .2) + Math.cos(phase * .8 + i) * 60;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.min(element.width, element.height) * .25);
      gradient.addColorStop(0, `rgba(${i % 2 ? '236,72,153' : '59,130,246'},${dark ? .18 : .12})`); gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, element.width, element.height);
    }
  }
  frame = requestAnimationFrame(draw);
}

watch(mode, (value) => localStorage.setItem('bgMode', value));
onMounted(() => { resize(); window.addEventListener('resize', resize); draw(); });
onUnmounted(() => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); });
</script>
