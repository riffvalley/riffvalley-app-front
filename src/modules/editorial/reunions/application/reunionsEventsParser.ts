import type {
  EditorialActor,
  PointDescriptor,
  ReunionDescriptor,
  ReunionsEvent,
} from "../types/reunions";
import type { SseMessage } from "@/shared/realtime/readSseMessages";

const actions = new Set([
  "reunion.created",
  "reunion.updated",
  "reunion.deleted",
  "point.created",
  "point.updated",
  "point.completed",
  "point.reopened",
  "point.moved",
  "point.deleted",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isDescriptor(value: unknown): value is ReunionDescriptor | PointDescriptor {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["id", "title"]) &&
    typeof value.id === "string" &&
    typeof value.title === "string"
  );
}

function isActor(value: unknown): value is EditorialActor {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["kind", "id", "displayName"]) &&
    ((value.kind === "user" &&
      typeof value.id === "string" &&
      typeof value.displayName === "string") ||
      (value.kind === "system" && typeof value.displayName === "string" && value.id === undefined))
  );
}

export function isReunionsEvent(value: unknown): value is ReunionsEvent {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "type",
      "version",
      "reason",
      "action",
      "actor",
      "reunion",
      "point",
      "previousReunion",
      "sourceId",
    ]) ||
    value.type !== "reunions.invalidate" ||
    value.version !== 1
  )
    return false;
  if (
    value.sourceId !== undefined &&
    (typeof value.sourceId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value.sourceId
      ))
  )
    return false;
  if (value.reason === "initial") return hasOnlyKeys(value, ["type", "version", "reason"]);
  if (value.reason !== "change") return false;
  if (value.action === undefined) return hasOnlyKeys(value, ["type", "version", "reason"]);
  if (typeof value.action !== "string" || !actions.has(value.action)) return false;
  if (!isActor(value.actor)) return false;
  if (value.action.startsWith("reunion.")) {
    return (
      hasOnlyKeys(value, ["type", "version", "reason", "action", "actor", "reunion", "sourceId"]) &&
      isDescriptor(value.reunion)
    );
  }
  if (value.action === "point.moved") {
    return (
      hasOnlyKeys(value, [
        "type",
        "version",
        "reason",
        "action",
        "actor",
        "previousReunion",
        "reunion",
        "point",
        "sourceId",
      ]) &&
      isDescriptor(value.previousReunion) &&
      isDescriptor(value.point) &&
      isDescriptor(value.reunion)
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "version",
      "reason",
      "action",
      "actor",
      "reunion",
      "point",
      "sourceId",
    ])
  )
    return false;
  if (!isDescriptor(value.point) || !isDescriptor(value.reunion)) return false;
  return true;
}

export function parseReunionsEvent(message: SseMessage): ReunionsEvent | null {
  if (message.event !== "reunions.invalidate") return null;
  try {
    const parsed: unknown = JSON.parse(message.data);
    return isReunionsEvent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
