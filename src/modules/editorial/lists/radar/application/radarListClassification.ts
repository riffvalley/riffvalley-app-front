import type { ListSummary } from "@services/list/list";

function toDateKey(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function listDateKey(list: ListSummary): string {
  const date = list.listDate || list.releaseDate;
  return date ? String(date).split("T")[0] : "";
}

export function classifyRadarLists(lists: ListSummary[], today = new Date()) {
  const currentWindowEnd = new Date(today);
  currentWindowEnd.setDate(
    currentWindowEnd.getDate() + ((5 - currentWindowEnd.getDay() + 7) % 7) + 7
  );
  const currentWindowEndKey = toDateKey(currentWindowEnd);

  return {
    current: lists.filter((list) => listDateKey(list) <= currentWindowEndKey),
    future: lists.filter((list) => listDateKey(list) > currentWindowEndKey),
  };
}
