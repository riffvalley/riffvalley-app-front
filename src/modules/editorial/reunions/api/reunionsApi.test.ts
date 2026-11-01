import { afterEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api";
import {
  createPoint,
  createReunion,
  deletePoint,
  deleteReunion,
  getReunionDetails,
  getReunions,
  mapReunion,
  updatePoint,
  updateReunion,
} from "./reunionsApi";

vi.mock("@services/api/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const httpReunion = {
  id: "meeting-1",
  titulo: "Editorial",
  fecha: "2026-11-01T12:00:00.000Z",
  description: null,
  points: [
    {
      id: "point-1",
      titulo: "Agenda",
      content: null,
      done: null,
      createdAt: "2026-11-01T00:00:00.000Z",
    },
  ],
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

afterEach(() => vi.clearAllMocks());

describe("Reunions and Points HTTP contracts", () => {
  it("maps backend field names, nullable values, and related points centrally", () => {
    expect(mapReunion(httpReunion)).toMatchObject({
      id: "meeting-1",
      title: "Editorial",
      date: httpReunion.fecha,
      description: null,
      points: [{ id: "point-1", title: "Agenda", content: null, done: null }],
    });
  });

  it("loads the list with the associated points in one GET and passes cancellation", async () => {
    const signal = new AbortController().signal;
    vi.mocked(api.get).mockResolvedValue({ data: [httpReunion] });
    await expect(getReunions(signal)).resolves.toHaveLength(1);
    expect(api.get).toHaveBeenCalledWith("/reunions", { signal });
  });

  it("loads a selected Reunion through the existing detail endpoint", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: httpReunion });
    await getReunionDetails("meeting-1");
    expect(api.get).toHaveBeenCalledWith("/reunions/meeting-1", { signal: undefined });
  });

  it("creates and updates Reunions with typed backend DTOs and the origin header", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: httpReunion });
    vi.mocked(api.patch).mockResolvedValue({ data: httpReunion });
    await createReunion({ titulo: "Editorial", fecha: httpReunion.fecha }, "source-id");
    await updateReunion("meeting-1", { description: "Agenda" }, "source-id");
    expect(api.post).toHaveBeenCalledWith(
      "/reunions",
      { titulo: "Editorial", fecha: httpReunion.fecha },
      {
        headers: { "X-Riff-Valley-Client-Id": "source-id" },
      }
    );
    expect(api.patch).toHaveBeenCalledWith(
      "/reunions/meeting-1",
      { description: "Agenda" },
      {
        headers: { "X-Riff-Valley-Client-Id": "source-id" },
      }
    );
  });

  it("uses only the existing Points CRUD endpoints and carries source headers", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: httpReunion.points[0] });
    vi.mocked(api.patch).mockResolvedValue({ data: httpReunion.points[0] });
    vi.mocked(api.delete).mockResolvedValue({ data: undefined });
    await createPoint({ titulo: "Agenda", reunionId: "meeting-1" }, "source-id");
    await updatePoint("point-1", { done: true, reunionId: "meeting-2" }, "source-id");
    await deletePoint("point-1", "source-id");
    await deleteReunion("meeting-1", "source-id");
    expect(api.post).toHaveBeenCalledWith(
      "/points",
      { titulo: "Agenda", reunionId: "meeting-1" },
      {
        headers: { "X-Riff-Valley-Client-Id": "source-id" },
      }
    );
    expect(api.patch).toHaveBeenCalledWith(
      "/points/point-1",
      { done: true, reunionId: "meeting-2" },
      {
        headers: { "X-Riff-Valley-Client-Id": "source-id" },
      }
    );
    expect(api.delete).toHaveBeenCalledWith("/points/point-1", {
      headers: { "X-Riff-Valley-Client-Id": "source-id" },
    });
    expect(api.delete).toHaveBeenCalledWith("/reunions/meeting-1", {
      headers: { "X-Riff-Valley-Client-Id": "source-id" },
    });
    expect(api.post).not.toHaveBeenCalledWith(
      expect.stringContaining("/reunions/meeting-1/points"),
      expect.anything()
    );
  });
});
