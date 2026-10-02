import { afterEach, describe, expect, it, vi } from "vitest";
import { asignationTextUpdateApi } from "../../src/modules/editorial/infrastructure/asignationTextUpdateApi";

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { patch } }));

afterEach(() => vi.clearAllMocks());

describe("Editorial asignation text update API", () => {
  it("patches the legacy endpoint with the unchanged payload and discards the response", async () => {
    const data = {
      description: "Texto de la asignación",
      similarBands: "Banda A, Banda B",
      spotifyTrackId: "track-1",
      genre: "Rock",
    };
    patch.mockResolvedValue({ data: { ignored: true } });

    await expect(asignationTextUpdateApi.updateAsignationText("asignation-1", data)).resolves.toBeUndefined();

    expect(patch).toHaveBeenCalledOnce();
    expect(patch).toHaveBeenCalledWith("/asignations/asignation-1", data);
  });

  it("propagates the HTTP error unchanged", async () => {
    const failure = new Error("update failed");
    patch.mockRejectedValue(failure);

    await expect(asignationTextUpdateApi.updateAsignationText("asignation-1", {
      description: "Texto",
      similarBands: "",
      spotifyTrackId: "",
      genre: "",
    })).rejects.toBe(failure);
  });
});
