interface UserDiscRelationDto {
  id: string;
  disc: unknown;
}

export interface UserDiscRelationPageDto {
  totalItems: number;
  data: UserDiscRelationDto[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Favorites and listening-pending endpoints share this transport envelope. */
export function parseUserDiscRelationPage(
  value: unknown,
  errorMessage: string,
): UserDiscRelationPageDto {
  if (!isRecord(value) || typeof value.totalItems !== "number" || !Array.isArray(value.data)) {
    throw new Error(errorMessage);
  }
  const data = value.data.map((entry: unknown): UserDiscRelationDto => {
    if (!isRecord(entry) || typeof entry.id !== "string" || !("disc" in entry)) {
      throw new Error(errorMessage);
    }
    return { id: entry.id, disc: entry.disc };
  });
  return { totalItems: value.totalItems, data };
}
