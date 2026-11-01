import { describe, expect, it, vi } from "vitest";
import { parseContentsInvalidate, readContentsInvalidateEvents } from "./contentsInvalidateParser";

const initial = '{"type":"contents.invalidate","version":2,"reason":"initial"}';
const change = JSON.stringify({
  type: "contents.invalidate",
  version: 2,
  reason: "change",
  action: "moved",
  actor: { kind: "user", id: "user-1", displayName: "María" },
  content: { id: "content-1", title: "Radar semanal" },
  changes: { previousDate: "2026-10-30", newDate: "2026-11-01" },
  sourceId: "tab-1",
});
const eventFrame = (data: string) => `event: contents.invalidate\ndata: ${data}\n\n`;

function streamFrom(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
}

describe("contents.invalidate v2 SSE parser", () => {
  it("accepts the initial v2 event and the complete editorial v2 union", () => {
    expect(parseContentsInvalidate({ event: "contents.invalidate", data: initial })).toEqual({
      type: "contents.invalidate",
      version: 2,
      reason: "initial",
    });
    expect(parseContentsInvalidate({ event: "contents.invalidate", data: change })).toMatchObject({
      action: "moved",
      actor: { displayName: "María" },
      changes: { previousDate: "2026-10-30", newDate: "2026-11-01" },
      sourceId: "tab-1",
    });
  });

  it("rejects v1, other versions, other SSE event names, and invalid v2 values", () => {
    for (const data of [
      '{"type":"contents.invalidate","version":1}',
      '{"type":"contents.invalidate","version":2,"reason":"heartbeat"}',
      '{"type":"contents.invalidate","version":2,"reason":"change","action":"moved","changes":{"newDate":"2026-02-30"}}',
      '{"type":"contents.invalidate","version":2,"reason":"change","action":"created","changes":{"previousDate":"2026-01-01"}}',
      '{"type":"contents.invalidate","version":2,"reason":"change","action":"scheduled","changes":{"newDate":null}}',
      '{"type":"contents.invalidate","version":2,"reason":"change","action":"created","extra":true}',
      "{",
    ]) {
      expect(parseContentsInvalidate({ event: "contents.invalidate", data })).toBeNull();
    }
    expect(parseContentsInvalidate({ event: "other", data: change })).toBeNull();
  });

  it("allows an incomplete generic v2 change for the formatter fallback", () => {
    expect(
      parseContentsInvalidate({
        event: "contents.invalidate",
        data: '{"type":"contents.invalidate","version":2,"reason":"change"}',
      })
    ).toMatchObject({ reason: "change" });
  });

  it("handles fragmented UTF-8, multiple v2 messages, comments, and unknown events", async () => {
    const bytes = new TextEncoder().encode(
      `: heartbeat café\n${eventFrame(initial)}event: unknown\ndata: {}\n\n${eventFrame(change)}`
    );
    const accentOffset = bytes.indexOf(0xc3);
    const received: string[] = [];
    await readContentsInvalidateEvents(
      streamFrom([
        bytes.slice(0, accentOffset + 1),
        bytes.slice(accentOffset + 1, accentOffset + 2),
        bytes.slice(accentOffset + 2, accentOffset + 47),
        bytes.slice(accentOffset + 47),
      ]),
      (event) => received.push(event.reason),
      new AbortController().signal
    );
    expect(received).toEqual(["initial", "change"]);
  });

  it("supports CRLF, multiline data, and dispatches a complete frame at EOF", async () => {
    const bytes = new TextEncoder().encode(
      'event: contents.invalidate\r\ndata: {"type":"contents.invalidate",\r\ndata: "version":2,"reason":"initial"}\r\n'
    );
    const received = vi.fn();
    await readContentsInvalidateEvents(streamFrom([bytes]), received, new AbortController().signal);
    expect(received).toHaveBeenCalledOnce();
  });

  it("ignores heartbeats and malformed messages without interrupting later frames", async () => {
    const body = `: heartbeat\n\nevent: contents.invalidate\ndata: {invalid}\n\n${eventFrame(initial)}`;
    const received = vi.fn();
    await readContentsInvalidateEvents(
      streamFrom([new TextEncoder().encode(body)]),
      received,
      new AbortController().signal
    );
    expect(received).toHaveBeenCalledOnce();
  });
});
