import { asignationTextUpdateApi } from "@/modules/editorial/infrastructure/asignationTextUpdateApi";
import { listDetailsApi } from "@/modules/editorial/infrastructure/listDetailsApi";
import { specialListsApi } from "@/modules/editorial/infrastructure/specialListsApi";
import { listCreationApi } from "@/modules/editorial/infrastructure/listCreationApi";
import { listWordPressPublicationApi } from "@/modules/editorial/infrastructure/listWordPressPublicationApi";
import { reunionsApi } from "@/modules/editorial/infrastructure/reunionsApi";

export const asignationTextUpdatePort = asignationTextUpdateApi;
export const listDetailsPort = listDetailsApi;
export const specialListsPort = specialListsApi;
export const listCreationPort = listCreationApi;
export const listWordPressPublicationPort = listWordPressPublicationApi;
export const reunionsPort = reunionsApi;
