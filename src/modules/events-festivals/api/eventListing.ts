import api from "@/services/api/api";
import type { EventListingPage, EventListingRequest, ListedEvent } from "../types/eventListing";

export class EventListingProtocolError extends Error {
  constructor() {
    super("La respuesta del servidor no coincide con el contrato del listado de eventos.");
    this.name = "EventListingProtocolError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isListedEvent(value: unknown): value is ListedEvent {
  if (!isRecord(value) || !isRecord(value.venue) || !isRecord(value.venue.locality)) return false;
  const locality = value.venue.locality;
  const region = locality.administrativeRegion;
  if (!isRecord(region) || !isRecord(region.country)) return false;
  return (
    isString(value.id) &&
    (value.type === "concert" || value.type === "festival") &&
    isNullableString(value.name) &&
    isString(value.startDate) &&
    isNullableString(value.endDate) &&
    isString(value.venue.name) &&
    isString(locality.name) &&
    isString(region.name) &&
    isString(region.country.name) &&
    Array.isArray(value.lineup) &&
    value.lineup.every((artist) => isRecord(artist) && isString(artist.name))
  );
}

function parseEventListingPage(value: unknown): EventListingPage {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.totalItems) ||
    !Number.isInteger(value.totalPages) ||
    !Number.isInteger(value.currentPage) ||
    !Number.isInteger(value.limit) ||
    !Array.isArray(value.data) ||
    !value.data.every(isListedEvent)
  ) {
    throw new EventListingProtocolError();
  }
  return value as unknown as EventListingPage;
}

export function eventListingParams(request: EventListingRequest) {
  return {
    type: request.type,
    limit: request.limit,
    offset: request.offset,
    ...(request.dateFrom ? { dateFrom: request.dateFrom } : {}),
    ...(request.dateTo ? { dateTo: request.dateTo } : {}),
  };
}

export async function getEventListing(
  request: EventListingRequest,
  signal?: AbortSignal
): Promise<EventListingPage> {
  const { data } = await api.get<unknown>("/events", {
    params: eventListingParams(request),
    signal,
  });
  return parseEventListingPage(data);
}

export const EVENT_LISTING_PAGE_SIZE = 20;
