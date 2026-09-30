export type { DiscDetailIdentity } from "./domain/discDetail";
export type { ArtistDetailIdentity } from "./domain/artistDetail";
export type { CalendarDisc, CalendarGroup } from "./domain/discCalendar";
export type { ArtistManagementItem, ArtistManagementDisc } from "./domain/artistManagement";
export { default as DiscCalendarView } from "./presentation/DiscCalendarView.vue";
export { default as BabyDiscCalendarView } from "./presentation/BabyDiscCalendarView.vue";
export { exportCalendarHtml } from "./application/calendarTools";
