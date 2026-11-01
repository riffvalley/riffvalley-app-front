export interface SseMessage {
  event: string;
  data: string;
}

/** Shared Fetch/ReadableStream framing parser; feature modules own payload validation. */
export async function readSseMessages(
  body: ReadableStream<Uint8Array>,
  onMessage: (message: SseMessage) => void,
  signal: AbortSignal
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "";
  let dataLines: string[] = [];

  const dispatch = () => {
    if (dataLines.length > 0)
      onMessage({ event: eventName || "message", data: dataLines.join("\n") });
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
      // The server may already have closed the stream.
    }
    reader.releaseLock();
  }
}
