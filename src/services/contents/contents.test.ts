import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, patch, remove } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@services/api/api", () => ({
  default: { get, post, patch, delete: remove },
}));

import {
  createContent,
  deleteContent,
  getContentById,
  getContents,
  getContentsByMonth,
  updateContent,
} from "./contents";
import { contentFixtures } from "@views/contentCalendar/contentFixtures";
import type { CreateContentDto, UpdateContentDto } from "./contents";

type Assert<T extends true> = T;
type CreateDateContractChecks = [
  Assert<
    Extract<CreateContentDto, { type: "radar" }> extends { publicationDate: string } ? true : false
  >,
  Assert<
    Extract<CreateContentDto, { type: "best" }> extends { publicationDate: string } ? true : false
  >,
  Assert<
    Extract<CreateContentDto, { type: "reunion" }> extends { publicationDate: string }
      ? true
      : false
  >,
  Assert<
    undefined extends Extract<CreateContentDto, { type: "article" }>["publicationDate"]
      ? true
      : false
  >,
];
const createDateContractChecks: CreateDateContractChecks = [true, true, true, true];

describe("Contents HTTP contract", () => {
  const responseData = [contentFixtures[0]];

  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: responseData });
    post.mockResolvedValue({ data: responseData[0] });
    patch.mockResolvedValue({ data: responseData[0] });
    remove.mockResolvedValue({ data: undefined });
  });

  it("GET /contents omits the query filter when it is undefined and preserves the response", async () => {
    await expect(getContents()).resolves.toBe(responseData);
    expect(get).toHaveBeenCalledWith("/contents", { params: undefined });
  });

  it.each([true, false])(
    "GET /contents serializes backlog=%s as a boolean query parameter",
    async (backlog) => {
      await getContents(backlog);
      expect(get).toHaveBeenCalledWith("/contents", { params: { backlog } });
    }
  );

  it("forwards AbortSignal to GET /contents without changing the filter contract", async () => {
    const controller = new AbortController();

    await getContents(true, controller.signal);

    expect(get).toHaveBeenCalledWith("/contents", {
      params: { backlog: true },
      signal: controller.signal,
    });
  });

  it("GET /contents/:id interpolates the supplied id without changing it", async () => {
    get.mockResolvedValueOnce({ data: responseData[0] });
    await expect(getContentById("content-1")).resolves.toBe(responseData[0]);
    expect(get).toHaveBeenCalledWith("/contents/content-1");
  });

  it("GET /contents/by-month serializes numeric year and month query parameters", async () => {
    await expect(getContentsByMonth(2026, 10)).resolves.toBe(responseData);
    expect(get).toHaveBeenCalledWith("/contents/by-month", {
      params: { year: 2026, month: 10 },
    });
  });

  it("forwards AbortSignal to GET /contents/by-month", async () => {
    const controller = new AbortController();

    await getContentsByMonth(2026, 10, controller.signal);

    expect(get).toHaveBeenCalledWith("/contents/by-month", {
      params: { year: 2026, month: 10 },
      signal: controller.signal,
    });
  });

  it("represents nullable and omitted backend response fields without normalizing them", async () => {
    const backlog = contentFixtures.find((content) => content.id === "photos-backlog")!;
    const scheduledArticle = contentFixtures.find((content) => content.id === "article-scheduled")!;
    const scheduledBest = contentFixtures.find((content) => content.id === "best-scheduled")!;

    const backendResponse = [backlog, scheduledArticle, scheduledBest];
    get.mockResolvedValueOnce({ data: backendResponse });
    const response = await getContents();

    expect(response).toBe(backendResponse);
    expect(response[0].author).toBeNull();
    expect(response[0].publicationDate).toBeNull();
    expect(response[0].article).toBeUndefined();
    expect(response[1].article?.id).toBe("article-1");
    expect(response[2].list).toBeNull();
  });

  it("accepts creation fields declared by NestJS and forwards them unchanged", async () => {
    const payload: CreateContentDto = {
      type: "article",
      name: "Artículo relacionado",
      authorId: "author-1",
      articleId: "article-1",
      videoId: "video-1",
      reunionId: "reunion-1",
      publicationDate: "2026-10-31T18:00:00.000Z",
      closeDate: "2026-11-02T18:00:00.000Z",
      listDate: "2026-10-30T18:00:00.000Z",
      ready: true,
      backlog: false,
    };

    await createContent(payload);

    expect(post).toHaveBeenCalledWith("/contents", payload);
  });

  it("requires a publication date at the type level only for date-mandatory Content types", () => {
    expect(createDateContractChecks).toEqual([true, true, true, true]);
  });

  it("keeps PATCH nulls distinct from omitted fields for all supported dates", async () => {
    const payload: UpdateContentDto = {
      publicationDate: null,
      closeDate: null,
      listDate: null,
      reunionId: null,
      notes: null,
    };

    await updateContent("content-1", payload);

    expect(patch).toHaveBeenCalledWith("/contents/content-1", payload);
    expect(patch.mock.calls[0][1]).toHaveProperty("publicationDate", null);
    expect(patch.mock.calls[0][1]).not.toHaveProperty("articleId");
  });

  it("POST /contents sends the supplied payload and returns the response data", async () => {
    const payload = {
      type: "article" as const,
      name: "Artículo planificado",
      authorId: "author-1",
      publicationDate: "2026-10-31T18:00:00.000Z",
      notes: "Nota editorial",
    };

    await expect(createContent(payload)).resolves.toBe(responseData[0]);
    expect(post).toHaveBeenCalledWith("/contents", payload);
  });

  it("keeps omitted optional POST fields omitted", async () => {
    const payload = { type: "photos" as const, name: "Fotos", authorId: "author-1", backlog: true };

    await createContent(payload);

    expect(post).toHaveBeenCalledWith("/contents", payload);
    expect(post.mock.calls[0][1]).not.toHaveProperty("publicationDate");
    expect(post.mock.calls[0][1]).not.toHaveProperty("closeDate");
  });

  it("PATCH /contents/:id preserves explicit null date fields and omitted fields", async () => {
    const payload = { publicationDate: null, closeDate: null };

    await expect(updateContent("content-1", payload)).resolves.toBe(responseData[0]);
    expect(patch).toHaveBeenCalledWith("/contents/content-1", payload);
    expect(patch.mock.calls[0][1]).not.toHaveProperty("name");
  });

  it("DELETE /contents/:id sends no body and resolves without exposing a response", async () => {
    await expect(deleteContent("content-1")).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith("/contents/content-1");
  });

  it.each([
    ["GET /contents", () => getContents()],
    ["GET /contents/:id", () => getContentById("content-1")],
    ["GET /contents/by-month", () => getContentsByMonth(2026, 10)],
    [
      "POST /contents",
      () => createContent({ type: "photos", name: "Fotos", authorId: "author-1" }),
    ],
    ["PATCH /contents/:id", () => updateContent("content-1", { name: "Editado" })],
    ["DELETE /contents/:id", () => deleteContent("content-1")],
  ])("propagates transport errors from %s unchanged", async (_endpoint, operation) => {
    const error = new Error("offline");
    get.mockRejectedValue(error);
    post.mockRejectedValue(error);
    patch.mockRejectedValue(error);
    remove.mockRejectedValue(error);

    await expect(operation()).rejects.toBe(error);
  });
});
