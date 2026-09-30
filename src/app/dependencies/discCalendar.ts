import { discCalendarApi } from "@/modules/catalog/infrastructure/discCalendarApi";
import { calendarToolsApi } from "@/modules/catalog/infrastructure/calendarToolsApi";
import { attachCalendarAlbum } from "@/modules/catalog/application/calendarTools";
import type { CalendarDisc } from "@/modules/catalog";
import { albumLinksApi } from "@/integrations/spotify/infrastructure/albumLinksApi";
import { calendarImagesApi } from "@/integrations/lastfm/infrastructure/calendarImagesApi";
import { fillCalendarImages } from "@/integrations/lastfm/application/calendarImages";

export const calendarPort = discCalendarApi;
export const searchCalendarImages = (date: string) => fillCalendarImages(calendarImagesApi, date);
export async function enrichCalendarDiscs(discs: CalendarDisc[]) {
  const session = await albumLinksApi.openSession();
  if (!session) { console.error("No se pudo obtener el token de Spotify"); return; }
  for (const disc of discs) {
    const result = await session.findAlbum({ albumName: disc.name, artistName: disc.artist.name });
    if (result.status === "not-found") disc.link = "No se encontró el álbum";
    else if (result.status === "failed") disc.link = "Error al realizar la búsqueda";
    else if (result.status === "found") {
      try { await attachCalendarAlbum(calendarToolsApi, disc, result); }
      catch (error: unknown) {
        console.error(`Error al buscar el álbum ${disc.name}:`, error);
        disc.link = "Error al realizar la búsqueda";
      }
    }
  }
}
