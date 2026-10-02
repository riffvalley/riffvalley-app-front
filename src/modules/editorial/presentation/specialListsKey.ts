import type { InjectionKey } from "vue";
import type { SpecialListsPort } from "../application/specialListsPort";

export const specialListsKey: InjectionKey<SpecialListsPort> = Symbol("editorialSpecialLists");
