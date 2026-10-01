export interface PendingState {
  pendingId: string | null;
  loaded: boolean;
}

export interface UserPendingsQuery {
  limit: number;
  offset: number;
  query?: string;
  dateRange?: [string, string] | null;
  genre?: string;
  country?: string;
}

export interface UserPending {
  id: string;
  disc: unknown;
}

export interface UserPendingsResult {
  totalItems: number;
  data: UserPending[];
}
