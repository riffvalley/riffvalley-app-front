import api from "@/services/api/api";

export interface EditableEventDetail {
  id: string;
  type: "concert" | "festival";
  name: string | null;
  startDate: string;
  endDate: string | null;
  venueId: string;
  venueName: string;
  localityId: string;
  localityName: string;
  province: string | null;
  administrativeRegionId: string;
  administrativeRegionName: string;
  countryId: string;
  countryName: string;
  tourId: string | null;
  price: string | null;
  otherInfo: string | null;
  lineup: Array<{ artistId: string | null; name: string; tourId: string | null }>;
}

export interface UpdateEventRequest {
  name: string | null;
  startDate: string;
  endDate: string | null;
  venueId: string;
  localityId: string;
  tourId: string | null;
  price: string | null;
  otherInfo: string | null;
  lineup: Array<{ artistId: string | null; name: string; tourId?: string | null }>;
}

export class EventManagementProtocolError extends Error {
  constructor() {
    super("La respuesta del servidor no contiene los datos necesarios para editar el evento.");
    this.name = "EventManagementProtocolError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function string(value: unknown): value is string {
  return typeof value === "string";
}

function nullableString(value: unknown): value is string | null {
  return value === null || string(value);
}

function parseEditableEvent(value: unknown, id: string): EditableEventDetail {
  if (
    !record(value) ||
    value.id !== id ||
    (value.type !== "concert" && value.type !== "festival") ||
    !nullableString(value.name) ||
    !string(value.startDate) ||
    !nullableString(value.endDate) ||
    !string(value.venueId) ||
    !record(value.venue) ||
    !string(value.venue.name) ||
    !record(value.venue.locality) ||
    !string(value.venue.locality.id) ||
    !string(value.venue.locality.name) ||
    !nullableString(value.venue.locality.province) ||
    !record(value.venue.locality.administrativeRegion) ||
    !string(value.venue.locality.administrativeRegion.id) ||
    !string(value.venue.locality.administrativeRegion.name) ||
    !record(value.venue.locality.administrativeRegion.country) ||
    !string(value.venue.locality.administrativeRegion.country.id) ||
    !string(value.venue.locality.administrativeRegion.country.name) ||
    !nullableString(value.tourId) ||
    !nullableString(value.price) ||
    !nullableString(value.otherInfo) ||
    !Array.isArray(value.lineup) ||
    !value.lineup.every(
      (item) =>
        record(item) &&
        nullableString(item.artistId) &&
        string(item.name) &&
        nullableString(item.tourId)
    )
  )
    throw new EventManagementProtocolError();

  const locality = value.venue.locality;
  const region = locality.administrativeRegion;
  const country = region.country;
  return {
    id,
    type: value.type,
    name: value.name,
    startDate: value.startDate,
    endDate: value.endDate,
    venueId: value.venueId,
    venueName: value.venue.name,
    localityId: locality.id as string,
    localityName: locality.name,
    province: locality.province,
    administrativeRegionId: region.id,
    administrativeRegionName: region.name,
    countryId: country.id,
    countryName: country.name,
    tourId: value.tourId,
    price: value.price,
    otherInfo: value.otherInfo,
    lineup: value.lineup.map((item) => ({
      artistId: item.artistId as string | null,
      name: item.name as string,
      tourId: item.tourId as string | null,
    })),
  };
}

export async function getEditableEvent(
  id: string,
  signal?: AbortSignal
): Promise<EditableEventDetail> {
  const { data } = await api.get<unknown>(`/events/${encodeURIComponent(id)}`, { signal });
  return parseEditableEvent(data, id);
}

export async function updateEvent(id: string, payload: UpdateEventRequest): Promise<void> {
  await api.patch(`/events/${encodeURIComponent(id)}`, payload);
}

export async function deleteEvent(id: string): Promise<void> {
  await api.delete(`/events/${encodeURIComponent(id)}`);
}
