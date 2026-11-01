import { describe, expect, it } from "vitest";
import { parseReunionsEvent } from "./reunionsEventsParser";
import type { ReunionsChangeEvent } from "../types/reunions";
import {
  formatReunionsBatchToast,
  formatReunionsToast,
  hasVisibleReunionChanges,
} from "./reunionsRealtime";
import type { Reunion } from "../types/reunions";

const actor = { kind: "user", id: "user-2", displayName: "María" } as const;
const reunion = { id: "meeting-1", title: "Reunión editorial" } as const;
const point = { id: "point-1", title: "Revisar lanzamientos" } as const;
const message = (event: unknown) => ({ event: "reunions.invalidate", data: JSON.stringify(event) });

describe("Reunions SSE contract and descriptions", () => {
  it("parses initial synchronization and generic fallback distinctly", () => {
    expect(
      parseReunionsEvent(message({ type: "reunions.invalidate", version: 1, reason: "initial" }))
    ).toEqual({
      type: "reunions.invalidate",
      version: 1,
      reason: "initial",
    });
    expect(
      parseReunionsEvent(message({ type: "reunions.invalidate", version: 1, reason: "change" }))
    ).toEqual({
      type: "reunions.invalidate",
      version: 1,
      reason: "change",
    });
  });

  const events: ReunionsChangeEvent[] = [
    {
      type: "reunions.invalidate",
      version: 1,
      reason: "change",
      action: "reunion.created",
      actor,
      reunion,
    },
    {
      type: "reunions.invalidate",
      version: 1,
      reason: "change",
      action: "reunion.updated",
      actor,
      reunion,
    },
    {
      type: "reunions.invalidate",
      version: 1,
      reason: "change",
      action: "reunion.deleted",
      actor,
      reunion,
    },
    {
      type: "reunions.invalidate",
      version: 1,
      reason: "change",
      action: "point.created",
      actor,
      reunion,
      point,
    },
    {
      type: "reunions.invalidate",
      version: 1,
      reason: "change",
      action: "point.updated",
      actor,
      reunion,
      point,
    },
    {
      type: "reunions.invalidate",
      version: 1,
      reason: "change",
      action: "point.completed",
      actor,
      reunion,
      point,
    },
    {
      type: "reunions.invalidate",
      version: 1,
      reason: "change",
      action: "point.reopened",
      actor,
      reunion,
      point,
    },
    {
      type: "reunions.invalidate",
      version: 1,
      reason: "change",
      action: "point.moved",
      actor,
      previousReunion: { id: "meeting-0", title: "Reunión A" },
      reunion: { id: "meeting-2", title: "Reunión B" },
      point,
    },
    {
      type: "reunions.invalidate",
      version: 1,
      reason: "change",
      action: "point.deleted",
      actor,
      reunion,
      point,
    },
  ];

  it.each(events.map((event) => [event.action, event] as const))(
    "formats %s using plain text and the actor",
    (action, event) => {
      const parsed = parseReunionsEvent(message(event));
      expect(parsed).toEqual(event);
      expect(formatReunionsToast(parsed as ReunionsChangeEvent)).not.toMatch(/<[^>]+>/);
      expect(formatReunionsToast(parsed as ReunionsChangeEvent)).toContain("María");
      expect(formatReunionsToast(parsed as ReunionsChangeEvent)).not.toBeNull();
      expect(action).toBe(event.action);
    }
  );

  it("uses the backend system actor name and produces a neutral batch message", () => {
    const systemEvent: ReunionsChangeEvent = {
      type: "reunions.invalidate",
      version: 1,
      reason: "change",
      action: "reunion.updated",
      actor: { kind: "system", displayName: "Proceso automático" },
      reunion,
    };
    expect(formatReunionsToast(systemEvent)).toBe(
      "Proceso automático ha actualizado Reunión editorial"
    );
    expect(formatReunionsBatchToast(3)).toBe("Hay 3 cambios visibles en las reuniones.");
  });

  it("rejects invalid data and the replaced generic payload envelope", () => {
    expect(
      parseReunionsEvent(
        message({ type: "reunions.invalidate", version: 1, reason: "change", payload: {} })
      )
    ).toBeNull();
    expect(
      parseReunionsEvent(message({ type: "reunions.invalidate", version: 2, reason: "change" }))
    ).toBeNull();
    expect(parseReunionsEvent({ event: "message", data: "{}" })).toBeNull();
    expect(parseReunionsEvent(message("<script>alert(1)</script>"))).toBeNull();
    expect(
      parseReunionsEvent(
        message({
          type: "reunions.invalidate",
          version: 1,
          reason: "change",
          action: "point.moved",
          actor,
          reunion,
          point,
        })
      )
    ).toBeNull();
  });
});

describe("visible Reunion data comparison", () => {
  const base: Reunion = {
    id: reunion.id,
    title: reunion.title,
    date: "2026-11-01T12:00:00.000Z",
    description: null,
    points: [
      {
        id: point.id,
        title: point.title,
        content: "Agenda",
        done: false,
        createdAt: "2026-11-01T00:00:00.000Z",
      },
    ],
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };

  it.each([
    ["title", { ...base, title: "Updated" }],
    ["date", { ...base, date: "2026-11-02T12:00:00.000Z" }],
    ["description", { ...base, description: "Notes" }],
    ["point title", { ...base, points: [{ ...base.points[0]!, title: "Different" }] }],
    ["point content", { ...base, points: [{ ...base.points[0]!, content: "Changed" }] }],
    ["completion", { ...base, points: [{ ...base.points[0]!, done: true }] }],
    [
      "reassignment",
      { ...base, points: [{ ...base.points[0]!, reunion: { id: "another", titulo: "Other" } }] },
    ],
    ["deletion", { ...base, points: [] }],
  ] as const)("detects visible %s changes independent of object identity", (_label, changed) => {
    expect(hasVisibleReunionChanges([base], [changed])).toBe(true);
  });

  it("does not treat equivalent HTTP results as visible changes", () => {
    expect(hasVisibleReunionChanges([base], [{ ...base, points: [...base.points] }])).toBe(false);
  });
});
