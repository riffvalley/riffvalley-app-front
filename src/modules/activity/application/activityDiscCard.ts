import type { Disc } from "@services/discs/discs";
import type { DiscRate } from "@services/rates/rates";

interface DiscRelationWithUser {
  id: string;
  user?: { id?: string } | null;
  userId?: string;
}

export type ActivityDiscDetails = Disc & {
  favorites?: DiscRelationWithUser[];
  pendings?: DiscRelationWithUser[];
  comments?: unknown[];
};

export interface ActivityDiscCardProps {
  id: string;
  image: string;
  name: string;
  releaseDate: string;
  artistName: string;
  genreName: string;
  genreColor: string;
  link: string;
  averageRate: number | null;
  averageCover: number | null;
  userDiscRate: string | null;
  rate: number | null;
  cover: number | null;
  isNew: boolean;
  ep: boolean;
  artistCountry: { id: string; name: string; isoCode: string } | null;
  favoriteId?: string;
  pendingId?: string;
  commentCount: number;
  rateCount: number;
  debut: boolean;
}

function toPositiveNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function relationForUser(relations: DiscRelationWithUser[] | undefined, userId: string) {
  return relations?.find((relation) => (relation.user?.id ?? relation.userId) === userId);
}

export function toActivityDiscCardProps(
  disc: ActivityDiscDetails,
  rates: DiscRate[],
  userId: string,
): ActivityDiscCardProps {
  const ownRate = rates.find((entry) => entry.user.id === userId);
  const rate = toPositiveNumber(ownRate?.rate);
  const cover = toPositiveNumber(ownRate?.cover);
  const ratedValues = rates.map((entry) => toPositiveNumber(entry.rate));
  const coverValues = rates.map((entry) => toPositiveNumber(entry.cover));
  const favorite = relationForUser(disc.favorites, userId);
  const pending = relationForUser(disc.pendings, userId);
  const country = disc.artist.country;

  return {
    id: disc.id,
    image: disc.image ?? "",
    name: disc.name,
    releaseDate: disc.releaseDate ?? "",
    artistName: disc.artist.name,
    genreName: disc.genre?.name ?? "",
    genreColor: disc.genre?.color ?? "",
    link: disc.link ?? "",
    averageRate: average(ratedValues),
    averageCover: average(coverValues),
    userDiscRate: ownRate?.id ?? null,
    rate,
    cover,
    isNew: !ownRate,
    ep: disc.ep ?? disc.EP ?? false,
    artistCountry: country
      ? { id: country.id, name: country.name, isoCode: country.isoCode ?? "" }
      : null,
    favoriteId: favorite?.id,
    pendingId: pending?.id,
    commentCount: disc.comments?.length ?? 0,
    rateCount: new Set(
      rates.filter((entry) => toPositiveNumber(entry.rate) !== null).map((entry) => entry.user.id),
    ).size,
    debut: disc.debut ?? false,
  };
}
