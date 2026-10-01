export interface Genre {
  id: string;
  name: string;
  color: string;
}

export interface Country {
  id: string;
  name: string;
  isoCode: string;
}

export interface Catalog {
  genres: Genre[];
  countries: Country[];
}
