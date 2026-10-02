import type { InjectionKey } from "vue";
import type { ListWordPressPublicationPort } from "../application/listWordPressPublicationPort";

export const listWordPressPublicationKey: InjectionKey<ListWordPressPublicationPort> =
  Symbol("editorialListWordPressPublication");
