import type { ArtistUpdatePort, UpdateArtistInput } from "./artistManagementPort";

export function updateArtist(port: ArtistUpdatePort, id: string, data: UpdateArtistInput): Promise<void> {
  return port.updateArtist(id, data);
}
