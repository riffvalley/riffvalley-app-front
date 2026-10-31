import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from "vue";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
import type {
  CalendarOptions,
  DatesSetArg,
  EventContentArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import type { DropArg, EventReceiveArg, EventDragStopArg } from "@fullcalendar/interaction";
import type { Content, ContentType } from "@services/contents/contents";
import type BacklogPanel from "../components/BacklogPanel.vue";
import {
  getContentTypeLabel,
  readContentCalendarEventProps,
  toContentCalendarEvents,
} from "../../utils/contentCalendarEvents";
import SwalService from "@services/swal/SwalService";
import type { ContentMoveResult } from "../../application/useContentCalendarOperations";

interface UseContentCalendarFullCalendarOptions {
  allContents: ComputedRef<Content[]>;
  userId: ComputedRef<string | null>;
  showOnlyMyEvents: Ref<boolean>;
  currentYear: Ref<number>;
  currentMonth: Ref<number>;
  backlogPanelRef: Ref<InstanceType<typeof BacklogPanel> | null>;
  onEventClick: (info: EventClickArg) => void | Promise<void>;
  onBacklogDrop: (
    contentId: string,
    date: string | null
  ) => ContentMoveResult | Promise<ContentMoveResult>;
  onEventDrop: (info: EventDropArg) => void | Promise<void>;
}

function isMandatoryDateType(type: ContentType): boolean {
  return type === "reunion" || type === "radar" || type === "best";
}

function getBacklogDropTarget(
  backlogPanelRef: UseContentCalendarFullCalendarOptions["backlogPanelRef"]
) {
  return backlogPanelRef.value?.$el.querySelector<HTMLElement>(".flex-1");
}

function isPointerOver(
  element: HTMLElement | null | undefined,
  clientX: number,
  clientY: number
): boolean {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  );
}

export function useContentCalendarFullCalendar(options: UseContentCalendarFullCalendarOptions) {
  const events = computed(() => toContentCalendarEvents(options.allContents.value));
  const isMobile = ref(window.innerWidth < 640);

  const calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: "dayGridMonth",
    locale: "es",
    buttonText: { today: "Hoy", month: "Mes", week: "Semana", day: "Día" },
    firstDay: 1,
    height: "auto",
    headerToolbar: { left: "prev,next today", center: "title", right: "" },
    dayHeaderFormat: { weekday: isMobile.value ? "narrow" : "short" },
    editable: true,
    droppable: true,
    events: events.value,
    datesSet: (dateInfo: DatesSetArg) => {
      const viewDate = new Date(dateInfo.view.currentStart);
      const newYear = viewDate.getFullYear();
      const newMonth = viewDate.getMonth() + 1;
      if (newYear !== options.currentYear.value || newMonth !== options.currentMonth.value) {
        options.currentYear.value = newYear;
        options.currentMonth.value = newMonth;
      }
    },
    eventContent: (arg: EventContentArg) => {
      const { author, editor, notes } = readContentCalendarEventProps(arg.event.extendedProps);
      const isMyEvent = Boolean(options.userId.value && author?.id === options.userId.value);
      const shouldDim = options.showOnlyMyEvents.value && !isMyEvent;
      const shouldHighlight = options.showOnlyMyEvents.value && isMyEvent;
      const container = document.createElement("div");
      container.className = `flex items-center gap-1.5 p-1 overflow-hidden transition-all ${shouldDim ? "opacity-30" : "opacity-100"}`;
      if (notes) container.title = notes;
      if (shouldHighlight) {
        container.style.border = "2px solid #ef4444";
        container.style.borderRadius = "4px";
        container.style.boxShadow = "0 0 0 2px rgba(239, 68, 68, 0.2)";
      }

      const avatarsContainer = document.createElement("div");
      avatarsContainer.className = "flex items-center -space-x-1.5 flex-shrink-0";
      if (author?.image) {
        const image = document.createElement("img");
        image.src = author.image;
        image.alt = author.username;
        image.className = "w-5 h-5 rounded-full object-cover border border-white";
        image.title = author.username;
        avatarsContainer.appendChild(image);
      }
      if (editor?.image) {
        const image = document.createElement("img");
        image.src = editor.image;
        image.alt = editor.username;
        image.className = "w-5 h-5 rounded-full object-cover border border-white";
        image.title = `Editor: ${editor.username}`;
        avatarsContainer.appendChild(image);
      }
      if (avatarsContainer.childElementCount > 0) container.appendChild(avatarsContainer);

      const textContainer = document.createElement("div");
      textContainer.className = "flex-1 min-w-0";
      const title = document.createElement("div");
      title.className = "font-semibold text-xs truncate";
      title.textContent = arg.event.title;
      textContainer.appendChild(title);
      if (author?.username) {
        const authorName = document.createElement("div");
        authorName.className = "text-[10px] opacity-75 truncate";
        authorName.textContent = editor?.username
          ? `${author.username} / ${editor.username}`
          : author.username;
        textContainer.appendChild(authorName);
      }
      container.appendChild(textContainer);
      return { domNodes: [container] };
    },
    eventClick: options.onEventClick,
    drop: async (info: DropArg) => {
      const rawEventData = info.draggedEl.getAttribute("data-event");
      if (!rawEventData) return;
      const eventData: unknown = JSON.parse(rawEventData);
      if (typeof eventData !== "object" || eventData === null || !("id" in eventData)) return;
      const contentId = eventData.id;
      if (typeof contentId !== "string" || !contentId) return;
      const result = await options.onBacklogDrop(contentId, info.dateStr);
      if (result.state === "confirmed" && result.destinationApplied) {
        info.draggedEl.parentNode?.removeChild(info.draggedEl);
      }
    },
    eventReceive: (info: EventReceiveArg) => info.event.remove(),
    eventDrop: (info: EventDropArg) => {
      // A calendar item dropped over the backlog is handled by eventDragStop below.
      // Sending this callback too would issue a date update followed by a backlog update.
      const backlogTarget = getBacklogDropTarget(options.backlogPanelRef);
      if (info.jsEvent && isPointerOver(backlogTarget, info.jsEvent.clientX, info.jsEvent.clientY))
        return;
      return options.onEventDrop(info);
    },
    eventDragStop: async (info: EventDragStopArg) => {
      const content = options.allContents.value.find(({ id }) => id === info.event.id);
      const backlogTarget = getBacklogDropTarget(options.backlogPanelRef);
      const isOverBacklog = isPointerOver(
        backlogTarget,
        info.jsEvent.clientX,
        info.jsEvent.clientY
      );
      if (!isOverBacklog) return;

      if (content && isMandatoryDateType(content.type)) {
        info.revert();
        SwalService.error(
          `El contenido tipo "${getContentTypeLabel(content.type)}" requiere fecha obligatoria y no puede volver al backlog.`
        );
        return;
      }

      const result = await options.onBacklogDrop(info.event.id, null);
      if (result.state === "rejected") info.revert();
    },
  }));

  function initBacklogDraggable() {
    const container = getBacklogDropTarget(options.backlogPanelRef);
    if (!container) return;
    new Draggable(container, {
      itemSelector: ".fc-event",
      eventData: (eventEl: HTMLElement) => JSON.parse(eventEl.getAttribute("data-event") || "{}"),
    });
  }

  const onResize = () => {
    const mobile = window.innerWidth < 640;
    if (mobile !== isMobile.value) isMobile.value = mobile;
  };

  onMounted(() => window.addEventListener("resize", onResize));
  onUnmounted(() => window.removeEventListener("resize", onResize));

  return { calendarOptions, initBacklogDraggable };
}
