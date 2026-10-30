import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { get } }));

import { getCurrentVersionItems } from "@services/versions/currentVersionItems";

describe("Current version items API used by Feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: [] });
  });

  it("uses the existing version endpoint and accepts query cancellation", async () => {
    const signal = new AbortController().signal;
    await getCurrentVersionItems(signal);
    expect(get).toHaveBeenCalledWith("/versions/current/items", { signal });
  });
});
