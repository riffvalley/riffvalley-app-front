// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { reactive, unref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FullCalendar from "@fullcalendar/vue3";
import {
  createContent,
  deleteContent,
  getContents,
  getContentsByMonth,
  updateContent,
} from "@services/contents/contents";
import SwalService from "@services/swal/SwalService";
import ContentCalendar from "./ContentCalendar.vue";
import BacklogPanel from "../components/BacklogPanel.vue";
import { formatCalendarDateInput } from "../../utils/contentCalendarDates";
import { contentCalendarDeferredQueryKeys } from "../../application/contentCalendarDeferredQueries";
import {
  backlogContentFixtures,
  contentFixtures,
  scheduledContentFixtures,
} from "../../utils/contentFixtures";
import ArticleActionsModal from "../components/ArticleActionsModal.vue";
import CreateContentModal from "../components/CreateContentModal.vue";
import DeleteConfirmModal from "../components/DeleteConfirmModal.vue";
import EditContentModal from "../components/EditContentModal.vue";
import GenericActionsModal from "../components/GenericActionsModal.vue";
import PhotosActionsModal from "../components/PhotosActionsModal.vue";
import RadarActionsModal from "../components/RadarActionsModal.vue";
import ReunionActionsModal from "../components/ReunionActionsModal.vue";
import VideoActionsModal from "../components/VideoActionsModal.vue";
import { getListDetails } from "@services/list/list";
import { contentCalendarQueryKeys } from "../../application/contentCalendarQueries";

const mocks = vi.hoisted(() => ({
  getContents: vi.fn(),
  getContentsByMonth: vi.fn(),
  getContentById: vi.fn(),
  createContent: vi.fn(),
  updateContent: vi.fn(),
  deleteContent: vi.fn(),
  getRvUsers: vi.fn(),
  getListDetails: vi.fn(),
  getArticle: vi.fn(),
  getArticles: vi.fn(),
  getVideo: vi.fn(),
  getVideos: vi.fn(),
  getAsignationsByListService: vi.fn(),
  updateArticle: vi.fn(),
  updateVideo: vi.fn(),
  updateAsignationService: vi.fn(),
  deleteList: vi.fn(),
  updateList: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  confirm: vi.fn(),
  authStore: {
    userId: "author-1",
    username: "Autora",
    image: undefined as string | undefined,
    authSessionGeneration: 1,
    role: "riffvalley",
  },
}));
const authState = reactive(mocks.authStore);
let invalidateQueriesSpy!: ReturnType<typeof vi.spyOn<QueryClient, "invalidateQueries">>;
const queryClients: QueryClient[] = [];

vi.mock("@fullcalendar/vue3", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    default: defineComponent({
      name: "FullCalendar",
      props: { options: { type: Object, required: true } },
      setup: () => () => h("div", { "data-testid": "calendar-host" }),
    }),
  };
});
vi.mock("@fullcalendar/daygrid", () => ({ default: {} }));
vi.mock("@fullcalendar/interaction", () => ({ default: {}, Draggable: class Draggable {} }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/modules/identity/auth", () => ({ useAuthStore: () => authState }));
vi.mock("@/modules/identity/users", () => ({ getRvUsers: mocks.getRvUsers }));
vi.mock("@services/contents/contents", () => ({
  getContents: mocks.getContents,
  getContentsByMonth: mocks.getContentsByMonth,
  getContentById: mocks.getContentById,
  createContent: mocks.createContent,
  updateContent: mocks.updateContent,
  deleteContent: mocks.deleteContent,
}));
vi.mock("@services/list/list", () => ({
  deleteList: mocks.deleteList,
  getListDetails: mocks.getListDetails,
  updateList: mocks.updateList,
}));
vi.mock("@services/articles/articles", () => ({
  getArticle: mocks.getArticle,
  getArticles: mocks.getArticles,
  updateArticle: mocks.updateArticle,
}));
vi.mock("@services/videos/videos", () => ({
  getVideo: mocks.getVideo,
  getVideos: mocks.getVideos,
  updateVideo: mocks.updateVideo,
}));
vi.mock("@services/asignation/asignation", () => ({
  getAsignationsByListService: mocks.getAsignationsByListService,
  updateAsignationService: mocks.updateAsignationService,
}));
vi.mock("@services/swal/SwalService", () => ({
  default: { success: mocks.success, error: mocks.error, confirm: mocks.confirm },
}));

type CalendarOptions = {
  events: unknown;
  datesSet: (info: { view: { currentStart: Date | string } }) => void;
  eventContent: (arg: { event: { title: string; extendedProps: Record<string, unknown> } }) => {
    domNodes: Node[];
  };
  eventClick: (info: { event: { id: string } }) => Promise<void>;
  drop: (info: { draggedEl: HTMLElement; dateStr: string }) => Promise<void>;
  eventReceive: (info: { event: { remove: () => void } }) => void;
  eventDrop: (info: {
    event: { id: string; startStr: string; extendedProps: Record<string, unknown> };
    jsEvent?: { clientX: number; clientY: number };
    revert: () => void;
  }) => Promise<void>;
  eventDragStop: (info: {
    event: { id: string };
    jsEvent: { clientX: number; clientY: number };
    revert: () => void;
  }) => Promise<void>;
};

function calendarOptions(wrapper: ReturnType<typeof mount>): CalendarOptions {
  return wrapper.findComponent(FullCalendar).props("options") as CalendarOptions;
}

function eventContentFor(options: CalendarOptions) {
  return unref(options.events as never) as Array<{
    id: string;
    title: string;
    start: string;
    end?: string;
    allDay: boolean;
  }>;
}

function mountCalendar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  queryClients.push(queryClient);
  invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
  return mount(ContentCalendar, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }]],
      stubs: {
        CreateContentModal: true,
        EditContentModal: true,
        RadarActionsModal: true,
        PhotosActionsModal: true,
        ReunionActionsModal: true,
        ArticleActionsModal: true,
        VideoActionsModal: true,
        GenericActionsModal: true,
        LegendModal: true,
        DeleteConfirmModal: true,
      },
    },
  });
}

