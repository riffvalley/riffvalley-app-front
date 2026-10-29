const NO_GENRE_COLOR = "#404157";
const DARKEN_TARGET = "#00021f";
const GENRE_PALETTE = [
  "#68428a",
  "#8a405f",
  "#285f79",
  "#456b36",
  "#86501f",
  "#40518b",
] as const;
const backendNamedColors: Record<string, [number, number, number]> = {
  red: [255, 0, 0],
  darkgray: [169, 169, 169],
  palevioletred: [219, 112, 147],
  dimgray: [105, 105, 105],
  sienna: [160, 82, 45],
  goldenrod: [218, 165, 32],
  blue: [0, 0, 255],
  green: [0, 128, 0],
};
const parsedColorCache = new Map<string, [number, number, number] | null>();

function parseColor(color: string): [number, number, number] | null {
  const value = color.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (value) {
    const hex = value.length === 3 ? [...value].map((part) => part + part).join("") : value;
    return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
  }

  const normalized = color.trim().toLowerCase();
  if (parsedColorCache.has(normalized)) return parsedColorCache.get(normalized) ?? null;
  if (typeof document === "undefined" || !document.body) return backendNamedColors[normalized] ?? null;

  const probe = document.createElement("span");
  probe.style.color = color;
  if (!probe.style.color) {
    parsedColorCache.set(normalized, null);
    return null;
  }
  document.body.append(probe);
  const computedColor = window.getComputedStyle(probe).color;
  probe.remove();
  const channels = computedColor.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  const parsed = channels
    ? [Number(channels[1]), Number(channels[2]), Number(channels[3])] as [number, number, number]
    : backendNamedColors[normalized] ?? null;
  parsedColorCache.set(normalized, parsed);
  return parsed;
}

function relativeLuminance([red, green, blue]: [number, number, number]): number {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

function toHexColor([red, green, blue]: [number, number, number]): string {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function artistGenrePillBackground(color: string | null, genre: string | null): string {
  const source = color ? parseColor(color) : null;
  const darkenTarget = parseColor(DARKEN_TARGET)!;
  if (!source) {
    if (!genre) return NO_GENRE_COLOR;
    const genreHash = [...genre].reduce(
      (hash, character) => (hash * 31 + character.codePointAt(0)!) >>> 0,
      0,
    );
    return GENRE_PALETTE[genreHash % GENRE_PALETTE.length] ?? NO_GENRE_COLOR;
  }

  const hasWhiteTextContrast = (rgb: [number, number, number]) =>
    1.05 / (relativeLuminance(rgb) + 0.05) >= 4.5;
  if (hasWhiteTextContrast(source)) return color!;

  for (let mix = 0.05; mix <= 1; mix += 0.05) {
    const darker: [number, number, number] = source.map((channel, index) =>
      Math.round(channel * (1 - mix) + darkenTarget[index] * mix),
    ) as [number, number, number];
    if (hasWhiteTextContrast(darker)) return toHexColor(darker);
  }
  return DARKEN_TARGET;
}
