import { describe, expect, it } from "vitest";
import type { Disc } from "@services/discs/discs";
import type { DiscRate } from "@services/rates/rates";
import { toActivityDiscCardProps } from "./activityDiscCard";

const disc: Disc = {
  id: "disc-1",
  name: "Álbum",
  description: "Descripción",
  image: "cover.jpg",
  releaseDate: "2020-01-02",
  artist: {
    id: "artist-1",
    name: "Artista",
    description: "",
    image: "",
    country: { id: "country-1", name: "España", isoCode: "ES" },
  },
  genre: { id: "genre-1", name: "Rock", color: "#123456" },
  link: "https://example.test/album",
  verified: true,
  ep: false,
  debut: true,
} as Disc;

const rates = [
  { id: "rate-a", rate: "8.5", cover: "7", user: { id: "user-a" } },
  { id: "rate-b", rate: "6", cover: null, user: { id: "user-b" } },
] as DiscRate[];

describe("toActivityDiscCardProps", () => {
  it("maps catalog details and the signed-in user's current state to DiscCard", () => {
    const result = toActivityDiscCardProps({
      ...disc,
      favorites: [{ id: "favorite-a", user: { id: "user-a" } }],
      pendings: [{ id: "pending-a", user: { id: "user-a" } }],
      comments: [{ id: "comment-1" }],
    }, rates, "user-a");

    expect(result).toMatchObject({
      id: "disc-1",
      name: "Álbum",
      image: "cover.jpg",
      artistName: "Artista",
      genreName: "Rock",
      averageRate: 7.25,
      averageCover: 7,
      userDiscRate: "rate-a",
      rate: 8.5,
      cover: 7,
      isNew: false,
      favoriteId: "favorite-a",
      pendingId: "pending-a",
      commentCount: 1,
      rateCount: 2,
    });
  });

  it("does not invent personal ratings or relation IDs when they are absent", () => {
    const result = toActivityDiscCardProps(disc, [], "user-without-data");

    expect(result.userDiscRate).toBeNull();
    expect(result.rate).toBeNull();
    expect(result.cover).toBeNull();
    expect(result.favoriteId).toBeUndefined();
    expect(result.pendingId).toBeUndefined();
    expect(result.averageRate).toBeNull();
  });
});