describe("Content Calendar legacy characterization", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00.000Z"));
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    vi.clearAllMocks();
    mocks.getRvUsers.mockResolvedValue([{ id: "author-1", username: "Autora" }]);
    mocks.getContents.mockResolvedValue(backlogContentFixtures);
    mocks.getContentsByMonth.mockResolvedValue(scheduledContentFixtures);
    mocks.createContent.mockResolvedValue(contentFixtures[0]);
    mocks.updateContent.mockResolvedValue(contentFixtures[0]);
    mocks.getContentById.mockResolvedValue(contentFixtures[0]);
    mocks.getArticle.mockResolvedValue({
      id: "article-1",
      name: "Artículo",
      type: "articulo",
      status: "editing",
    });
    mocks.getVideo.mockResolvedValue({
      id: "video-1",
      name: "Vídeo",
      type: "best",
      status: "editing",
    });
    mocks.deleteContent.mockResolvedValue(undefined);
    mocks.getListDetails.mockResolvedValue({
      id: "list-radar",
      name: "Radar",
      type: "week",
      asignations: [],
    });
    mocks.confirm.mockResolvedValue({ isConfirmed: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    queryClients.forEach((client) => client.clear());
    queryClients.length = 0;
  });

  it("formats API timestamps for a date input without changing their calendar date", () => {
    expect(formatCalendarDateInput("2026-10-31T23:30:00.000Z")).toBe("2026-10-31");
  });

  it("loads only backlog and the current month initially, then merges both result sets by id", async () => {
    const wrapper = mountCalendar();
    await flushPromises();

    expect(mocks.getRvUsers).not.toHaveBeenCalled();
    expect(mocks.getListDetails).not.toHaveBeenCalled();
    expect(mocks.getArticle).not.toHaveBeenCalled();
    expect(mocks.getArticles).not.toHaveBeenCalled();
    expect(mocks.getVideo).not.toHaveBeenCalled();
    expect(mocks.getVideos).not.toHaveBeenCalled();
    expect(mocks.getAsignationsByListService).not.toHaveBeenCalled();
    expect(getContents).toHaveBeenCalledWith(true, expect.any(AbortSignal));
    expect(getContents).toHaveBeenCalledOnce();
    expect(getContentsByMonth).toHaveBeenCalledWith(2026, 10, expect.any(AbortSignal));
    expect(getContentsByMonth).toHaveBeenCalledOnce();
    const events = eventContentFor(calendarOptions(wrapper));
    expect(events.map(({ id }) => id)).toContain("article-scheduled");
    expect(events.map(({ id }) => id)).not.toContain("photos-backlog");
    expect(wrapper.findAll("[data-event]")).toHaveLength(backlogContentFixtures.length);
    wrapper.unmount();
  });

  it("loads users only for a user form, reuses them in action modals, and keeps calendar data after a deferred error", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    expect(mocks.getRvUsers).not.toHaveBeenCalled();

    wrapper.findComponent({ name: "BacklogPanel" }).vm.$emit("create-new");
    await vi.waitFor(() => expect(mocks.getRvUsers).toHaveBeenCalledOnce());
    await flushPromises();
    expect(wrapper.findComponent(CreateContentModal).props("rvUsers")).toHaveLength(1);
    wrapper.findComponent(CreateContentModal).vm.$emit("close");
    await flushPromises();

    await calendarOptions(wrapper).eventClick({ event: { id: "article-scheduled" } });
    await flushPromises();
    expect(mocks.getRvUsers).toHaveBeenCalledOnce();
    expect(wrapper.findComponent(ArticleActionsModal).props("rvUsers")).toHaveLength(1);
    expect(eventContentFor(calendarOptions(wrapper)).map(({ id }) => id)).toContain(
      "article-scheduled"
    );
    wrapper.unmount();
  });

  it("keeps calendar and backlog available when a deferred users query fails", async () => {
    mocks.getRvUsers.mockRejectedValue(new Error("identity unavailable"));
    const wrapper = mountCalendar();
    await flushPromises();
    wrapper.findComponent({ name: "BacklogPanel" }).vm.$emit("create-new");
    await vi.waitFor(() => expect(mocks.getRvUsers).toHaveBeenCalledOnce());
    await flushPromises();

    expect(wrapper.findAll("[data-event]")).toHaveLength(backlogContentFixtures.length);
    expect(eventContentFor(calendarOptions(wrapper)).map(({ id }) => id)).toContain(
      "article-scheduled"
    );
    expect(wrapper.text()).not.toContain("No se han podido cargar los contenidos");
    wrapper.unmount();
  });

  it("keeps calendar and backlog available when a deferred List query fails", async () => {
    mocks.getListDetails.mockRejectedValue(new Error("Lists unavailable"));
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "radar-scheduled" } });
    await flushPromises();

    expect(mocks.getListDetails).toHaveBeenCalledOnce();
    expect(wrapper.findAll("[data-event]")).toHaveLength(backlogContentFixtures.length);
    expect(eventContentFor(calendarOptions(wrapper)).map(({ id }) => id)).toContain(
      "article-scheduled"
    );
    expect(wrapper.text()).not.toContain("No se han podido cargar los contenidos");
    wrapper.unmount();
  });

  it("shows a monthly query error with retry and recovers without treating it as an empty month", async () => {
    mocks.getContentsByMonth
      .mockRejectedValueOnce(new Error("HTTP unavailable"))
      .mockResolvedValueOnce(scheduledContentFixtures);
    const wrapper = mountCalendar();
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain("No se han podido cargar");
    expect(wrapper.get('[role="alert"]').text()).not.toContain("No hay contenidos");
    await wrapper.get('[role="alert"] button').trigger("click");
    await flushPromises();

    expect(mocks.getContentsByMonth).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("No hay contenidos programados");
    wrapper.unmount();
  });

  it("keeps a duplicate id once when monthly and backlog responses overlap", async () => {
    mocks.getContents.mockResolvedValue([contentFixtures[0], ...backlogContentFixtures]);
    mocks.getContentsByMonth.mockResolvedValue([contentFixtures[0], ...scheduledContentFixtures]);
    const wrapper = mountCalendar();
    await flushPromises();

    expect(
      eventContentFor(calendarOptions(wrapper)).filter(({ id }) => id === "article-scheduled")
    ).toHaveLength(1);
    wrapper.unmount();
  });

  it("converts scheduled Content to all-day events and uses an exclusive close date", async () => {
    const wrapper = mountCalendar();
    await flushPromises();

    const article = eventContentFor(calendarOptions(wrapper)).find(
      ({ id }) => id === "article-scheduled"
    );
    expect(article).toMatchObject({ start: "2026-10-31", end: "2026-11-03", allDay: true });
    expect(eventContentFor(calendarOptions(wrapper)).map(({ id }) => id)).not.toContain(
      "video-backlog"
    );
    wrapper.unmount();
  });

  it("preserves the date text of offset timestamps and omits a close date before the start", async () => {
    const offsetArticle = {
      ...contentFixtures[0],
      id: "offset-article",
      publicationDate: "2026-10-31T23:30:00-07:00",
      closeDate: "2026-10-30T18:00:00.000Z",
    };
    mocks.getContentsByMonth.mockResolvedValue([offsetArticle]);
    const wrapper = mountCalendar();
    await flushPromises();

    expect(
      eventContentFor(calendarOptions(wrapper)).find(({ id }) => id === "offset-article")
    ).toMatchObject({ start: "2026-10-31", end: undefined, allDay: true });
    wrapper.unmount();
  });

  it("loads the month represented by FullCalendar currentStart at a month boundary", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    const start = new Date(2026, 10, 1);
    const callsBeforeNavigation = vi.mocked(getContentsByMonth).mock.calls.length;

    calendarOptions(wrapper).datesSet({ view: { currentStart: start } });
    await flushPromises();

    expect(getContentsByMonth).toHaveBeenLastCalledWith(2026, 11, expect.any(AbortSignal));
    expect(vi.mocked(getContentsByMonth).mock.calls.length - callsBeforeNavigation).toBe(1);
    wrapper.unmount();
  });

  it("creates Content with the selected calendar day and omits blank optional values", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    const form = {
      type: "article",
      name: "Nuevo artículo",
      notes: "",
      publicationDate: "2026-10-31T00:30",
      closeDate: "",
      authorId: "author-1",
    };

    wrapper.findComponent(CreateContentModal).vm.$emit("create", form);
    await flushPromises();

    expect(createContent).toHaveBeenCalledWith({
      type: "article",
      name: "Nuevo artículo",
      notes: undefined,
      publicationDate: "2026-10-31",
      closeDate: undefined,
      authorId: "author-1",
      listDate: undefined,
      backlog: false,
    });
    expect(wrapper.findComponent(CreateContentModal).props("show")).toBe(false);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    wrapper.unmount();
  });

  it.each(["radar", "best", "reunion"])(
    "requires a publication date when creating %s",
    async (type) => {
      const wrapper = mountCalendar();
      await flushPromises();
      wrapper.findComponent(CreateContentModal).vm.$emit("create", {
        type,
        name: "Tipo con fecha obligatoria",
        authorId: "author-1",
        publicationDate: "",
      });
      await flushPromises();

      expect(createContent).not.toHaveBeenCalled();
      expect(SwalService.error).toHaveBeenCalledWith(
        expect.stringContaining("fecha de publicación obligatoria")
      );
      wrapper.unmount();
    }
  );

  it("edits a backlog item without shifting its selected day and clears closeDate", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    // Emit through the BacklogPanel's public edit event to avoid depending on its serialized HTML attribute.
    const backlog = wrapper.findComponent({ name: "BacklogPanel" });
    backlog.vm.$emit("edit-content", backlogContentFixtures[0]);
    await flushPromises();
    wrapper.findComponent(EditContentModal).vm.$emit("update", {
      type: "photos",
      name: "Fotos editadas",
      notes: "",
      publicationDate: "2026-11-02T00:30",
      closeDate: "",
      authorId: "author-2",
    });
    await flushPromises();

    expect(updateContent).toHaveBeenCalledWith("photos-backlog", {
      type: "photos",
      name: "Fotos editadas",
      notes: undefined,
      publicationDate: "2026-11-02",
      closeDate: null,
      authorId: "author-2",
    });
    expect(wrapper.findComponent(EditContentModal).props("show")).toBe(false);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    wrapper.unmount();
  });

  it("updates Content and Article and invalidates their calendar projection", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "article-scheduled" } });

    wrapper.findComponent(ArticleActionsModal).vm.$emit(
      "save",
      {
        type: "article",
        name: "Título de artículo",
        notes: "Nota editada",
        publicationDate: "2026-10-31",
        authorId: "author-1",
      },
      {
        articleId: "article-1",
        name: "Título de artículo",
        type: "entrevista",
        status: "editing",
        link: "https://example.test/article",
        userId: "author-1",
        editorId: "author-2",
      }
    );
    await flushPromises();

    expect(mocks.updateArticle).toHaveBeenCalledWith("article-1", {
      name: "Título de artículo",
      type: "entrevista",
      status: "editing",
      link: "https://example.test/article",
      userId: "author-1",
      editorId: "author-2",
    });
    expect(updateContent).toHaveBeenCalledWith("article-scheduled", {
      type: "article",
      name: "Título de artículo",
      notes: "Nota editada",
      publicationDate: "2026-10-31",
      closeDate: null,
      authorId: "author-1",
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    wrapper.unmount();
  });

  it("updates Content and Video and forwards only changed assignments", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "video-backlog" } });

    wrapper.findComponent(VideoActionsModal).vm.$emit(
      "save",
      {
        type: "video",
        name: "Título del vídeo",
        notes: "Notas actualizadas",
        publicationDate: "",
        authorId: "author-1",
      },
      {
        videoId: "video-1",
        name: "Título del vídeo",
        type: "best",
        status: "editing",
        editorId: "author-2",
      }
    );
    await flushPromises();

    expect(mocks.updateVideo).toHaveBeenCalledWith("video-1", {
      name: "Título del vídeo",
      type: "best",
      status: "editing",
      editorId: "author-2",
    });
    expect(updateContent).toHaveBeenCalledWith("video-backlog", {
      type: "video",
      name: "Título del vídeo",
      notes: "Notas actualizadas",
      publicationDate: "",
      closeDate: null,
      authorId: "author-1",
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    wrapper.unmount();
  });

  it("keeps the Article modal open after a partial save and retries only Article", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "article-scheduled" } });
    mocks.updateArticle.mockRejectedValueOnce({ response: { status: 400 } });
    const contentData = {
      type: "article" as const,
      name: "Parcial",
      notes: "Conservar",
      publicationDate: "2026-10-31",
      authorId: "author-1",
    };
    const articleData = {
      articleId: "article-1",
      name: "Parcial",
      type: "entrevista" as const,
      status: "editing" as const,
      link: "",
      userId: "author-1",
      editorId: "author-2",
    };

    wrapper.findComponent(ArticleActionsModal).vm.$emit("save", contentData, articleData);
    await flushPromises();
    expect(wrapper.findComponent(ArticleActionsModal).props("show")).toBe(true);
    expect(wrapper.findComponent(ArticleActionsModal).props("saveStatus")).toMatchObject({
      saving: false,
      retryAvailable: true,
      message: expect.stringContaining("solo se repetirá la parte fallida"),
    });
    expect(updateContent).toHaveBeenCalledTimes(1);

    wrapper.findComponent(ArticleActionsModal).vm.$emit("save", contentData, articleData);
    await flushPromises();
    expect(updateContent).toHaveBeenCalledTimes(1);
    expect(mocks.updateArticle).toHaveBeenCalledTimes(2);
    expect(wrapper.findComponent(ArticleActionsModal).props("show")).toBe(false);
    wrapper.unmount();
  });

  it("retries only Video after Content succeeds and Video fails", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "video-backlog" } });
    mocks.updateVideo.mockRejectedValueOnce({ response: { status: 400 } });
    const contentData = {
      type: "video" as const,
      name: "Vídeo parcial",
      notes: "Mantener",
      publicationDate: "",
      authorId: "author-1",
    };
    const videoData = {
      videoId: "video-1",
      name: "Vídeo parcial",
      type: "best" as const,
      status: "editing" as const,
      editorId: "author-2",
    };

    wrapper.findComponent(VideoActionsModal).vm.$emit("save", contentData, videoData);
    await flushPromises();
    expect(wrapper.findComponent(VideoActionsModal).props("show")).toBe(true);
    expect(updateContent).toHaveBeenCalledTimes(1);

    wrapper.findComponent(VideoActionsModal).vm.$emit("save", contentData, videoData);
    await flushPromises();
    expect(updateContent).toHaveBeenCalledTimes(1);
    expect(mocks.updateVideo).toHaveBeenCalledTimes(2);
    expect(wrapper.findComponent(VideoActionsModal).props("show")).toBe(false);
    wrapper.unmount();
  });

  it("blocks retry after an uncertain Article timeout when reconciliation also fails", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "article-scheduled" } });
    mocks.updateArticle.mockRejectedValueOnce(new Error("timeout"));
    mocks.getArticle.mockRejectedValueOnce(new Error("reconciliation unavailable"));
    const contentData = {
      type: "article" as const,
      name: "Incierto",
      notes: "Nota",
      publicationDate: "2026-10-31",
      authorId: "author-1",
    };
    const articleData = {
      articleId: "article-1",
      name: "Incierto",
      type: "entrevista" as const,
      status: "editing" as const,
      link: "https://example.test",
      userId: "author-1",
      editorId: "author-2",
    };

    wrapper.findComponent(ArticleActionsModal).vm.$emit("save", contentData, articleData);
    await flushPromises();

    expect(mocks.updateArticle).toHaveBeenCalledOnce();
    expect(mocks.getArticle).toHaveBeenCalledOnce();
    expect(wrapper.findComponent(ArticleActionsModal).props("show")).toBe(true);
    expect(wrapper.findComponent(ArticleActionsModal).props("saveStatus")).toMatchObject({
      retryAvailable: false,
      message: expect.stringContaining("no se puede confirmar"),
    });
    mocks.getArticle.mockResolvedValueOnce({
      id: "article-1",
      name: "Incierto",
      type: "entrevista",
      status: "editing",
      link: "https://example.test",
      userId: "author-1",
      editorId: "author-2",
    });
    wrapper.findComponent(ArticleActionsModal).vm.$emit("save", contentData, articleData);
    await flushPromises();
    expect(mocks.updateArticle).toHaveBeenCalledOnce();
    expect(mocks.getArticle).toHaveBeenCalledTimes(2);
    expect(wrapper.findComponent(ArticleActionsModal).props("show")).toBe(false);
    wrapper.unmount();
  });

  it("does not remove an external Backlog item when its PATCH fails", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    mocks.updateContent.mockRejectedValueOnce({ response: { status: 400 } });
    const draggedEl = document.createElement("div");
    draggedEl.setAttribute("data-event", JSON.stringify({ id: "photos-backlog" }));
    document.body.appendChild(draggedEl);

    await calendarOptions(wrapper).drop({ draggedEl, dateStr: "2026-11-02" });
    calendarOptions(wrapper).eventReceive({ event: { remove: vi.fn() } });

    expect(draggedEl.parentNode).toBe(document.body);
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    draggedEl.remove();
    wrapper.unmount();
  });

  it("reconciles an external move after a lost PATCH response before removing its Backlog card", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    mocks.updateContent.mockRejectedValueOnce(new Error("connection lost"));
    mocks.getContentById.mockResolvedValueOnce({
      ...contentFixtures[1],
      publicationDate: "2026-11-02T18:00:00.000Z",
      backlog: false,
    });
    const draggedEl = document.createElement("div");
    draggedEl.setAttribute("data-event", JSON.stringify({ id: "photos-backlog" }));
    document.body.appendChild(draggedEl);

    await calendarOptions(wrapper).drop({ draggedEl, dateStr: "2026-11-02" });

    expect(mocks.getContentById).toHaveBeenCalledWith("photos-backlog");
    expect(draggedEl.parentNode).toBeNull();
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    wrapper.unmount();
  });

  it("requires a successful read reconciliation before allowing another uncertain move", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    mocks.updateContent.mockRejectedValueOnce(new Error("connection lost"));
    mocks.getContentById
      .mockRejectedValueOnce(new Error("read unavailable"))
      .mockResolvedValueOnce(contentFixtures[1]);
    const draggedEl = document.createElement("div");
    draggedEl.setAttribute("data-event", JSON.stringify({ id: "photos-backlog" }));
    document.body.appendChild(draggedEl);

    await calendarOptions(wrapper).drop({ draggedEl, dateStr: "2026-11-02" });
    await calendarOptions(wrapper).drop({ draggedEl, dateStr: "2026-11-03" });

    expect(mocks.updateContent).toHaveBeenCalledOnce();
    expect(mocks.getContentById).toHaveBeenCalledTimes(2);
    expect(draggedEl.parentNode).toBe(document.body);
    draggedEl.remove();
    wrapper.unmount();
  });

  it("rejects a second move while the first is pending", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    let finish!: (value: unknown) => void;
    mocks.updateContent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const firstRevert = vi.fn();
    const secondRevert = vi.fn();
    const first = calendarOptions(wrapper).eventDrop({
      event: { id: "article-scheduled", startStr: "2026-11-03", extendedProps: {} },
      revert: firstRevert,
    });
    await calendarOptions(wrapper).eventDrop({
      event: { id: "article-scheduled", startStr: "2026-11-04", extendedProps: {} },
      revert: secondRevert,
    });
    expect(mocks.updateContent).toHaveBeenCalledOnce();
    expect(secondRevert).toHaveBeenCalledOnce();
    finish(contentFixtures[0]);
    await first;
    expect(firstRevert).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("keeps the month query independent when navigation happens during a pending move", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    let finish!: (value: unknown) => void;
    mocks.updateContent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const options = calendarOptions(wrapper);
    const pending = options.eventDrop({
      event: { id: "article-scheduled", startStr: "2026-11-03", extendedProps: {} },
      revert: vi.fn(),
    });

    options.datesSet({ view: { currentStart: new Date("2026-11-01T00:00:00.000Z") } });
    await flushPromises();
    expect(mocks.getContentsByMonth).toHaveBeenCalledWith(2026, 11, expect.any(AbortSignal));

    finish(contentFixtures[0]);
    await pending;
    await flushPromises();
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    expect(eventContentFor(options).every((event) => event.allDay)).toBe(true);
    wrapper.unmount();
  });

  it("reverts a failed calendar-to-calendar move", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    mocks.updateContent.mockRejectedValueOnce({ response: { status: 400 } });
    const revert = vi.fn();
    await calendarOptions(wrapper).eventDrop({
      event: { id: "article-scheduled", startStr: "2026-11-04", extendedProps: {} },
      revert,
    });
    expect(revert).toHaveBeenCalledOnce();
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("reverts a failed calendar-to-backlog move", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    const target = wrapper
      .findComponent(BacklogPanel)
      .element.querySelector<HTMLElement>(".flex-1")!;
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    });
    mocks.updateContent.mockRejectedValueOnce({ response: { status: 400 } });
    const revert = vi.fn();
    await calendarOptions(wrapper).eventDragStop({
      event: { id: "article-scheduled" },
      jsEvent: { clientX: 10, clientY: 10 },
      revert,
    });
    expect(revert).toHaveBeenCalledOnce();
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("sends one PATCH when a calendar event is dropped over the Backlog", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    const target = wrapper
      .findComponent(BacklogPanel)
      .element.querySelector<HTMLElement>(".flex-1")!;
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    });
    const options = calendarOptions(wrapper);
    const revert = vi.fn();
    await options.eventDrop({
      event: { id: "article-scheduled", startStr: "2026-11-03", extendedProps: {} },
      jsEvent: { clientX: 10, clientY: 10 },
      revert,
    });
    expect(updateContent).not.toHaveBeenCalled();
    await options.eventDragStop({
      event: { id: "article-scheduled" },
      jsEvent: { clientX: 10, clientY: 10 },
      revert,
    });
    expect(updateContent).toHaveBeenCalledOnce();
    expect(updateContent).toHaveBeenCalledWith("article-scheduled", {
      publicationDate: null,
      backlog: true,
    });
    wrapper.unmount();
  });

  it("opens the matching details modal for each of the seven Content types", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    const modalByType = [
      ["article", ArticleActionsModal],
      ["photos", PhotosActionsModal],
      ["riff_valley_playlist", GenericActionsModal],
      ["radar", RadarActionsModal],
      ["best", RadarActionsModal],
      ["video", VideoActionsModal],
      ["reunion", ReunionActionsModal],
    ] as const;

    for (const [type, modal] of modalByType) {
      const content = contentFixtures.find((item) => item.type === type)!;
      await calendarOptions(wrapper).eventClick({ event: { id: content.id } });
      expect(wrapper.findComponent(modal).props("show")).toBe(true);
      await wrapper.findComponent(modal).vm.$emit("close");
    }
    expect(mocks.getRvUsers).toHaveBeenCalledOnce();
    expect(getListDetails).toHaveBeenCalledWith("list-radar", expect.any(AbortSignal));
    expect(getListDetails).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("invalidates the cached List details after a successful Radar status update", async () => {
    const details = {
      id: "list-radar",
      name: "Radar",
      type: "week",
      status: "new",
      asignations: [],
    };
    mocks.getListDetails.mockResolvedValue(details);
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "radar-scheduled" } });
    await flushPromises();

    wrapper
      .findComponent(RadarActionsModal)
      .vm.$emit("update-status", { ...details, status: "assigned" });
    await flushPromises();

    expect(mocks.updateList).toHaveBeenCalledWith("list-radar", { status: "assigned" });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: contentCalendarDeferredQueryKeys.listDetails(
        { userId: "author-1", generation: 1, role: "riffvalley" },
        "list-radar"
      ),
      exact: true,
    });
    expect(mocks.getListDetails).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("preserves cached List details when a List mutation fails", async () => {
    const details = {
      id: "list-radar",
      name: "Radar",
      type: "week",
      status: "new",
      asignations: [],
    };
    mocks.getListDetails.mockResolvedValue(details);
    mocks.updateList.mockRejectedValueOnce(new Error("update failed"));
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "radar-scheduled" } });
    await flushPromises();

    wrapper
      .findComponent(RadarActionsModal)
      .vm.$emit("update-status", { ...details, status: "assigned" });
    await flushPromises();

    const detailKey = contentCalendarDeferredQueryKeys.listDetails(
      { userId: "author-1", generation: 1, role: "riffvalley" },
      "list-radar"
    );
    expect(queryClients[0].getQueryData(detailKey)).toMatchObject({ status: "new" });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({ queryKey: detailKey, exact: true });
    wrapper.unmount();
  });

  it("invalidates List details after an assignment is updated", async () => {
    const details = {
      id: "list-radar",
      name: "Radar",
      type: "week",
      status: "new",
      asignations: [{ id: "asignation-1", done: false, position: 1, description: "Revisar" }],
    };
    mocks.getListDetails.mockResolvedValue(details);
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "radar-scheduled" } });
    await flushPromises();

    wrapper.findComponent(RadarActionsModal).vm.$emit("toggle-asignation", details.asignations[0]);
    await flushPromises();

    expect(mocks.updateAsignationService).toHaveBeenCalledWith("asignation-1", { done: true });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: contentCalendarDeferredQueryKeys.listDetails(
        { userId: "author-1", generation: 1, role: "riffvalley" },
        "list-radar"
      ),
      exact: true,
    });
    wrapper.unmount();
  });

  it("confirms calendar deletion and invalidates Content Calendar queries", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "article-scheduled" } });
    wrapper.findComponent(ArticleActionsModal).vm.$emit("delete");
    await flushPromises();
    expect(wrapper.findComponent(DeleteConfirmModal).props("show")).toBe(true);

    wrapper.findComponent(DeleteConfirmModal).vm.$emit("confirm");
    await flushPromises();

    expect(deleteContent).toHaveBeenCalledWith("article-scheduled");
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    expect(wrapper.findComponent(DeleteConfirmModal).props("show")).toBe(false);
    expect(mocks.success).toHaveBeenCalledWith("Entrada eliminada correctamente");
    expect(getContents).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("keeps deletion pending and sends only one DELETE while confirmation is repeated", async () => {
    let resolveDelete!: () => void;
    mocks.deleteContent.mockImplementationOnce(
      () => new Promise<void>((resolve) => (resolveDelete = resolve))
    );
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "article-scheduled" } });
    wrapper.findComponent(ArticleActionsModal).vm.$emit("delete");
    await flushPromises();

    const modal = wrapper.findComponent(DeleteConfirmModal);
    modal.vm.$emit("confirm");
    await flushPromises();
    expect(modal.props("pending")).toBe(true);
    modal.vm.$emit("confirm");
    await flushPromises();
    expect(mocks.deleteContent).toHaveBeenCalledTimes(1);

    resolveDelete();
    await flushPromises();
    expect(modal.props("show")).toBe(false);
    expect(modal.props("pending")).toBe(false);
    wrapper.unmount();
  });

  it("keeps the dialog open and exposes an error when DELETE is rejected", async () => {
    mocks.deleteContent.mockRejectedValueOnce({ response: { status: 409 } });
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "article-scheduled" } });
    wrapper.findComponent(ArticleActionsModal).vm.$emit("delete");
    await flushPromises();

    const modal = wrapper.findComponent(DeleteConfirmModal);
    modal.vm.$emit("confirm");
    await flushPromises();

    expect(mocks.deleteContent).toHaveBeenCalledWith("article-scheduled");
    expect(modal.props("show")).toBe(true);
    expect(modal.props("errorMessage")).toContain("No se pudo eliminar el contenido");
    expect(mocks.error).toHaveBeenCalledWith("No se pudo eliminar el contenido");
    expect(mocks.success).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("reconciles an uncertain DELETE before treating a 404 as confirmed removal", async () => {
    mocks.deleteContent.mockRejectedValueOnce(new Error("connection lost"));
    mocks.getContentById
      .mockRejectedValueOnce(new Error("reconciliation unavailable"))
      .mockRejectedValueOnce({ response: { status: 404 } });
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "article-scheduled" } });
    wrapper.findComponent(ArticleActionsModal).vm.$emit("delete");
    await flushPromises();

    const modal = wrapper.findComponent(DeleteConfirmModal);
    modal.vm.$emit("confirm");
    await flushPromises();
    expect(modal.props("show")).toBe(true);
    expect(modal.props("errorMessage")).toContain("No se pudo comprobar el resultado");

    modal.vm.$emit("confirm");
    await flushPromises();
    expect(mocks.deleteContent).toHaveBeenCalledTimes(1);
    expect(mocks.getContentById).toHaveBeenCalledTimes(2);
    expect(modal.props("show")).toBe(false);
    expect(mocks.success).toHaveBeenCalledWith("Entrada eliminada correctamente");
    wrapper.unmount();
  });

  it("uses the type-specific confirmation for backlog deletion", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    wrapper
      .findComponent({ name: "BacklogPanel" })
      .vm.$emit("delete-content", backlogContentFixtures[0]);
    await flushPromises();
    const modal = wrapper.findComponent(DeleteConfirmModal);
    expect(modal.props("show")).toBe(true);
    expect(modal.props("contentType")).toBe("photos");
    expect(modal.props("contentName")).toBe(backlogContentFixtures[0].name);
    modal.vm.$emit("cancel");
    await flushPromises();
    expect(deleteContent).not.toHaveBeenCalled();
    expect(modal.props("show")).toBe(false);

    wrapper
      .findComponent({ name: "BacklogPanel" })
      .vm.$emit("delete-content", backlogContentFixtures[0]);
    await flushPromises();
    modal.vm.$emit("confirm");
    await flushPromises();
    expect(deleteContent).toHaveBeenCalledWith("photos-backlog");
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    expect(modal.props("show")).toBe(false);
    wrapper.unmount();
  });

  it("hides foreign and authorless calendar and backlog content when enabled", async () => {
    mocks.getContents.mockResolvedValue([
      ...backlogContentFixtures,
      {
        ...backlogContentFixtures[0]!,
        id: "foreign-backlog",
        author: { id: "author-2", username: "Editor" },
      },
    ]);
    const wrapper = mountCalendar();
    await flushPromises();
    const queryClient = queryClients[queryClients.length - 1]!;
    const backlogKey = contentCalendarQueryKeys.backlog("author-1", 1, "riffvalley");
    const monthKey = contentCalendarQueryKeys.month("author-1", 1, "riffvalley", 2026, 10);
    const cachedBefore = structuredClone({
      backlog: queryClient.getQueryData(backlogKey),
      month: queryClient.getQueryData(monthKey),
    });
    await wrapper.get('button[title="Mostrar solo mis eventos"]').trigger("click");

    expect(eventContentFor(calendarOptions(wrapper)).map(({ id }) => id)).toEqual([
      "article-scheduled",
      "radar-scheduled",
    ]);
    expect(wrapper.findAll("[data-event]")).toHaveLength(1);
    expect(wrapper.find('[data-event*="video-backlog"]').exists()).toBe(true);
    expect(wrapper.find('[data-event*="photos-backlog"]').exists()).toBe(false);
    expect(wrapper.find('[data-event*="foreign-backlog"]').exists()).toBe(false);
    expect({
      backlog: queryClient.getQueryData(backlogKey),
      month: queryClient.getQueryData(monthKey),
    }).toEqual(cachedBefore);
    wrapper.unmount();
  });

  it("keeps the filter enabled across month navigation and applies refreshed query data", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    await wrapper.get('button[title="Mostrar solo mis eventos"]').trigger("click");

    calendarOptions(wrapper).datesSet({
      view: { currentStart: new Date("2026-11-01T00:00:00.000Z") },
    });
    await flushPromises();
    expect(mocks.getContentsByMonth).toHaveBeenCalledWith(2026, 11, expect.any(AbortSignal));
    expect(eventContentFor(calendarOptions(wrapper)).map(({ id }) => id)).toEqual([
      "article-scheduled",
      "radar-scheduled",
    ]);

    mocks.getContentsByMonth.mockResolvedValueOnce([
      { ...scheduledContentFixtures[0]!, id: "refreshed-own" },
      {
        ...scheduledContentFixtures[1]!,
        id: "refreshed-foreign",
        author: { id: "author-2", username: "Editor" },
      },
    ]);
    const queryClient = queryClients[queryClients.length - 1]!;
    await queryClient.invalidateQueries({
      queryKey: contentCalendarQueryKeys.month("author-1", 1, "riffvalley", 2026, 11),
    });
    await flushPromises();
    const refreshedIds = eventContentFor(calendarOptions(wrapper)).map(({ id }) => id);
    expect(refreshedIds).toContain("refreshed-own");
    expect(refreshedIds).not.toContain("refreshed-foreign");
    expect(wrapper.get('button[title="Mostrar todos los eventos"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("recomputes ownership when the authenticated user or session changes", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    await wrapper.get('button[title="Mostrar solo mis eventos"]').trigger("click");

    authState.userId = "author-2";
    authState.authSessionGeneration = 2;
    await flushPromises();
    expect(eventContentFor(calendarOptions(wrapper)).map(({ id }) => id)).toEqual([
      "playlist-scheduled",
      "best-scheduled",
    ]);
    expect(mocks.getContents).toHaveBeenCalledTimes(2);

    authState.userId = null;
    authState.authSessionGeneration = 3;
    await flushPromises();
    expect(eventContentFor(calendarOptions(wrapper))).toEqual([]);
    expect(wrapper.find('button[title="Mostrar solo mis eventos"]').exists()).toBe(false);
    authState.userId = "author-1";
    authState.authSessionGeneration = 1;
    wrapper.unmount();
  });

  it("programs a backlog item at 18:00 UTC and removes FullCalendar's auto-added event", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    const draggedEl = document.createElement("div");
    draggedEl.setAttribute("data-event", JSON.stringify({ id: "photos-backlog" }));
    document.body.appendChild(draggedEl);
    const remove = vi.spyOn(draggedEl.parentNode!, "removeChild");

    await calendarOptions(wrapper).drop({ draggedEl, dateStr: "2026-11-02" });
    const removeEvent = vi.fn();
    calendarOptions(wrapper).eventReceive({ event: { remove: removeEvent } });

    expect(updateContent).toHaveBeenCalledWith("photos-backlog", {
      publicationDate: "2026-11-02T18:00:00.000Z",
      backlog: false,
    });
    expect(remove).toHaveBeenCalledWith(draggedEl);
    expect(removeEvent).toHaveBeenCalledOnce();
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    draggedEl.remove();
    wrapper.unmount();
  });

  it("moves an event between dates through eventDrop and uses 18:00 UTC for date-only values", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    const revert = vi.fn();

    await calendarOptions(wrapper).eventDrop({
      event: {
        id: "article-scheduled",
        startStr: "2026-11-03",
        extendedProps: { contentType: "article" },
      },
      revert,
    });

    expect(updateContent).toHaveBeenCalledWith("article-scheduled", {
      publicationDate: "2026-11-03T18:00:00.000Z",
      backlog: false,
    });
    expect(revert).not.toHaveBeenCalled();
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    wrapper.unmount();
  });

  it("returns optional-date content to backlog with an explicit null publication date", async () => {
    const wrapper = mountCalendar();
    await flushPromises();

    await calendarOptions(wrapper).eventDragStop({
      event: { id: "article-scheduled" },
      jsEvent: { clientX: 0, clientY: 0 },
      revert: vi.fn(),
    });

    expect(updateContent).toHaveBeenCalledWith("article-scheduled", {
      publicationDate: null,
      backlog: true,
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    wrapper.unmount();
  });

  it.each(["reunion-scheduled", "radar-scheduled", "best-scheduled"])(
    "prevents mandatory-date content %s from returning to backlog",
    async (id) => {
      const wrapper = mountCalendar();
      await flushPromises();
      const revert = vi.fn();

      await calendarOptions(wrapper).eventDragStop({
        event: { id },
        jsEvent: { clientX: 0, clientY: 0 },
        revert,
      });

      expect(revert).toHaveBeenCalledOnce();
      expect(updateContent).not.toHaveBeenCalled();
      wrapper.unmount();
    }
  );

  it("prevents a Radar with assignments from moving to a different date", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    const revert = vi.fn();

    await calendarOptions(wrapper).eventDrop({
      event: {
        id: "radar-scheduled",
        startStr: "2026-11-05",
        extendedProps: { contentType: "radar", list: { asignations: [{ id: "asignation-1" }] } },
      },
      revert,
    });

    expect(revert).toHaveBeenCalledOnce();
    expect(updateContent).not.toHaveBeenCalled();
    expect(SwalService.error).toHaveBeenCalledWith(
      "No se puede mover un Radar que ya tiene asignaciones."
    );
    wrapper.unmount();
  });
});
