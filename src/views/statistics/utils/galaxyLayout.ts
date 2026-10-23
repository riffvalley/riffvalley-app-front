import type { RatedDiscItem } from "@services/rates/rates";

const FALLBACK_COLOR = "#6b7280";
const NO_GENRE_LABEL = "Sin género";

/** Blanco o negro según la luminancia del color de fondo, para que un texto
 *  encima de un color de género arbitrario siempre se lea bien. */
export function textColorFor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#ffffff";
}

export interface GenreGroup {
  genre: string;
  color: string;
  discs: RatedDiscItem[];
}

/** Agrupa los discos por género (name), conservando su color real. */
export function groupByGenre(discs: RatedDiscItem[]): GenreGroup[] {
  const map = new Map<string, GenreGroup>();
  discs.forEach((disc) => {
    const genre = disc.genre?.name ?? NO_GENRE_LABEL;
    const color = disc.genre?.color || FALLBACK_COLOR;
    if (!map.has(genre)) map.set(genre, { genre, color, discs: [] });
    map.get(genre)!.discs.push(disc);
  });
  const groups = Array.from(map.values());
  groups.forEach((group) => group.discs.sort((a, b) => b.rate - a.rate));
  return groups.sort((a, b) => b.discs.length - a.discs.length);
}

export interface GalaxyStar {
  disc: RatedDiscItem;
  genre: string;
  color: string;
  /** Coordenadas de mundo, aprox. dentro de [-1, 1]. */
  x: number;
  y: number;
  /** Radio visual base (antes de aplicar zoom), en "unidades" arbitrarias. */
  radius: number;
}

export interface GalaxySector {
  genre: string;
  color: string;
  count: number;
  labelX: number;
  labelY: number;
  labelAngle: number;
}

export interface Galaxy {
  stars: GalaxyStar[];
  sectors: GalaxySector[];
}

/**
 * Reparte los discos como un cielo estrellado: cada género es una
 * "constelación" suelta (un centro repartido uniformemente alrededor del
 * círculo, con las estrellas de ese género dispersas a su alrededor con más
 * densidad hacia el centro), en vez de sectores tipo tarta con bordes rectos
 * — así el género agrupa por color y cercanía sin verse geométrico ni
 * caótico. Determinista (mismo input -> mismo layout) para que no "salte" al
 * reabrir el modal.
 */
export function buildGalaxy(discs: RatedDiscItem[]): Galaxy {
  if (!discs.length) return { stars: [], sectors: [] };

  const groups = groupByGenre(discs);
  const TAU = Math.PI * 2;

  // PRNG determinista (mulberry32) en vez de Math.random, para que el layout
  // sea estable entre renders/reaperturas del modal.
  let seed = 1337;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const stars: GalaxyStar[] = [];
  const sectors: GalaxySector[] = [];

  // Separación mínima entre estrellas (en coordenadas de mundo), para que no
  // queden pegadas unas a otras. Rejilla espacial para comprobarlo sin tener
  // que mirar los miles de puntos ya colocados uno a uno.
  const MIN_DIST = 0.02;
  const cellSize = MIN_DIST;
  const grid = new Map<string, { x: number; y: number }[]>();
  const cellKey = (x: number, y: number) => `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`;
  const isTooClose = (x: number, y: number) => nearestDistance(x, y) < MIN_DIST;

  // Distancia al punto ya colocado más cercano (Infinity si no hay ninguno en
  // las celdas vecinas). Sirve para, si ningún candidato queda lo bastante
  // libre, quedarnos con "el menos malo" en vez de rendirnos.
  const nearestDistance = (x: number, y: number) => {
    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    let min = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const points = grid.get(`${cx + dx}:${cy + dy}`);
        if (!points) continue;
        for (const p of points) {
          const d = Math.hypot(p.x - x, p.y - y);
          if (d < min) min = d;
        }
      }
    }
    return min;
  };
  const placePoint = (x: number, y: number) => {
    const key = cellKey(x, y);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push({ x, y });
  };

  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const TARGET_RADIUS = 0.94;
  const n = groups.length;

  // Centros de constelación repartidos por TODO el cielo desde el principio
  // (espiral de girasol / método de Vogel: radio ∝ √índice), en vez de ir
  // creciendo género a género — así no queda un hueco vacío en el centro ni
  // se amontonan los géneros sobrantes en el borde exterior.
  const cellRadius = TARGET_RADIUS / Math.sqrt(n); // separación media entre vecinos

  groups.forEach((group, gi) => {
    const clusterRadius = n === 1 ? 0 : TARGET_RADIUS * Math.sqrt((gi + 0.5) / n);
    const angle = gi * GOLDEN_ANGLE;
    const cx = Math.cos(angle) * clusterRadius;
    const cy = Math.sin(angle) * clusterRadius;
    // Más ancho que el hueco medio entre constelaciones vecinas, para que se
    // solapen un poco entre sí y el conjunto se sienta como un único cielo
    // continuo en vez de bolas sueltas separadas por espacio vacío.
    const spread = cellRadius * (1.35 + Math.min(Math.sqrt(group.discs.length) * 0.12, 1.2));

    group.discs.forEach((disc) => {
      const MAX_TRIES = 30;
      let x = cx;
      let y = cy;
      let fallbackScore = -Infinity;
      let placed = false;

      for (let attempt = 0; attempt < MAX_TRIES && !placed; attempt++) {
        const angle = rand() * TAU;
        const radius = Math.sqrt(rand()) * spread; // más denso hacia el centro de su propio género
        let candidateX = cx + Math.cos(angle) * radius;
        let candidateY = cy + Math.sin(angle) * radius;

        // Solo tira hacia dentro a los puntos que de verdad se salen del
        // cielo — no a todo un género entero al mismo radio fijo, que era lo
        // que producía el aro/halo donde se mezclaban todos los géneros.
        const dist = Math.hypot(candidateX, candidateY);
        if (dist > 1) {
          candidateX /= dist;
          candidateY /= dist;
        }

        const nearest = nearestDistance(candidateX, candidateY);
        if (nearest >= MIN_DIST) {
          x = candidateX;
          y = candidateY;
          placed = true;
          break;
        }
        if (nearest > fallbackScore) {
          fallbackScore = nearest;
          x = candidateX;
          y = candidateY;
        }
      }

      placePoint(x, y);
      stars.push({
        disc,
        genre: group.genre,
        color: group.color,
        x,
        y,
        radius: 1.0 + (disc.rate / 10) * 1.6,
      });
    });

    sectors.push({
      genre: group.genre,
      color: group.color,
      count: group.discs.length,
      labelX: cx,
      labelY: cy,
      labelAngle: angle,
    });
  });

  return { stars, sectors };
}
