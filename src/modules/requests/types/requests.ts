export interface CreateRequestDto {
  discName: string;
  artistName: string;
  releaseDate?: string;
  ep?: boolean;
  debut?: boolean;
  description?: string;
  image?: string;
  link?: string;
  genreId?: string;
  countryId?: string;
}

export interface DiscRequest {
  id: string;
  discName: string;
  artistName: string;
  releaseDate: string | null;
  ep: boolean;
  debut: boolean;
  status: "pending" | "approved" | "rejected";
  adminNotes: string | null;
  createdAt: string;
  genre: { id: string; name: string } | null;
  country: { id: string; name: string } | null;
}

export interface UpdateRequestDto {
  discName?: string;
  artistName?: string;
  releaseDate?: string;
  genreId?: string | null;
  countryId?: string | null;
  ep?: boolean;
  debut?: boolean;
  adminNotes?: string;
}
