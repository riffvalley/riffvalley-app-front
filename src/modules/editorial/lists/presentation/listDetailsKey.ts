import type { InjectionKey } from "vue";
import type { ListDetailsPort } from "../application/listDetailsPort";

export const listDetailsKey: InjectionKey<ListDetailsPort> = Symbol("editorialListDetails");
