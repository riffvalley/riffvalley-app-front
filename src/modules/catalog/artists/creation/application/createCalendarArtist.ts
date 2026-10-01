import type { CalendarArtistCreationPort } from "../../application/artistManagementPort";

/** Creates the artist first, then associates it to the existing disc. */
export async function createCalendarArtist(
  port: CalendarArtistCreationPort,
  discId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const artist = await port.createArtist(name);
  await port.associateArtistToDisc(discId, artist.id);
  return artist;
}
