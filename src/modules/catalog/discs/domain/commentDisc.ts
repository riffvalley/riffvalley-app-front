/** Catalog projection embedded in the user's comment list response. */
export interface CommentDisc {
  id: string;
  name: string;
  image?: string | null;
  releaseDate?: string | null;
  artist?: { id?: string; name?: string; country?: { id?: string; name?: string; isoCode?: string } | null } | null;
  genre?: { id?: string; name?: string; color?: string } | null;
}
