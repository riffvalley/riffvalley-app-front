import type { Genre } from "../../../reference-data/domain/catalog";
import type { CalendarDisc, CalendarGroup } from "../domain/discCalendar";

export interface CalendarDiscWritePort {
  updateAlbum(id: string, patch: { link: string; image: string | null; verified: true; genreId: string | null }): Promise<void>;
}
export async function attachCalendarAlbum(port: CalendarDiscWritePort, disc: CalendarDisc, album: { link: string; image: string | null }) {
  disc.link = album.link;
  disc.image = album.image;
  await port.updateAlbum(disc.id, { link: disc.link, image: disc.image, verified: true, genreId: disc.genreId ?? disc.genre?.id ?? null });
}

export function exportCalendarHtml(group: CalendarGroup, genres: Genre[]): string {
  const genreById = new Map(genres.map((genre) => [String(genre.id), genre.name || "(Sin nombre)"]));
  let html = `
  <figure class="wp-block-table is-style-stripes">
    <table>
      <tbody>`;
  for (const disc of group.discs) {
    const genreName = genreById.get(String(disc.genreId ?? disc.genre?.id ?? "")) || disc.genre?.name || "Sin género";
    html += disc.link ? `
        <tr>
          <td class="has-text-align-left" data-align="left">${genreName}</td>
          <td><strong><a href="${disc.link}" target="_blank" rel="noreferrer noopener">${disc.artist.name} - ${disc.name}</a></strong></td>
        </tr>` : `
        <tr>
          <td class="has-text-align-left" data-align="left">${genreName}</td>
          <td><strong>${disc.artist.name} - ${disc.name}</strong></td>
        </tr>`;
  }
  return html + `
      </tbody>
    </table>
  </figure>`;
}
