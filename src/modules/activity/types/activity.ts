export type ActivityEventType = "set" | "change";

export interface ActivityHistoryArtist {
  id: string;
  name: string;
}

export interface ActivityHistoryGenre {
  id: string;
  name: string;
}

export interface ActivityHistoryDisc {
  id: string;
  title: string | null;
  artist: ActivityHistoryArtist | null;
  coverUrl: string | null;
  genre: ActivityHistoryGenre | null;
}

export interface ActivityHistoryEvent {
  id: string;
  type: ActivityEventType;
  occurredAt: string;
  previousValue: number | null;
  newValue: number | null;
  disc: ActivityHistoryDisc | null;
}

export interface ActivityHistoryResponse {
  items: ActivityHistoryEvent[];
  nextCursor: string | null;
  hasMore: boolean;
  dailySetCounts: Record<string, number>;
}

export interface ActivityHistoryParams {
  from?: string;
  to?: string;
  timeZone?: string;
  type?: ActivityEventType;
  q?: string;
  limit?: number;
  cursor?: string;
}

export const ACTIVITY_HISTORY_PAGE_SIZE = 30;
