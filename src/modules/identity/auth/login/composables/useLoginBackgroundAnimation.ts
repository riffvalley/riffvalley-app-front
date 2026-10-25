import { onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';

export type LoginBackgroundMode = 'none' | 'waves' | 'constellation' | 'nebula';

export function useLoginBackgroundAnimation(
  canvasEl: Ref<HTMLCanvasElement | null>,
  bgMode: Ref<LoginBackgroundMode>,
) {
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

    let cleanupCanvas: (() => void) | undefined;

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

      cleanupCanvas = () => {
        cancelAnimationFrame(animFrameId);
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', onMouseMove);
      };
    };

    onMounted(startCanvas);

    onUnmounted(() => {
      if (cleanupCanvas) cleanupCanvas();
      else cancelAnimationFrame(animFrameId);
    });

}
