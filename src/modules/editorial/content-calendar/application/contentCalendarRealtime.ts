import type { Content } from "@services/contents/contents";
import type { ContentsInvalidateChangeEvent } from "./contentsInvalidateParser";

type VisibleContent = Pick<
  Content,
  | "id"
  | "type"
  | "name"
  | "backlog"
  | "publicationDate"
  | "closeDate"
  | "notes"
  | "author"
  | "article"
  | "video"
>;

function visibleContentSignature(content: VisibleContent): string {
  const visibleDate = (value: string | null | undefined) => value?.split("T")[0] ?? null;
  const isScheduled = !content.backlog;
  return JSON.stringify([
    content.id,
    content.type,
    content.name,
    content.backlog,
    isScheduled ? visibleDate(content.publicationDate) : null,
    isScheduled ? visibleDate(content.closeDate) : null,
    content.notes ?? null,
    content.author
      ? [content.author.id, content.author.username, content.author.image ?? null]
      : null,
    content.article?.editor
      ? [
          content.article.editor.id,
          content.article.editor.username,
          content.article.editor.image ?? null,
        ]
      : null,
    content.video?.editor
      ? [content.video.editor.id, content.video.editor.username, content.video.editor.image ?? null]
      : null,
  ]);
}

/** Compares only fields used by the calendar and backlog presentation, independent of object identity. */
export function haveVisibleContentChanges(
  before: readonly VisibleContent[],
  after: readonly VisibleContent[]
): boolean {
  if (before.length !== after.length) return true;
  const previous = new Map(before.map((content) => [content.id, visibleContentSignature(content)]));
  return after.some((content) => previous.get(content.id) !== visibleContentSignature(content));
}

export function getVisibleChangedContentIds(
  before: readonly VisibleContent[],
  after: readonly VisibleContent[]
): Set<string> {
  const previous = new Map(before.map((content) => [content.id, visibleContentSignature(content)]));
  const next = new Map(after.map((content) => [content.id, visibleContentSignature(content)]));
  return new Set(
    [...new Set([...previous.keys(), ...next.keys()])].filter(
      (id) => previous.get(id) !== next.get(id)
    )
  );
}

export function deduplicateEditorialEvents(
  events: readonly ContentsInvalidateChangeEvent[]
): ContentsInvalidateChangeEvent[] {
  const unique = new Map<string, ContentsInvalidateChangeEvent>();
  for (const event of events) {
    unique.set(JSON.stringify(event), event);
  }
  return [...unique.values()];
}

const actionMessages: Record<NonNullable<ContentsInvalidateChangeEvent["action"]>, string> = {
  created: "ha creado",
  scheduled: "ha programado",
  moved: "ha movido",
  unscheduled: "ha enviado",
  updated: "ha actualizado",
  deleted: "ha eliminado",
};

function formatCivilDate(date: string | null | undefined, includeYear = true): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split("-");
  return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

/** Pure, text-only formatter for the validated editorial v2 payload. */
export function formatEditorialToast(event: ContentsInvalidateChangeEvent): string {
  const title = event.content?.title?.trim();
  const actor = event.actor?.displayName?.trim();
  if (!title) {
    return actor
      ? `${actor} ha realizado cambios editoriales en el calendario.`
      : "Hay cambios editoriales en el calendario.";
  }
  if (!actor || !event.action) return "Hay cambios editoriales en el calendario.";

  const previousDate = formatCivilDate(event.changes?.previousDate);
  const newDate = formatCivilDate(event.changes?.newDate);
  if (event.action === "moved" && previousDate && newDate) {
    const previousYear = event.changes?.previousDate?.slice(0, 4);
    const newYear = event.changes?.newDate?.slice(0, 4);
    const includeYear = previousYear !== newYear;
    const previous = formatCivilDate(event.changes?.previousDate, includeYear);
    const next = formatCivilDate(event.changes?.newDate, includeYear);
    return `${actor} ha movido ${title} del ${previous} al ${next}`;
  }
  if ((event.action === "scheduled" || event.action === "moved") && newDate) {
    return `${actor} ${actionMessages[event.action]} ${title} ${event.action === "moved" ? "al" : "para el"} ${newDate}`;
  }
  if (event.action === "unscheduled") return `${actor} ha enviado ${title} al backlog`;
  return `${actor} ${actionMessages[event.action]} ${title}`;
}

export function formatEditorialBatchToast(
  events: readonly ContentsInvalidateChangeEvent[]
): string {
  const actorNames = events.map((event) => event.actor?.displayName?.trim());
  if (actorNames.some((name) => !name)) {
    return "Hay varios cambios editoriales visibles en el calendario.";
  }
  const actors = [...new Set(actorNames)];
  const actorPrefix =
    actors.length === 1
      ? `${actors[0]} ha realizado`
      : actors.length === 2
        ? `${actors.join(" y ")} han realizado`
        : "Varios editores han realizado";
  return `${actorPrefix} varios cambios visibles en el calendario.`;
}

export function createReconnectDelay(attempt: number, random = Math.random): number {
  const base = Math.min(30_000, 500 * 2 ** Math.min(attempt, 6));
  return Math.round(base * (0.75 + random() * 0.5));
}
