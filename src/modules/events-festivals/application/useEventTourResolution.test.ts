import { QueryClient } from "@tanstack/vue-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectToursBatch } from "../api/entityResolution";
import { useEventTourResolution, tourResolutionKey } from "./useEventTourResolution";

vi.mock("../api/entityResolution", () => ({ inspectToursBatch: vi.fn() }));

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

function newTourResults(names: string[]) {
  return {
    results: names.map((name, index) => ({
      index,
      name,
      status: "new" as const,
      candidates: [] as [],
    })),
  };
}

describe("shared Tour resolution", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("deduplicates equivalent pending names and reuses a fresh QueryCache result", async () => {
    vi.useFakeTimers();
    const client = createQueryClient();
    vi.mocked(inspectToursBatch).mockImplementation(async ({ names }) =>
      newTourResults([...names])
    );
    const resolver = useEventTourResolution(client);
    const first = resolver.resolve(["Septicflesh European Tour 2027"]);
    const duplicate = resolver.resolve(["  SEPTICFLESH   EUROPEAN TOUR 2027  "]);
    await vi.advanceTimersByTimeAsync(450);
    await expect(Promise.all([first, duplicate])).resolves.toMatchObject([
      [{ status: "new" }],
      [{ status: "new" }],
    ]);
    await resolver.resolve(["septicflesh european tour 2027"]);
    expect(inspectToursBatch).toHaveBeenCalledTimes(1);
    expect(tourResolutionKey(" A  B ")).toBe(tourResolutionKey("a b"));
    expect(tourResolutionKey("Gírâ")).toBe(tourResolutionKey("Gira"));
    client.clear();
  });

  it("requeries after freshness expires and splits more than 100 names into valid batches", async () => {
    vi.useFakeTimers();
    const client = createQueryClient();
    vi.mocked(inspectToursBatch).mockImplementation(async ({ names }) =>
      newTourResults([...names])
    );
    const resolver = useEventTourResolution(client);
    await resolver.resolve(["Tour fresca"], true);
    vi.setSystemTime(Date.now() + 15_001);
    await resolver.resolve(["Tour fresca"], true);
    expect(inspectToursBatch).toHaveBeenCalledTimes(2);

    const names = Array.from({ length: 101 }, (_, index) => `Tour ${index}`);
    const manyTours = resolver.resolve(names);
    await vi.advanceTimersByTimeAsync(450);
    await manyTours;
    expect(inspectToursBatch).toHaveBeenCalledTimes(4);
    const lengths = vi
      .mocked(inspectToursBatch)
      .mock.calls.map(([request]) => request.names.length);
    expect(lengths).toEqual([1, 1, 100, 1]);
    expect(lengths.every((length) => length <= 100)).toBe(true);
    client.clear();
  });
});
