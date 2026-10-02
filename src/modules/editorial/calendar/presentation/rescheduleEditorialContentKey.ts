import type { InjectionKey } from 'vue';

export type RescheduleEditorialContentOperation = (
  contentId: string,
  date: string | null,
) => Promise<void>;

export const rescheduleEditorialContentKey: InjectionKey<RescheduleEditorialContentOperation> =
  Symbol('rescheduleEditorialContent');
