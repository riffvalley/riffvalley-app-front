import type { Content } from "@services/contents/contents";

export function filterContentCalendarByAuthor(
  contents: readonly Content[],
  showOnlyMyEvents: boolean,
  userId: string | null
): Content[] {
  if (!showOnlyMyEvents) return [...contents];
  if (!userId) return [];

  return contents.filter((content) => content.author?.id === userId);
}
