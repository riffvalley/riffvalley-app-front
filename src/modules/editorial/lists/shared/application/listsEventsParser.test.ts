import { describe, expect, it } from "vitest";
import { isListsEvent, parseListsEvent, type ListsEvent } from "./listsEventsParser";

const base = {
  type: "lists.invalidate",
  version: 1,
  reason: "change",
  action: "assignment.created",
  actor: { kind: "user", id: "actor-1", displayName: "María" },
  assignee: { id: "user-1", displayName: "Carlos" },
  list: { id: "list-1", type: "week" },
  assignmentId: "assignment-1",
  discId: "disc-1",
  artistName: "Grupo 1",
  newPosition: 0,
  sourceId: "tab-id",
};
const baseWithoutPosition = { ...base };
delete baseWithoutPosition.newPosition;

describe("Lists SSE v1 contract", () => {
  it("accepts the initial synchronization event without descriptive fields", () => {
    const event: ListsEvent = { type: "lists.invalidate", version: 1, reason: "initial" };
    expect(isListsEvent(event)).toBe(true);
  });

  it.each([
    ["assignment.created", { newPosition: 2 }],
    ["assignment.placed", { previousPosition: 0, newPosition: 2 }],
    ["assignment.placed", { previousPosition: null, newPosition: 2 }],
    ["assignment.moved", { previousPosition: 2, newPosition: 3 }],
    ["assignment.unplaced", { previousPosition: 3, newPosition: 0 }],
  ])("accepts %s with its contract positions", (action, positions) => {
    expect(isListsEvent({ ...base, action, ...positions })).toBe(true);
  });

  it("accepts deletion with its previous position on either list type", () => {
    expect(
      isListsEvent({ ...baseWithoutPosition, action: "assignment.deleted", previousPosition: 2 })
    ).toBe(true);
    expect(
      isListsEvent({
        ...baseWithoutPosition,
        action: "assignment.deleted",
        previousPosition: null,
        list: { id: "month-1", type: "month" },
      })
    ).toBe(true);
  });

  it("accepts the generic fallback with and without a list reference", () => {
    expect(isListsEvent({ type: "lists.invalidate", version: 1, reason: "change" })).toBe(true);
    expect(
      isListsEvent({
        type: "lists.invalidate",
        version: 1,
        reason: "change",
        list: { id: "list-1", type: "month" },
      })
    ).toBe(true);
  });

  it.each([
    { ...base, version: 2 },
    { ...base, list: { id: "list-1", type: "special" } },
    {
      ...baseWithoutPosition,
      action: "assignment.deleted",
      previousPosition: undefined,
    },
    { ...base, action: "assignment.placed", previousPosition: undefined },
    { ...base, assignee: { id: "user-1" } },
    { ...base, unexpected: true },
    { type: "lists.invalidate", version: 2, reason: "change" },
  ])("rejects invalid or unsupported contracts: %#", (event) => {
    expect(isListsEvent(event)).toBe(false);
  });

  it("parses only lists.invalidate frames and rejects malformed JSON", () => {
    expect(parseListsEvent({ event: "other", data: JSON.stringify(base) })).toBeNull();
    expect(parseListsEvent({ event: "lists.invalidate", data: "{" })).toBeNull();
    expect(parseListsEvent({ event: "lists.invalidate", data: JSON.stringify(base) })).toEqual(
      base
    );
  });
});
