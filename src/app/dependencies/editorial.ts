import { asignationTextUpdateApi } from "@/modules/editorial/asignations/infrastructure/asignationTextUpdateApi";
import { listDetailsApi } from "@/modules/editorial/lists/infrastructure/listDetailsApi";
import { specialListsApi } from "@/modules/editorial/lists/infrastructure/specialListsApi";
import { listCreationApi } from "@/modules/editorial/lists/infrastructure/listCreationApi";
import { listWordPressPublicationApi } from "@/modules/editorial/lists/infrastructure/listWordPressPublicationApi";
import { reunionsApi } from "@/modules/editorial/reunions/infrastructure/reunionsApi";
import { articlesApi } from "@/modules/editorial/articles/infrastructure/articlesApi";
import { videosApi } from "@/modules/editorial/videos/infrastructure/videosApi";
import { editorialCalendarApi } from "@/modules/editorial/calendar/infrastructure/editorialCalendarApi";
import { rescheduleEditorialContent } from "@/modules/editorial/calendar/application/rescheduleEditorialContent";

export const asignationTextUpdatePort = asignationTextUpdateApi;
export const listDetailsPort = listDetailsApi;
export const specialListsPort = specialListsApi;
export const listCreationPort = listCreationApi;
export const listWordPressPublicationPort = listWordPressPublicationApi;
export const reunionsPort = reunionsApi;
export const articlesPort = articlesApi;
export const videosPort = videosApi;
export const rescheduleEditorialCalendarContent = (contentId: string, date: string | null) =>
  rescheduleEditorialContent(editorialCalendarApi, contentId, date);
