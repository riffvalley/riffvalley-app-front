import type { ArtistManagementDisc } from "@/modules/catalog";
import { getDiscRates } from "@services/rates/rates";

export interface LegacyDiscCardSelection extends ArtistManagementDisc {
  artistName: string;
  userDiscRate: string | null;
  rate: number | null;
  cover: number | null;
}

export async function loadLegacyDiscCard(
  disc: ArtistManagementDisc,
  artistName: string,
  userId: string,
): Promise<LegacyDiscCardSelection> {
  try {
    const rates = await getDiscRates(disc.id);
    const myRate = rates.find((rate) => rate.user.id === userId);
    return {
      ...disc,
      artistName,
      userDiscRate: myRate?.id ?? null,
      rate: myRate ? Number(myRate.rate) : null,
      cover: myRate ? Number(myRate.cover) : null,
    };
  } catch {
    return {
      ...disc,
      artistName,
      userDiscRate: null,
      rate: null,
      cover: null,
    };
  }
}
