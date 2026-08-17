<template>
  <canvas ref="canvasEl" class="pointer-events-none fixed inset-0 z-0 w-full h-full"></canvas>
  <div class="mt-2 sm:mt-4 flex justify-center" @click.stop>
    <div class="relative flex items-center justify-center w-10 h-10">
      <button v-for="(opt, i) in bgOptions" :key="opt.mode" type="button"
        @click.stop="bgMode = opt.mode; fabOpen = false"
        class="group absolute w-9 h-9 top-1/2 left-1/2 -ml-[18px] -mt-[18px]
               rounded-full flex items-center justify-center text-sm
               shadow-lg border transition-all duration-300 ease-out"
        :class="bgMode === opt.mode
          ? 'bg-rv-pink text-white border-rv-pink/60'
          : 'bg-gray-100/95 dark:bg-white/15 text-gray-700 dark:text-white border-gray-200 dark:border-white/20 hover:bg-rv-pink hover:text-white hover:border-rv-pink/50'"
        :style="{
          transform: fabOpen ? `${arcTransforms[i]}${bgMode === opt.mode ? ' scale(1.12)' : ' scale(1)'}` : 'translate(0, 0) scale(0.3)',
          opacity: fabOpen ? '1' : '0',
          transitionDelay: fabOpen ? (i * 55) + 'ms' : '0ms',
          pointerEvents: fabOpen ? 'auto' : 'none',
        }">
        <i :class="opt.icon"></i>
        <span class="absolute top-full mt-2 px-2 py-1 text-[10px] font-semibold rounded-lg whitespace-nowrap
                     bg-gray-800 dark:bg-white text-white dark:text-gray-900
                     opacity-0 group-hover:opacity-100 transition-opacity duration-150
                     pointer-events-none z-30 shadow-md"
          :class="i === 0 ? 'right-0' : i === 3 ? 'left-0' : 'left-1/2 -translate-x-1/2'">
          {{ opt.label }}
        </span>
      </button>
      <button type="button" @click.stop="fabOpen = !fabOpen" title="Cambiar fondo animado"
        class="relative z-10 w-10 h-10 rounded-full flex items-center justify-center border shadow-md
               transition-all duration-300 outline-none focus:outline-none focus-visible:outline-none
               ring-0 focus:ring-0 focus-visible:ring-0"
        :class="fabOpen
          ? 'bg-rv-purple text-white border-rv-purple/60 rotate-[30deg] scale-110'
          : 'bg-gray-100 dark:bg-white/15 text-gray-600 dark:text-white border-gray-200 dark:border-white/20 hover:bg-rv-purple hover:text-white hover:border-rv-purple/50'">
        <i class="fa-solid fa-wand-magic-sparkles text-sm"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

type BgMode = 'none' | 'waves' | 'constellation' | 'nebula';
interface Wave { frequency: number; amplitude: number; speed: number; phase: number; yBase: number; colorLight: string; colorDark: string; lineWidth: number }
interface Particle { x: number; y: number; vx: number; vy: number; bvx: number; bvy: number; r: number }
interface Blob { x: number; y: number; vx: number; vy: number; r: number; phase: number; cl: string; cd: string }

