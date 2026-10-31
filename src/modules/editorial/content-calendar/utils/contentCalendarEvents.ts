import type { Content, ContentAuthor, ContentType } from "@services/contents/contents";

export interface ContentCalendarEventProps {
  author: ContentAuthor | null;
  editor: Pick<ContentAuthor, "id" | "username" | "image"> | null;
  notes: string | null;
}

const contentTypeColors: Record<ContentType, { bg: string; border: string }> = {
  article: { bg: "#3b82f6", border: "#2563eb" },
  photos: { bg: "#ec4899", border: "#db2777" },
  riff_valley_playlist: { bg: "#22c55e", border: "#16a34a" },
  radar: { bg: "#f59e0b", border: "#d97706" },
  best: { bg: "#ef4444", border: "#dc2626" },
  video: { bg: "#8b5cf6", border: "#7c3aed" },
  reunion: { bg: "#f97316", border: "#ea580c" },
};

const contentTypeLabels: Record<ContentType, string> = {
  article: "Artículo",
  photos: "Fotos",
  riff_valley_playlist: "Playlist de Riff Valley",
  radar: "Radar",
  best: "Mejores del Mes",
  video: "Video",
  reunion: "Reunión",
};

export function getContentTypeColor(type: ContentType) {
  return contentTypeColors[type];
}

export function getContentTypeLabel(type: ContentType): string {
  return contentTypeLabels[type];
}

export function toCalendarDate(date: string | null): string | null {
  if (!date) return null;
  if (date.includes("T")) return date;
  return `${date}T18:00:00.000Z`;
}

export function toContentCalendarEvents(contents: readonly Content[]) {
  return contents
    .filter(
      (content): content is Content & { publicationDate: string } =>
        !content.backlog &&
        typeof content.publicationDate === "string" &&
        Boolean(content.publicationDate)
    )
    .map((content) => {
      const start = content.publicationDate.split("T")[0]!;
      let end: string | undefined;

      if (content.closeDate) {
        const closeDate = new Date(`${content.closeDate.split("T")[0]}T12:00:00.000Z`);
        closeDate.setUTCDate(closeDate.getUTCDate() + 1);
        const calculatedEnd = closeDate.toISOString().split("T")[0]!;
        if (calculatedEnd > start) end = calculatedEnd;
      }

      return {
        id: content.id,
        title: content.name,
        start,
        end,
        allDay: true,
        backgroundColor: getContentTypeColor(content.type).bg,
        borderColor: getContentTypeColor(content.type).border,
        extendedProps: {
          contentType: content.type,
          notes: content.notes,
          author: content.author,
          editor: content.article?.editor || content.video?.editor || null,
          list: content.list,
        },
      };
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isContentAuthor(value: unknown): value is ContentAuthor {
  return isRecord(value) && typeof value.id === "string" && typeof value.username === "string";
}

export function readContentCalendarEventProps(value: unknown): ContentCalendarEventProps {
  if (!isRecord(value)) return { author: null, editor: null, notes: null };

  const editor = isContentAuthor(value.editor) ? value.editor : null;
  return {
    author: isContentAuthor(value.author) ? value.author : null,
    editor,
    notes: typeof value.notes === "string" ? value.notes : null,
  };
}
