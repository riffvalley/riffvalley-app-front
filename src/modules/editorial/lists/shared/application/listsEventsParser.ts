import { readSseMessages, type SseMessage } from "@/shared/realtime/readSseMessages";

export const LISTS_INVALIDATE_EVENT = "lists.invalidate" as const;

export interface ListsEventListReference {
  id: string;
  type: "week" | "month";
}

export interface ListsEventUserReference {
  id: string;
  displayName: string;
}

interface ListsEventBase {
  type: typeof LISTS_INVALIDATE_EVENT;
  version: 1;
}

type ListsEventActor =
  { kind: "user"; id: string; displayName: string } | { kind: "system"; displayName: string };

interface ListsDescriptiveChangeBase extends ListsEventBase {
  reason: "change";
  actor: ListsEventActor;
  assignee: ListsEventUserReference | null;
  list: ListsEventListReference;
  assignmentId: string;
  discId: string;
  artistName: string;
  sourceId?: string;
}

export type ListsDescriptiveChangeEvent =
  | (ListsDescriptiveChangeBase & {
      action: "assignment.created";
      newPosition: number | null;
    })
  | (ListsDescriptiveChangeBase & {
      action: "assignment.placed" | "assignment.moved" | "assignment.unplaced";
      previousPosition: number | null;
      newPosition: number | null;
    })
  | (ListsDescriptiveChangeBase & {
      action: "assignment.deleted";
      previousPosition: number | null;
    });

export interface ListsGenericChangeEvent extends ListsEventBase {
  reason: "change";
  list?: ListsEventListReference;
}

export type ListsEvent =
  (ListsEventBase & { reason: "initial" }) | ListsDescriptiveChangeEvent | ListsGenericChangeEvent;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isListReference(value: unknown): value is ListsEventListReference {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["id", "type"]) &&
    typeof value.id === "string" &&
    (value.type === "week" || value.type === "month")
  );
}

function isUserReference(value: unknown): value is ListsEventUserReference {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["id", "displayName"]) &&
    typeof value.id === "string" &&
    typeof value.displayName === "string"
  );
}

function isActor(value: unknown): value is ListsDescriptiveChangeBase["actor"] {
  if (!isRecord(value) || typeof value.displayName !== "string") return false;
  if (value.kind === "user") {
    return hasOnlyKeys(value, ["kind", "id", "displayName"]) && typeof value.id === "string";
  }
  return value.kind === "system" && hasOnlyKeys(value, ["kind", "displayName"]);
}

function isPosition(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isDescriptiveBase(value: Record<string, unknown>): boolean {
  return (
    isActor(value.actor) &&
    (value.assignee === null || isUserReference(value.assignee)) &&
    isListReference(value.list) &&
    typeof value.assignmentId === "string" &&
    typeof value.discId === "string" &&
    typeof value.artistName === "string" &&
    (value.sourceId === undefined || typeof value.sourceId === "string")
  );
}

export function isListsEvent(value: unknown): value is ListsEvent {
  if (
    !isRecord(value) ||
    value.type !== LISTS_INVALIDATE_EVENT ||
    value.version !== 1 ||
    typeof value.reason !== "string"
  ) {
    return false;
  }

  if (value.reason === "initial") {
    return hasOnlyKeys(value, ["type", "version", "reason"]);
  }

  if (value.reason !== "change") return false;
  if (value.action === undefined) {
    return (
      hasOnlyKeys(value, ["type", "version", "reason", "list"]) &&
      (value.list === undefined || isListReference(value.list))
    );
  }

  const commonKeys = [
    "type",
    "version",
    "reason",
    "actor",
    "assignee",
    "list",
    "assignmentId",
    "discId",
    "artistName",
    "sourceId",
    "action",
  ];
  if (!isDescriptiveBase(value)) return false;
  if (value.action === "assignment.created") {
    return hasOnlyKeys(value, [...commonKeys, "newPosition"]) && isPosition(value.newPosition);
  }
  if (value.action === "assignment.deleted") {
    return (
      hasOnlyKeys(value, [...commonKeys, "previousPosition"]) && isPosition(value.previousPosition)
    );
  }
  if (
    value.action === "assignment.placed" ||
    value.action === "assignment.moved" ||
    value.action === "assignment.unplaced"
  ) {
    const validActionPosition =
      (value.action === "assignment.placed" &&
        (value.previousPosition === 0 || value.previousPosition === null) &&
        typeof value.newPosition === "number" &&
        value.newPosition > 0) ||
      (value.action === "assignment.moved" &&
        typeof value.previousPosition === "number" &&
        value.previousPosition > 0 &&
        typeof value.newPosition === "number" &&
        value.newPosition > 0 &&
        value.previousPosition !== value.newPosition) ||
      (value.action === "assignment.unplaced" &&
        typeof value.previousPosition === "number" &&
        value.previousPosition > 0 &&
        value.newPosition === 0);
    return (
      hasOnlyKeys(value, [...commonKeys, "previousPosition", "newPosition"]) &&
      isPosition(value.previousPosition) &&
      isPosition(value.newPosition) &&
      value.list.type === "week" &&
      validActionPosition
    );
  }
  return false;
}

export function parseListsEvent(message: SseMessage): ListsEvent | null {
  if (message.event !== LISTS_INVALIDATE_EVENT) return null;
  try {
    const value: unknown = JSON.parse(message.data);
    return isListsEvent(value) ? value : null;
  } catch {
    return null;
  }
}

export async function readListsEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ListsEvent) => void,
  signal: AbortSignal
): Promise<void> {
  await readSseMessages(
    body,
    (message) => {
      const event = parseListsEvent(message);
      if (event) onEvent(event);
    },
    signal
  );
}
