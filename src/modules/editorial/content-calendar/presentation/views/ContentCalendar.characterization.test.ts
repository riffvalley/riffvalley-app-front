// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { unref } from "vue";
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

const mocks = vi.hoisted(() => ({
  getContents: vi.fn(),
  getContentById: vi.fn(),
  getContentsByMonth: vi.fn(),
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
vi.mock("@/modules/identity/auth", () => ({ useAuthStore: () => mocks.authStore }));
vi.mock("@/modules/identity/users", () => ({ getRvUsers: mocks.getRvUsers }));
vi.mock("@services/contents/contents", () => ({
  getContents: mocks.getContents,
  getContentById: mocks.getContentById,
  getContentsByMonth: mocks.getContentsByMonth,
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

  it("updates Article fields through the Article owner without calling Content PATCH", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "article-scheduled" } });

    wrapper.findComponent(ArticleActionsModal).vm.$emit("update-article", {
      articleId: "article-1",
      name: "Título de artículo",
      type: "interview",
      status: "editing",
      link: "https://example.test/article",
      userId: "author-1",
      editorId: "author-2",
    });
    await flushPromises();

    expect(mocks.updateArticle).toHaveBeenCalledWith("article-1", {
      name: "Título de artículo",
      type: "interview",
      status: "editing",
      link: "https://example.test/article",
      userId: "author-1",
      editorId: "author-2",
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    expect(updateContent).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("updates Video fields through the Video owner and forwards only supplied assignments", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    await calendarOptions(wrapper).eventClick({ event: { id: "video-backlog" } });

    wrapper.findComponent(VideoActionsModal).vm.$emit("update-video", {
      videoId: "video-1",
      name: "Título del vídeo",
      type: "best",
      status: "editing",
      editorId: "author-2",
    });
    await flushPromises();

    expect(mocks.updateVideo).toHaveBeenCalledWith("video-1", {
      name: "Título del vídeo",
      type: "best",
      status: "editing",
      editorId: "author-2",
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    expect(updateContent).not.toHaveBeenCalled();
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
    expect(getContents).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("respects the existing backlog delete confirmation result", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    mocks.confirm.mockResolvedValueOnce({ isConfirmed: false });
    wrapper
      .findComponent({ name: "BacklogPanel" })
      .vm.$emit("delete-content", backlogContentFixtures[0]);
    await flushPromises();
    expect(deleteContent).not.toHaveBeenCalled();

    mocks.confirm.mockResolvedValueOnce({ isConfirmed: true });
    wrapper
      .findComponent({ name: "BacklogPanel" })
      .vm.$emit("delete-content", backlogContentFixtures[0]);
    await flushPromises();
    expect(deleteContent).toHaveBeenCalledWith("photos-backlog");
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["editorial", "contents", "content-calendar", "author-1", 1, "riffvalley"],
    });
    wrapper.unmount();
  });

  it("dims foreign calendar and backlog events when the legacy filter is enabled", async () => {
    const wrapper = mountCalendar();
    await flushPromises();
    await wrapper.get('button[title="Mostrar solo mis eventos"]').trigger("click");

    const options = calendarOptions(wrapper);
    const foreignEvent = options.eventContent({
      event: {
        title: "Otro autor",
        extendedProps: { author: { id: "author-2", username: "Editor" } },
      },
    });
    const ownEvent = options.eventContent({
      event: { title: "Propio", extendedProps: { author: { id: "author-1", username: "Autora" } } },
    });
    expect((foreignEvent.domNodes[0] as HTMLElement).className).toContain("opacity-30");
    expect((ownEvent.domNodes[0] as HTMLElement).style.border).toContain("2px");
    expect(wrapper.findAll(".fc-event.opacity-30").length).toBeGreaterThan(0);
    expect(wrapper.find('[data-event*="photos-backlog"]').classes()).toContain("opacity-30");
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
