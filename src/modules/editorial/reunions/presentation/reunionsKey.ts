import type { InjectionKey } from "vue";
import type { ReunionsPort } from "../application/reunionsPort";

export const reunionsKey: InjectionKey<ReunionsPort> = Symbol("editorialReunions");
