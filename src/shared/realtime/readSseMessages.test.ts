import { describe, expect, it } from "vitest";
import { readSseMessages } from "./readSseMessages";

function streamFrom(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
}

describe("shared SSE framing parser", () => {
  it("assembles split UTF-8/multiline frames, ignores comments, and leaves validation to feature parsers", async () => {
    const received: Array<{ event: string; data: string }> = [];
    const bytes = new TextEncoder().encode(
      ': heartbeat\r\nevent: reunions.invalidate\r\ndata: {"title":"María"}\r\ndata: segunda línea\r\n\r\nevent: contents.invalidate\ndata: v2\n\n'
    );
    const utf8Split = bytes.findIndex((byte) => byte === 0xc3) + 1;
    const body = streamFrom([bytes.slice(0, utf8Split), bytes.slice(utf8Split)]);
    await readSseMessages(body, (message) => received.push(message), new AbortController().signal);
    expect(received).toEqual([
      { event: "reunions.invalidate", data: '{"title":"María"}\nsegunda línea' },
      { event: "contents.invalidate", data: "v2" },
    ]);
  });

  it("cleans up an aborted stream", async () => {
    const controller = new AbortController();
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(stream) {
        stream.enqueue(new TextEncoder().encode("event: x\ndata: y\n\n"));
      },
      cancel() {
        cancelled = true;
      },
    });
    controller.abort();
    await readSseMessages(body, () => undefined, controller.signal);
    expect(cancelled).toBe(true);
  });
});
