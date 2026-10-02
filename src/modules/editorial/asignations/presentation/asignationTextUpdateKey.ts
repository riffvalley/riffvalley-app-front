import type { InjectionKey } from "vue";
import type { AsignationTextUpdatePort } from "../application/asignationTextUpdatePort";

export const asignationTextUpdateKey: InjectionKey<AsignationTextUpdatePort> = Symbol("asignationTextUpdate");