const canvasEl = ref<HTMLCanvasElement | null>(null);
const bgMode = ref<BgMode>((localStorage.getItem('bgMode') as BgMode) || 'none');
const fabOpen = ref(false);
const bgOptions = [
  { mode: 'none' as BgMode, icon: 'fa-solid fa-ban', label: 'Sin animación' },
  { mode: 'waves' as BgMode, icon: 'fa-solid fa-water', label: 'Ondas' },
  { mode: 'constellation' as BgMode, icon: 'fa-solid fa-circle-nodes', label: 'Constelaciones' },
  { mode: 'nebula' as BgMode, icon: 'fa-solid fa-burst', label: 'Blur' },
];
const arcTransforms = ['translate(-58px, 38px)', 'translate(-22px, 68px)', 'translate(22px, 68px)', 'translate(58px, 38px)'];
const WAVES: Wave[] = [
  { frequency: 2.2, amplitude: 38, speed: 0.008, phase: 0, yBase: 0.20, lineWidth: 1.8, colorLight: 'rgba(168,85,247,0.20)', colorDark: 'rgba(192,132,252,0.26)' },
  { frequency: 3.5, amplitude: 22, speed: 0.013, phase: 1.2, yBase: 0.35, lineWidth: 1.4, colorLight: 'rgba(236,72,153,0.17)', colorDark: 'rgba(244,114,182,0.22)' },
  { frequency: 1.7, amplitude: 50, speed: 0.006, phase: 2.5, yBase: 0.50, lineWidth: 2.4, colorLight: 'rgba(59,130,246,0.15)', colorDark: 'rgba(96,165,250,0.20)' },
  { frequency: 4.1, amplitude: 16, speed: 0.018, phase: 0.7, yBase: 0.42, lineWidth: 1.0, colorLight: 'rgba(251,146,60,0.13)', colorDark: 'rgba(251,146,60,0.18)' },
  { frequency: 2.8, amplitude: 34, speed: 0.010, phase: 3.8, yBase: 0.62, lineWidth: 1.6, colorLight: 'rgba(139,92,246,0.15)', colorDark: 'rgba(167,139,250,0.20)' },
  { frequency: 1.4, amplitude: 58, speed: 0.005, phase: 1.9, yBase: 0.73, lineWidth: 2.8, colorLight: 'rgba(59,130,246,0.10)', colorDark: 'rgba(96,165,250,0.15)' },
  { frequency: 5.0, amplitude: 13, speed: 0.022, phase: 4.4, yBase: 0.28, lineWidth: 0.9, colorLight: 'rgba(236,72,153,0.11)', colorDark: 'rgba(244,114,182,0.16)' },
  { frequency: 3.2, amplitude: 28, speed: 0.009, phase: 2.1, yBase: 0.82, lineWidth: 1.3, colorLight: 'rgba(168,85,247,0.12)', colorDark: 'rgba(192,132,252,0.17)' },
];
const particles: Particle[] = [];
const blobs: Blob[] = [];
const PARTICLE_MAX_DIST = 140;
const REPEL_RADIUS = 110;
const REPEL_FORCE = 2.8;
const MAX_SPEED = 5;
const BLOB_DEFS = [
  { cl: '168,85,247,', cd: '139,92,246,' }, { cl: '236,72,153,', cd: '244,114,182,' },
  { cl: '59,130,246,', cd: '96,165,250,' }, { cl: '251,146,60,', cd: '251,146,60,' },
  { cl: '16,185,129,', cd: '52,211,153,' }, { cl: '245,158,11,', cd: '251,191,36,' },
];

let animFrameId = 0;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let smoothMouseY = window.innerHeight / 2;

function drawWaves(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const dark = document.documentElement.classList.contains('dark');
  smoothMouseY += (mouseY - smoothMouseY) * 0.05;
  const mouseInfluence = smoothMouseY / h;
  for (const wave of WAVES) {
    wave.phase += wave.speed;
    const proximity = 1 - Math.abs(mouseInfluence - wave.yBase) * 2.8;
    const amp = wave.amplitude + (proximity > 0 ? proximity * 22 : 0);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    const col = dark ? wave.colorDark : wave.colorLight;
    grad.addColorStop(0, col.replace(/[\d.]+\)$/, '0)')); grad.addColorStop(0.12, col);
    grad.addColorStop(0.88, col); grad.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
    ctx.beginPath();
    const yCenter = wave.yBase * h;
    for (let x = 0; x <= w; x += 2) {
      const y = yCenter + Math.sin((x / w) * Math.PI * 2 * wave.frequency + wave.phase) * amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = grad; ctx.lineWidth = wave.lineWidth; ctx.stroke();
  }
}

function initParticles(w: number, h: number): void {
  particles.length = 0;
  const count = Math.min(90, Math.floor((w * h) / 10000));
  for (let i = 0; i < count; i++) {
    const bvx = (Math.random() - 0.5) * 0.35; const bvy = (Math.random() - 0.5) * 0.35;
    particles.push({ x: Math.random() * w, y: Math.random() * h, vx: bvx, vy: bvy, bvx, bvy, r: Math.random() * 1.8 + 0.8 });
  }
}

