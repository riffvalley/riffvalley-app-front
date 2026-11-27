export type ListedEventType = "concert" | "festival";

export interface EventListingRequest {
  type: ListedEventType;
  limit: number;
  offset: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface ListedEvent {
  id: string;
  type: ListedEventType;
  name: string | null;
  startDate: string;
  endDate: string | null;
  venue: {
    name: string;
    locality: {
      name: string;
      administrativeRegion: {
        name: string;
        country: { name: string };
      };
    };
  };
  lineup: Array<{ name: string }>;
}

export interface EventListingPage {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: ListedEvent[];
}
