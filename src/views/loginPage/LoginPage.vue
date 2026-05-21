<template>
<div
  class="min-h-[100svh] flex flex-col items-center justify-center
          py-6 sm:py-8
          bg-gradient-to-br from-orange-50 via-purple-50 to-blue-100
          dark:from-[#0d0010] dark:via-rv-darkBg dark:to-[#00102a]
          relative overflow-x-hidden"
  @click="fabOpen = false"
>
  <!-- Canvas partículas -->
  <canvas ref="canvasEl" class="pointer-events-none fixed inset-0 z-0 w-full h-full"></canvas>

    <!-- CARD ÚNICA -->
    <div class="relative z-10 w-full max-w-sm shadow-lg rounded-3xl overflow-hidden bg-white dark:bg-rv-darkCard border border-gray-100 dark:border-white/10">

      <!-- HEADER -->
      <div class="relative px-6 pt-6 pb-5 text-center
         bg-gradient-to-b from-[#fe7b4a] via-[#a569aa] to-[#1464d0]">
        <img src="/bg-mountains.jpg" alt="" class="absolute bottom-0 left-0 w-full h-full
         scale-[1.05] origin-bottom
         pointer-events-none select-none" />

        <div class="relative z-10">
          <img src="/LOGO-RIFF-VALLEY.svg" alt="Riff Valley Logo" class="w-16 h-16 mx-auto mb-3 drop-shadow" />
          <div class="flex items-baseline justify-center gap-[2px]">
            <span class="font-brand text-4xl tracking-wide text-white drop-shadow-sm">RIFF VALLEY</span>
            <span class="text-sm font-medium tracking-widest lowercase text-white/80 relative top-[2px]">app</span>
          </div>
        </div>
      </div>

      <!-- FORM -->
      <div class="p-5">
        <form @submit.prevent="handleLogin" class="space-y-3 w-full">
          <input type="text" v-model="username" placeholder="Usuario" class="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-full
       bg-white dark:bg-rv-darkSurface
       text-gray-800 dark:text-white
       placeholder:text-gray-400 dark:placeholder:text-gray-500
       focus:outline-none focus:ring-2 focus:ring-rv-pink/40" />

          <div class="relative">
            <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="Contraseña" class="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-full
       bg-white dark:bg-rv-darkSurface
       text-gray-800 dark:text-white
       placeholder:text-gray-400 dark:placeholder:text-gray-500
       focus:outline-none focus:ring-2 focus:ring-rv-pink/40" />
            <button type="button" @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2
                     bg-transparent text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white
                     border-0 outline-none focus:outline-none focus-visible:outline-none
                     ring-0 focus:ring-0 focus-visible:ring-0 active:bg-transparent">
              <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" class="text-sm"></i>
            </button>
          </div>

          <button type="submit" class="w-full bg-gradient-to-r from-[#0c6ddc] to-[#0a56b3]
         text-white font-bold py-2 rounded-full
         shadow-md shadow-blue-900/25
         hover:from-[#0a5fc2] hover:to-[#084a9a]
         hover:shadow-md hover:shadow-blue-900/40 hover:-translate-y-[1px]
         active:scale-[0.98] active:translate-y-0 active:shadow-md
         transition-transform transition-shadow transition-colors duration-200 ease-out
         focus:outline-none focus:ring-4 focus:ring-rv-blueDark/25" :disabled="loading">
            {{ loading ? "Accediendo..." : "Login" }}
          </button>

          <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>
        </form>
      </div>
    </div>

    <!-- Botones inferiores -->
    <div class="mt-4 sm:mt-5 flex items-center justify-center gap-3">
      <button @click="showHowToUse = true"
        class="inline-flex items-center text-[#211d1d] dark:text-white font-semibold px-4 py-2 rounded-full shadow-md
               bg-gray-100 dark:bg-rv-darkCard hover:bg-gray-200 dark:hover:bg-rv-darkSurface
               hover:text-rv-navy dark:hover:text-white border border-gray-100 dark:border-white/10
               transition duration-100 hover:-translate-y-[1px]">
        <i class="fa-solid fa-circle-question text-md mr-2"></i>
        Cómo usar la app
      </button>

      <a href="https://riffvalley.es" target="_blank" rel="noopener noreferrer"
        class="inline-flex items-center text-[#211d1d] dark:text-white font-semibold px-4 py-2 rounded-full shadow-md
               bg-gray-100 dark:bg-rv-darkCard hover:bg-gray-200 dark:hover:bg-rv-darkSurface
               hover:text-rv-navy dark:hover:text-white border border-gray-100 dark:border-white/10
               transition duration-100 hover:-translate-y-[1px]">
        <i class="fa-solid fa-globe text-md mr-2"></i>
        riffvalley.es
      </a>
    </div>

    <!-- Solicitud de acceso -->
    <div class="mt-2 sm:mt-3 w-full max-w-sm px-4">
      <button @click="showAccessRequest = true"
        class="w-full rounded-2xl bg-white dark:bg-rv-darkCard shadow-md
               border border-gray-100 dark:border-white/10
               hover:-translate-y-[1px] hover:shadow-lg
               transition-all duration-150 overflow-hidden">
        <div class="h-1 w-full bg-gradient-to-r from-[#fe7b4a] via-[#a569aa] to-[#1464d0]"></div>
        <div class="flex items-center gap-3 px-4 py-3">
          <div class="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[#a569aa] to-[#1464d0] flex items-center justify-center shadow-sm">
            <i class="fa-solid fa-user-plus text-white text-sm"></i>
          </div>
          <div class="text-left">
            <p class="text-sm font-bold text-[#211d1d] dark:text-white leading-tight">¿Te gusta lo que ves y quieres votar discos?</p>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-300">Solicita acceso a Riff Valley app</p>
          </div>
          <i class="fa-solid fa-chevron-right text-xs text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0"></i>
        </div>
      </button>
    </div>

    <!-- Redes sociales -->
    <div class="mt-3 sm:mt-5 flex items-center justify-center gap-3">
      <a v-for="social in socials" :key="social.href" :href="social.href" target="_blank"
         class="relative group w-10 h-10 flex items-center justify-center rounded-full
                bg-gray-100 dark:bg-rv-darkCard text-[#211d1d] dark:text-white border border-gray-100 dark:border-white/10
                shadow-md hover:-translate-y-[1px] hover:text-white dark:hover:text-white
                transition-all duration-150"
         :class="social.hover">
        <span class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium rounded-lg
          bg-gray-800 dark:bg-white text-white dark:text-gray-900
          opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap pointer-events-none z-20">
          {{ social.label }}
        </span>
        <i :class="social.icon"></i>
      </a>
    </div>

    <!-- Switch modo oscuro -->
    <div class="mt-3 sm:mt-4 flex items-center justify-center">
      <label class="flex items-center justify-center gap-3 text-[#211d1d] dark:text-white/75 cursor-pointer">
        <i class="fa-regular fa-sun text-base transition-colors"
           :class="!isDarkMode ? 'text-rv-pink' : 'text-gray-400 dark:text-white/45'"></i>

        <button type="button" role="switch" :aria-checked="isDarkMode" @click.stop="toggleDarkMode"
          class="relative w-11 h-6 rounded-full transition-all duration-300
                 border border-gray-200 dark:border-white/20
                 bg-gray-200 dark:bg-white/15 hover:bg-gray-300 dark:hover:bg-white/25
                 outline-none focus:outline-none focus-visible:outline-none
                 ring-0 focus:ring-0 focus-visible:ring-0">
          <span class="absolute top-1/2 left-0.5 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-md
                       transition-transform duration-300"
                :class="isDarkMode ? 'translate-x-5' : 'translate-x-0'"></span>
        </button>

        <i class="fa-solid fa-moon text-base transition-colors"
           :class="isDarkMode ? 'text-rv-pink' : 'text-gray-400 dark:text-white/45'"></i>
      </label>
    </div>

    <!-- FAB - Cambiar fondo animado -->
    <div class="mt-3 sm:mt-4 flex justify-center" @click.stop>
      <div class="relative flex items-center justify-center w-10 h-10">

        <!-- Sub-buttons (arc, abre hacia arriba) -->
        <button
          v-for="(opt, i) in bgOptions"
          :key="opt.mode"
          type="button"
          @click.stop="bgMode = opt.mode; fabOpen = false"
          class="group absolute w-9 h-9
                 top-1/2 left-1/2 -ml-[18px] -mt-[18px]
                 rounded-full flex items-center justify-center text-sm
                 shadow-lg border transition-all duration-300 ease-out"
          :class="bgMode === opt.mode
            ? 'bg-rv-pink text-white border-rv-pink/60'
            : 'bg-gray-100/95 dark:bg-white/15 text-gray-700 dark:text-white border-gray-200 dark:border-white/20 hover:bg-rv-pink hover:text-white hover:border-rv-pink/50'"
          :style="{
            transform: fabOpen
              ? `${arcTransforms[i]}${bgMode === opt.mode ? ' scale(1.12)' : ' scale(1)'}`
              : 'translate(0, 0) scale(0.3)',
            opacity: fabOpen ? '1' : '0',
            transitionDelay: fabOpen ? (i * 55) + 'ms' : '0ms',
            pointerEvents: fabOpen ? 'auto' : 'none',
          }"
        >
          <i :class="opt.icon"></i>
          <!-- Tooltip -->
          <span class="absolute top-full mt-2
                       px-2 py-1 text-[10px] font-semibold rounded-lg whitespace-nowrap
                       bg-gray-800 dark:bg-white text-white dark:text-gray-900
                       opacity-0 group-hover:opacity-100 transition-opacity duration-150
                       pointer-events-none z-30 shadow-md"
                :class="i === 0 ? 'right-0' : i === 3 ? 'left-0' : 'left-1/2 -translate-x-1/2'">
            {{ opt.label }}
          </span>
        </button>

        <!-- Trigger principal -->
        <button
          type="button"
          @click.stop="fabOpen = !fabOpen"
          title="Cambiar fondo animado"
          class="relative z-10 w-10 h-10 rounded-full
                 flex items-center justify-center
                 border shadow-md
                 transition-all duration-300
                 outline-none focus:outline-none focus-visible:outline-none
                 ring-0 focus:ring-0 focus-visible:ring-0"
          :class="fabOpen
            ? 'bg-rv-purple text-white border-rv-purple/60 rotate-[30deg] scale-110'
            : 'bg-gray-100 dark:bg-white/15 text-gray-600 dark:text-white border-gray-200 dark:border-white/20 hover:bg-rv-purple hover:text-white hover:border-rv-purple/50'"
        >
          <i class="fa-solid fa-wand-magic-sparkles text-sm"></i>
        </button>
      </div>
    </div>

    <HowToUseModal v-if="showHowToUse" @close="showHowToUse = false" />
  </div>

  <AccessRequestModal v-if="showAccessRequest" @close="showAccessRequest = false" />
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '../../stores/auth/auth';
import { useRouter } from 'vue-router';
import HowToUseModal from '@/components/HowToUseModal.vue';
import AccessRequestModal from '@/components/AccessRequestModal.vue';

type BgMode = 'none' | 'waves' | 'constellation' | 'nebula';

export default defineComponent({
  components: { HowToUseModal, AccessRequestModal },
  setup() {
    const username = ref('');
    const password = ref('');
    const loading = ref(false);
    const error = ref<string | null>(null);
    const showPassword = ref(false);
    const showHowToUse = ref(false);
    const showAccessRequest = ref(false);
    const canvasEl = ref<HTMLCanvasElement | null>(null);

    const isDarkMode = ref(document.documentElement.classList.contains('dark'));
    const bgMode = ref<BgMode>((localStorage.getItem('bgMode') as BgMode) || 'none');
    const fabOpen = ref(false);

    const bgOptions = [
      { mode: 'none'          as BgMode, icon: 'fa-solid fa-ban',          label: 'Sin animación'  },
      { mode: 'waves'         as BgMode, icon: 'fa-solid fa-water',         label: 'Ondas'          },
      { mode: 'constellation' as BgMode, icon: 'fa-solid fa-circle-nodes',  label: 'Constelaciones' },
      { mode: 'nebula'        as BgMode, icon: 'fa-solid fa-burst',         label: 'Blur'           },
    ];

    // Arc positions (downward fan): translate from center of the trigger button
    const arcTransforms = [
      'translate(-58px, 38px)',
      'translate(-22px, 68px)',
      'translate(22px, 68px)',
      'translate(58px, 38px)',
    ];

    const socials = [
      { href: 'https://www.instagram.com/riffvalleyes', icon: 'fa-brands fa-instagram',  label: 'Instagram', hover: 'hover:bg-rv-pink dark:hover:bg-rv-pink'          },
      { href: 'https://www.facebook.com/riffvalleyes',  icon: 'fa-brands fa-facebook-f', label: 'Facebook',  hover: 'hover:bg-rv-blueDark dark:hover:bg-rv-blueDark'  },
      { href: 'https://t.me/riffvalleyes',              icon: 'fa-brands fa-telegram',   label: 'Telegram',  hover: 'hover:bg-rv-blue/70 dark:hover:bg-rv-blue/70'    },
      { href: 'https://www.tiktok.com/@riffvalley',     icon: 'fa-brands fa-tiktok',     label: 'TikTok',    hover: 'hover:bg-rv-navy dark:hover:bg-rv-navy'          },
      { href: 'https://open.spotify.com/user/vy0sh3a649tix6bfajzstx5xq', icon: 'fa-brands fa-spotify', label: 'Spotify', hover: 'hover:bg-green-500 dark:hover:bg-green-500' },
      { href: 'https://x.com/riffvalleyes',             icon: 'fa-brands fa-x-twitter',  label: 'X / Twitter', hover: 'hover:bg-rv-navy dark:hover:bg-rv-navy'       },
      { href: 'https://www.threads.net/@riffvalleyes',  icon: 'fa-brands fa-threads',    label: 'Threads',   hover: 'hover:bg-rv-purple dark:hover:bg-rv-purple'      },
      { href: 'https://bsky.app/profile/riffvalleyes.bsky.social', icon: 'fa-solid fa-cloud', label: 'Bluesky', hover: 'hover:bg-rv-blue/60 dark:hover:bg-rv-blue/60' },
    ];

    // ── Auth helpers ─────────────────────────────────────────
    const applyDarkMode = (enabled: boolean) => {
      document.documentElement.classList.toggle('dark', enabled);
      localStorage.setItem('theme', enabled ? 'dark' : 'light');
      isDarkMode.value = enabled;
    };
    const toggleDarkMode = () => applyDarkMode(!isDarkMode.value);

    // ── Wave animation ────────────────────────────────────────
    let animFrameId = 0;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let smoothMouseY = window.innerHeight / 2;

    interface Wave {
      frequency: number; amplitude: number; speed: number; phase: number;
      yBase: number; colorLight: string; colorDark: string; lineWidth: number;
    }

    const WAVES: Wave[] = [
      { frequency: 2.2, amplitude: 38, speed: 0.008, phase: 0,   yBase: 0.20, lineWidth: 1.8, colorLight: 'rgba(168,85,247,0.20)',  colorDark: 'rgba(192,132,252,0.26)' },
      { frequency: 3.5, amplitude: 22, speed: 0.013, phase: 1.2, yBase: 0.35, lineWidth: 1.4, colorLight: 'rgba(236,72,153,0.17)',  colorDark: 'rgba(244,114,182,0.22)' },
      { frequency: 1.7, amplitude: 50, speed: 0.006, phase: 2.5, yBase: 0.50, lineWidth: 2.4, colorLight: 'rgba(59,130,246,0.15)',  colorDark: 'rgba(96,165,250,0.20)'  },
      { frequency: 4.1, amplitude: 16, speed: 0.018, phase: 0.7, yBase: 0.42, lineWidth: 1.0, colorLight: 'rgba(251,146,60,0.13)',  colorDark: 'rgba(251,146,60,0.18)'  },
      { frequency: 2.8, amplitude: 34, speed: 0.010, phase: 3.8, yBase: 0.62, lineWidth: 1.6, colorLight: 'rgba(139,92,246,0.15)',  colorDark: 'rgba(167,139,250,0.20)' },
      { frequency: 1.4, amplitude: 58, speed: 0.005, phase: 1.9, yBase: 0.73, lineWidth: 2.8, colorLight: 'rgba(59,130,246,0.10)',  colorDark: 'rgba(96,165,250,0.15)'  },
      { frequency: 5.0, amplitude: 13, speed: 0.022, phase: 4.4, yBase: 0.28, lineWidth: 0.9, colorLight: 'rgba(236,72,153,0.11)',  colorDark: 'rgba(244,114,182,0.16)' },
      { frequency: 3.2, amplitude: 28, speed: 0.009, phase: 2.1, yBase: 0.82, lineWidth: 1.3, colorLight: 'rgba(168,85,247,0.12)',  colorDark: 'rgba(192,132,252,0.17)' },
    ];

    const drawWaves = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      const dark = document.documentElement.classList.contains('dark');
      smoothMouseY += (mouseY - smoothMouseY) * 0.05;
      const mouseInfluence = smoothMouseY / h;

      for (const wave of WAVES) {
        wave.phase += wave.speed;
        const proximity = 1 - Math.abs(mouseInfluence - wave.yBase) * 2.8;
        const ampBoost = proximity > 0 ? proximity * 22 : 0;
        const amp = wave.amplitude + ampBoost;

        const grad = ctx.createLinearGradient(0, 0, w, 0);
        const col = dark ? wave.colorDark : wave.colorLight;
        grad.addColorStop(0,    col.replace(/[\d.]+\)$/, '0)'));
        grad.addColorStop(0.12, col);
        grad.addColorStop(0.88, col);
        grad.addColorStop(1,    col.replace(/[\d.]+\)$/, '0)'));

        ctx.beginPath();
        const yCenter = wave.yBase * h;
        for (let x = 0; x <= w; x += 2) {
          const angle = (x / w) * Math.PI * 2 * wave.frequency + wave.phase;
          const y = yCenter + Math.sin(angle) * amp;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = wave.lineWidth;
        ctx.stroke();
      }
    };

    // ── Constellation animation ───────────────────────────────
    interface Particle { x: number; y: number; vx: number; vy: number; bvx: number; bvy: number; r: number }
    const particles: Particle[] = [];
    const PARTICLE_MAX_DIST = 140;
    const REPEL_RADIUS = 110;
    const REPEL_FORCE  = 2.8;
    const MAX_SPEED    = 5;

    const initParticles = (w: number, h: number) => {
      particles.length = 0;
      const count = Math.min(90, Math.floor((w * h) / 10000));
      for (let i = 0; i < count; i++) {
        const bvx = (Math.random() - 0.5) * 0.35;
        const bvy = (Math.random() - 0.5) * 0.35;
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: bvx, vy: bvy,
          bvx, bvy,
          r: Math.random() * 1.8 + 0.8,
        });
      }
    };

    const drawConstellation = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      const dark = document.documentElement.classList.contains('dark');
      const dotColor = dark ? 'rgba(220,210,255,0.75)' : 'rgba(100,80,180,0.45)';
      const lineBase  = dark ? '180,160,255,' : '100,80,200,';

      for (const p of particles) {
        // Mouse repulsion
        const mdx = p.x - mouseX;
        const mdy = p.y - mouseY;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < REPEL_RADIUS && mdist > 0) {
          const force = ((REPEL_RADIUS - mdist) / REPEL_RADIUS) * REPEL_FORCE;
          p.vx += (mdx / mdist) * force;
          p.vy += (mdy / mdist) * force;
        }

        // Damping + drift back toward base velocity
        p.vx = p.vx * 0.91 + p.bvx * 0.09;
        p.vy = p.vy * 0.91 + p.bvy * 0.09;

        // Clamp speed
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > MAX_SPEED) { p.vx = (p.vx / spd) * MAX_SPEED; p.vy = (p.vy / spd) * MAX_SPEED; }

        // Move + wrap
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < PARTICLE_MAX_DIST) {
            const alpha = (1 - dist / PARTICLE_MAX_DIST) * (dark ? 0.35 : 0.22);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${lineBase}${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
    };

    // ── Nebula / blob animation ───────────────────────────────
    interface Blob { x: number; y: number; vx: number; vy: number; r: number; phase: number; cl: string; cd: string }
    const blobs: Blob[] = [];

    const BLOB_DEFS = [
      { cl: '168,85,247,',  cd: '139,92,246,'   },
      { cl: '236,72,153,',  cd: '244,114,182,'  },
      { cl: '59,130,246,',  cd: '96,165,250,'   },
      { cl: '251,146,60,',  cd: '251,146,60,'   },
      { cl: '16,185,129,',  cd: '52,211,153,'   },
      { cl: '245,158,11,',  cd: '251,191,36,'   },
    ];

    const initBlobs = (w: number, h: number) => {
      blobs.length = 0;
      for (const def of BLOB_DEFS) {
        blobs.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          r: Math.min(w, h) * (0.18 + Math.random() * 0.18),
          phase: Math.random() * Math.PI * 2,
          cl: def.cl,
          cd: def.cd,
        });
      }
    };

    const drawNebula = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      const dark = document.documentElement.classList.contains('dark');
      for (const b of blobs) {
        // Oscilación orgánica: deriva lineal + ondulación sinusoidal
        b.phase += 0.007;
        b.x += b.vx + Math.sin(b.phase) * 0.55;
        b.y += b.vy + Math.cos(b.phase * 0.75) * 0.55;
        if (b.x < -b.r) b.x = w + b.r; if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r; if (b.y > h + b.r) b.y = -b.r;

        // Radio con leve pulso de "respiración"
        const drawR = b.r * (1 + Math.sin(b.phase * 1.4) * 0.06);

        const color = dark ? b.cd : b.cl;
        const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, drawR);
        grd.addColorStop(0,   `rgba(${color}${dark ? 0.22 : 0.16})`);
        grd.addColorStop(0.5, `rgba(${color}${dark ? 0.09 : 0.07})`);
        grd.addColorStop(1,   `rgba(${color}0)`);

        ctx.beginPath();
        ctx.arc(b.x, b.y, drawR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }
    };

    // ── Canvas loop ───────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };

    const startCanvas = () => {
      const canvas = canvasEl.value;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;

      const resize = () => {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles(canvas.width, canvas.height);
        initBlobs(canvas.width, canvas.height);
      };
      resize();
      window.addEventListener('resize', resize);
      window.addEventListener('mousemove', onMouseMove);

      const loop = () => {
        const mode = bgMode.value;
        if      (mode === 'waves')         drawWaves(ctx, canvas.width, canvas.height);
        else if (mode === 'constellation') drawConstellation(ctx, canvas.width, canvas.height);
        else if (mode === 'nebula')        drawNebula(ctx, canvas.width, canvas.height);
        else                               ctx.clearRect(0, 0, canvas.width, canvas.height);
        animFrameId = requestAnimationFrame(loop);
      };
      loop();

      (canvas as any)._cleanup = () => {
        cancelAnimationFrame(animFrameId);
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', onMouseMove);
      };
    };

    watch(bgMode, (val) => localStorage.setItem('bgMode', val));

    onMounted(() => {
      applyDarkMode(localStorage.getItem('theme') === 'dark');
      startCanvas();
    });

    onUnmounted(() => {
      const canvas = canvasEl.value;
      if (canvas && (canvas as any)._cleanup) (canvas as any)._cleanup();
      else cancelAnimationFrame(animFrameId);
    });

    const authStore = useAuthStore();
    const router = useRouter();

    const handleLogin = async () => {
      error.value = null;
      loading.value = true;
      try {
        await authStore.login({ username: username.value, password: password.value });
        router.push({ name: 'Home' });
      } catch {
        error.value = 'Acceso fallido. Revisa tus credenciales.';
      } finally {
        loading.value = false;
      }
    };

    return {
      username, password, showPassword, loading, error, handleLogin,
      showHowToUse, showAccessRequest,
      isDarkMode, toggleDarkMode,
      canvasEl,
      bgMode, bgOptions, fabOpen, arcTransforms,
      socials,
    };
  },
});
</script>

<style scoped>
body {
  background-color: #f9f9f9;
  font-family: 'Inter', sans-serif;
}
</style>
