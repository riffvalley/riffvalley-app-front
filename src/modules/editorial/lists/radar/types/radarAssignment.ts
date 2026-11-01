import type { EditorialAsignation } from "@services/asignation/asignation";
import type { Disc } from "@services/discs/discs";

export type RadarAssignment = Omit<EditorialAsignation, "disc" | "user"> & {
  disc: NonNullable<EditorialAsignation["disc"]> & {
    link?: string | null;
    artistCountry?: { id: string; name: string; isoCode?: string } | null;
  };
  user: NonNullable<EditorialAsignation["user"]>;
};

export type RadarCatalogDisc = Disc & { hasExistingAsignation?: boolean };
