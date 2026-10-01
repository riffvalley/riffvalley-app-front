import type { ArtistDeletePort } from "../../application/artistManagementPort";

export function deleteArtist(port: ArtistDeletePort, id: string): Promise<void> {
  return port.deleteArtist(id);
}
