import type { InjectionKey } from "vue";
import type { ListCreationPort } from "../application/listCreationPort";

export const listCreationKey: InjectionKey<ListCreationPort> = Symbol("editorialListCreation");