function drawConstellation(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const dark = document.documentElement.classList.contains('dark');
  const dotColor = dark ? 'rgba(220,210,255,0.75)' : 'rgba(100,80,180,0.45)';
  const lineBase = dark ? '180,160,255,' : '100,80,200,';
  for (const p of particles) {
    const mdx = p.x - mouseX; const mdy = p.y - mouseY; const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
    if (mdist < REPEL_RADIUS && mdist > 0) {
      const force = ((REPEL_RADIUS - mdist) / REPEL_RADIUS) * REPEL_FORCE;
      p.vx += (mdx / mdist) * force; p.vy += (mdy / mdist) * force;
    }
    p.vx = p.vx * 0.91 + p.bvx * 0.09; p.vy = p.vy * 0.91 + p.bvy * 0.09;
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > MAX_SPEED) { p.vx = (p.vx / speed) * MAX_SPEED; p.vy = (p.vy / speed) * MAX_SPEED; }
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = dotColor; ctx.fill();
  }
  for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
    const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y; const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < PARTICLE_MAX_DIST) {
      const alpha = (1 - dist / PARTICLE_MAX_DIST) * (dark ? 0.35 : 0.22);
      ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
      ctx.strokeStyle = `rgba(${lineBase}${alpha})`; ctx.lineWidth = 0.7; ctx.stroke();
    }
  }
}

function initBlobs(w: number, h: number): void {
  blobs.length = 0;
  for (const def of BLOB_DEFS) blobs.push({
    x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45,
    r: Math.min(w, h) * (0.18 + Math.random() * 0.18), phase: Math.random() * Math.PI * 2, cl: def.cl, cd: def.cd,
  });
}

function drawNebula(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const dark = document.documentElement.classList.contains('dark');
  for (const b of blobs) {
    b.phase += 0.007; b.x += b.vx + Math.sin(b.phase) * 0.55; b.y += b.vy + Math.cos(b.phase * 0.75) * 0.55;
    if (b.x < -b.r) b.x = w + b.r; if (b.x > w + b.r) b.x = -b.r;
    if (b.y < -b.r) b.y = h + b.r; if (b.y > h + b.r) b.y = -b.r;
    const drawR = b.r * (1 + Math.sin(b.phase * 1.4) * 0.06); const color = dark ? b.cd : b.cl;
    const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, drawR);
    gradient.addColorStop(0, `rgba(${color}${dark ? 0.22 : 0.16})`);
    gradient.addColorStop(0.5, `rgba(${color}${dark ? 0.09 : 0.07})`); gradient.addColorStop(1, `rgba(${color}0)`);
    ctx.beginPath(); ctx.arc(b.x, b.y, drawR, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
  }
}

function resize(): void {
  const canvas = canvasEl.value;
  if (!canvas) return;
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  initParticles(canvas.width, canvas.height); initBlobs(canvas.width, canvas.height);
}
function onMouseMove(event: MouseEvent): void { mouseX = event.clientX; mouseY = event.clientY; }
function loop(): void {
  const canvas = canvasEl.value; const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  if (bgMode.value === 'waves') drawWaves(ctx, canvas.width, canvas.height);
  else if (bgMode.value === 'constellation') drawConstellation(ctx, canvas.width, canvas.height);
  else if (bgMode.value === 'nebula') drawNebula(ctx, canvas.width, canvas.height);
  else ctx.clearRect(0, 0, canvas.width, canvas.height);
  animFrameId = requestAnimationFrame(loop);
}
function closeSelector(): void { fabOpen.value = false; }

defineExpose({ closeSelector });
watch(bgMode, (value) => localStorage.setItem('bgMode', value));
onMounted(() => { resize(); window.addEventListener('resize', resize); window.addEventListener('mousemove', onMouseMove); loop(); });
onUnmounted(() => { cancelAnimationFrame(animFrameId); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', onMouseMove); });
</script>
