export type EditorialAction =
  "created" | "scheduled" | "moved" | "unscheduled" | "updated" | "deleted";

export interface EditorialActor {
  kind: "user" | "system";
  id?: string;
  displayName?: string;
}

export interface EditorialContentDescriptor {
  id?: string;
  title?: string;
}

export interface EditorialChanges {
  previousDate?: string | null;
  newDate?: string | null;
  fields?: string[];
}

export interface ContentsInvalidateInitialEvent {
  type: "contents.invalidate";
  version: 2;
  reason: "initial";
  sourceId?: string;
}

export interface ContentsInvalidateChangeEvent {
  type: "contents.invalidate";
  version: 2;
  reason: "change";
  action?: EditorialAction;
  actor?: EditorialActor;
  content?: EditorialContentDescriptor;
  changes?: EditorialChanges;
  sourceId?: string;
}

export type ContentsInvalidateEvent =
  ContentsInvalidateInitialEvent | ContentsInvalidateChangeEvent;

export interface SseMessage {
  event: string;
  data: string;
}

const actions = new Set<EditorialAction>([
  "created",
  "scheduled",
  "moved",
  "unscheduled",
  "updated",
  "deleted",
]);
const eventKeys = new Set([
  "type",
  "version",
  "reason",
  "action",
  "actor",
  "content",
  "changes",
  "sourceId",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isCivilDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month! < 1 || month! > 12 || day! < 1) return false;
  const leapYear = year! % 4 === 0 && (year! % 100 !== 0 || year! % 400 === 0);
  const daysByMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day! <= daysByMonth[month! - 1]!;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isActor(value: unknown): value is EditorialActor {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["kind", "id", "displayName"]) &&
    (value.kind === "user" || value.kind === "system") &&
    isOptionalString(value.id) &&
    isOptionalString(value.displayName)
  );
}

function isContent(value: unknown): value is EditorialContentDescriptor {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["id", "title"]) &&
    isOptionalString(value.id) &&
    isOptionalString(value.title)
  );
}

function isChanges(value: unknown): value is EditorialChanges {
  if (!isRecord(value) || !hasOnlyKeys(value, ["previousDate", "newDate", "fields"])) return false;
  const validDate = (date: unknown) => date === undefined || date === null || isCivilDate(date);
  return (
    validDate(value.previousDate) &&
    validDate(value.newDate) &&
    (value.fields === undefined ||
      (Array.isArray(value.fields) && value.fields.every((field) => typeof field === "string")))
  );
}

function isChangesForAction(
  action: EditorialAction | undefined,
  value: unknown
): value is EditorialChanges | undefined {
  if (value === undefined) return true;
  if (!isChanges(value) || !action) return isChanges(value);
  const allowedByAction: Record<EditorialAction, readonly (keyof EditorialChanges)[]> = {
    created: ["newDate"],
    scheduled: ["newDate"],
    moved: ["previousDate", "newDate"],
    unscheduled: ["previousDate"],
    updated: ["fields"],
    deleted: ["previousDate"],
  };
  if (
    !Object.keys(value).every((key) =>
      allowedByAction[action].includes(key as keyof EditorialChanges)
    )
  ) {
    return false;
  }
  if (action === "scheduled" || action === "moved") {
    return [value.previousDate, value.newDate].every(
      (date) => date === undefined || isCivilDate(date)
    );
  }
  if (action === "created")
    return value.newDate === undefined || value.newDate === null || isCivilDate(value.newDate);
  if (action === "deleted") {
    return (
      value.previousDate === undefined ||
      value.previousDate === null ||
      isCivilDate(value.previousDate)
    );
  }
  if (action === "unscheduled") {
    return value.previousDate === undefined || isCivilDate(value.previousDate);
  }
  return true;
}

function isContentsInvalidateEvent(value: unknown): value is ContentsInvalidateEvent {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [...eventKeys]) ||
    value.type !== "contents.invalidate" ||
    value.version !== 2 ||
    (value.sourceId !== undefined && typeof value.sourceId !== "string")
  ) {
    return false;
  }
  if (value.reason === "initial") {
    return (
      value.action === undefined &&
      value.actor === undefined &&
      value.content === undefined &&
      value.changes === undefined
    );
  }
  if (value.reason !== "change") return false;
  return (
    (value.action === undefined ||
      (typeof value.action === "string" && actions.has(value.action as EditorialAction))) &&
    (value.actor === undefined || isActor(value.actor)) &&
    (value.content === undefined || isContent(value.content)) &&
    isChangesForAction(value.action as EditorialAction | undefined, value.changes)
  );
}

export function parseContentsInvalidate(message: SseMessage): ContentsInvalidateEvent | null {
  if (message.event !== "contents.invalidate") return null;
  try {
    const value: unknown = JSON.parse(message.data);
    return isContentsInvalidateEvent(value) ? value : null;
  } catch {
    // Ignore malformed frames without interrupting the live stream.
    return null;
  }
}

/** Incrementally decodes SSE frames; readers may split UTF-8 characters and frames arbitrarily. */
export async function readContentsInvalidateEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ContentsInvalidateEvent) => void,
  signal: AbortSignal
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "";
  let dataLines: string[] = [];

  const dispatch = () => {
    if (dataLines.length > 0) {
      const event = parseContentsInvalidate({
        event: eventName || "message",
        data: dataLines.join("\n"),
      });
      if (event) onEvent(event);
    }
    eventName = "";
    dataLines = [];
  };
  const processLine = (line: string) => {
    if (line === "") return dispatch();
    if (line.startsWith(":")) return;
    const separator = line.indexOf(":");
    const field = separator < 0 ? line : line.slice(0, separator);
    let value = separator < 0 ? "" : line.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") eventName = value;
    if (field === "data") dataLines.push(value);
  };
  const processBuffer = (final: boolean) => {
    let start = 0;
    for (let index = 0; index < buffer.length; index += 1) {
      const character = buffer[index];
      if (character !== "\n" && character !== "\r") continue;
      if (character === "\r" && index === buffer.length - 1 && !final) break;
      processLine(buffer.slice(start, index));
      if (character === "\r" && buffer[index + 1] === "\n") index += 1;
      start = index + 1;
    }
    buffer = buffer.slice(start);
    if (final && buffer.length > 0) {
      processLine(buffer);
      buffer = "";
      dispatch();
    } else if (final) dispatch();
  };

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      processBuffer(false);
    }
    if (!signal.aborted) {
      buffer += decoder.decode();
      processBuffer(true);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Cancellation after EOF/abort is best effort.
    }
    reader.releaseLock();
  }
}
