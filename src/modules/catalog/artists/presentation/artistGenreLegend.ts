// Leyenda de colores de género: cada color de la base de datos agrupa un bloque
// de géneros afines. Los géneros llegan del backend, así que un género nuevo
// aparece solo en su bloque; aquí solo se da nombre y orden a cada color.

export interface LegendGenre {
  id: string;
  name: string;
  color: string;
}

export interface GenreLegendBlock {
  key: string;
  label: string;
  color: string;
  genres: LegendGenre[];
}

const BLOCKS: { color: string; label: string }[] = [
  { color: "dimgray", label: "Metal extremo" },
  { color: "palevioletred", label: "Metalcore y progresivo" },
  { color: "green", label: "Heavy, power y melódico" },
  { color: "sienna", label: "Doom, sludge y stoner" },
  { color: "goldenrod", label: "Punk y hardcore" },
  { color: "red", label: "Rock" },
  { color: "blue", label: "Nu metal" },
  { color: "darkgray", label: "Experimental y alternativo" },
];

const UNKNOWN_GENRE_NAMES = new Set(["?", ""]);

export function buildGenreLegend(genres: readonly LegendGenre[]): GenreLegendBlock[] {
  const byColor = new Map<string, LegendGenre[]>();
  for (const genre of genres) {
    if (UNKNOWN_GENRE_NAMES.has(genre.name.trim())) continue;
    const key = (genre.color || "").trim().toLowerCase() || "sin-color";
    const list = byColor.get(key) ?? [];
    list.push(genre);
    byColor.set(key, list);
  }

  const sortByName = (list: LegendGenre[]) =>
    [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));

  const known = BLOCKS.filter((block) => byColor.has(block.color)).map((block) => {
    const list = byColor.get(block.color)!;
    return { key: block.color, label: block.label, color: list[0].color, genres: sortByName(list) };
  });

  const knownColors = new Set(BLOCKS.map((block) => block.color));
  const others = [...byColor.entries()]
    .filter(([color]) => !knownColors.has(color))
    .map(([color, list]) => ({ key: color, label: "Otros", color: list[0].color, genres: sortByName(list) }));

  return [...known, ...others];
}
