import { parseCalendarDate } from "./eventDate";

export const SCRAPED_EVENT_JSON_FORMAT = "riffvalley.events-import" as const;
export const SCRAPED_EVENT_JSON_V1_VERSION = 1 as const;
export const SCRAPED_EVENT_JSON_VERSION = 2 as const;
export const SCRAPED_EVENT_JSON_MAX_BYTES = 2 * 1024 * 1024;

export interface ScrapedEventJsonRow {
  type: "concert" | "festival" | "tour";
  title: string;
  startDate: string;
  endDate: string;
  artists: string[];
  venue: string;
  locality: string;
  province: string;
  region: string;
  country: string;
  price: string;
  additionalInfo: string;
  originalUrl: string;
  externalId: string;
  issues: string[];
}

export interface ScrapedEventJsonDocument {
  version: 1 | 2;
  sourceName: string;
  country: string;
  events: ScrapedEventJsonRow[];
  duplicateIndexes: number[];
}

export class ScrapedEventJsonError extends Error {}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  return Boolean(match && parseCalendarDate(`${match[3]}/${match[2]}/${match[1]}`) === value);
}

export function scrapedEventFingerprint(
  row: Pick<
    ScrapedEventJsonRow,
    "type" | "title" | "startDate" | "endDate" | "locality" | "province" | "artists"
  >
): string {
  const keyText = (value: string) => value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("und");
  return JSON.stringify([
    row.type,
    keyText(row.title),
    row.startDate,
    row.endDate,
    keyText(row.locality),
    keyText(row.province),
    row.artists.map(keyText),
  ]);
}

export function parseScrapedEventJson(input: string): ScrapedEventJsonDocument {
  let value: unknown;
  try {
    value = JSON.parse(input) as unknown;
  } catch {
    throw new ScrapedEventJsonError("El archivo no contiene un JSON válido.");
  }
  if (!record(value) || value.format !== SCRAPED_EVENT_JSON_FORMAT)
    throw new ScrapedEventJsonError("El archivo no usa el contrato riffvalley.events-import.");
  if (
    value.version !== SCRAPED_EVENT_JSON_V1_VERSION &&
    value.version !== SCRAPED_EVENT_JSON_VERSION
  )
    throw new ScrapedEventJsonError(`Versión JSON no compatible: ${String(value.version)}.`);
  if (!record(value.source) || !text(value.source.name))
    throw new ScrapedEventJsonError("Indica source.name con el nombre del scraper o fuente.");
  if (!text(value.country)) throw new ScrapedEventJsonError("Indica el país del documento.");
  if (!Array.isArray(value.events))
    throw new ScrapedEventJsonError("El campo events debe ser una lista de eventos.");
  if (value.events.length === 0)
    throw new ScrapedEventJsonError("El archivo es válido como JSON, pero no contiene eventos.");

  const events = value.events.map((raw, index): ScrapedEventJsonRow => {
    const issues: string[] = [];
    if (!record(raw)) {
      return {
        type: "concert",
        title: "",
        startDate: "",
        endDate: "",
        artists: [],
        venue: "",
        locality: "",
        province: "",
        region: "",
        country: text(value.country),
        price: "",
        additionalInfo: "",
        originalUrl: "",
        externalId: "",
        issues: [`Evento ${index + 1}: debe ser un objeto.`],
      };
    }
    const supportsTours = value.version === SCRAPED_EVENT_JSON_VERSION;
    const type =
      raw.type === "festival" || raw.type === "concert" || (supportsTours && raw.type === "tour")
        ? raw.type
        : "concert";
    if (raw.type !== type)
      issues.push(
        supportsTours
          ? "Tipo inválido: usa concert, festival o tour."
          : "Tipo inválido: usa concert o festival."
      );
    const title = text(raw.title);
    if (type === "festival" && !title) issues.push("El festival necesita un título.");
    if (type === "tour" && !title) issues.push("La gira necesita un título con su nombre.");
    const country = text(raw.country) || text(value.country);
    if (country.toLocaleLowerCase("und") !== text(value.country).toLocaleLowerCase("und"))
      issues.push("El país del evento no coincide con el país del documento.");
    const startDate = text(raw.startDate);
    const endDate = text(raw.endDate);
    if (!validIsoDate(startDate)) issues.push("Fecha inicial inválida; usa AAAA-MM-DD.");
    if (endDate && !validIsoDate(endDate)) issues.push("Fecha final inválida; usa AAAA-MM-DD.");
    if (validIsoDate(startDate) && validIsoDate(endDate) && endDate < startDate)
      issues.push("La fecha final es anterior a la inicial.");
    const artists = Array.isArray(raw.artists) ? raw.artists.map(text).filter(Boolean) : [];
    if (!Array.isArray(raw.artists) || raw.artists.some((artist) => !text(artist)))
      issues.push("artists debe ser una lista ordenada de nombres de artistas.");
    if (artists.length === 0) issues.push("Añade al menos un artista al lineup.");
    const locality = text(raw.locality);
    if (!locality) issues.push("Indica la localidad.");
    return {
      type,
      title,
      startDate,
      endDate,
      artists,
      venue: text(raw.venue),
      locality,
      province: text(raw.province),
      region: text(raw.region),
      country,
      price: text(raw.price),
      additionalInfo: text(raw.additionalInfo),
      originalUrl: text(raw.url),
      externalId: text(raw.externalId),
      issues,
    };
  });
  const seen = new Set<string>();
  const duplicateIndexes: number[] = [];
  events.forEach((event, index) => {
    const key = scrapedEventFingerprint(event);
    if (seen.has(key)) {
      duplicateIndexes.push(index);
      event.issues.push(
        `Duplicado del evento ${events.findIndex((candidate) => scrapedEventFingerprint(candidate) === key) + 1} en este archivo.`
      );
    } else seen.add(key);
  });
  return {
    version: value.version,
    sourceName: text(value.source.name),
    country: text(value.country),
    events,
    duplicateIndexes,
  };
}
