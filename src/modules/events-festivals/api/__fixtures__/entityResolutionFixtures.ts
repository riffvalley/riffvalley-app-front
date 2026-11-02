import type {
  ArtistResolutionResult,
  LocalityInspectionResult,
  TourResolutionResult,
  VenueResolutionResult,
} from "../entityResolutionContracts";

const spain = { id: "00000000-0000-4000-8000-000000000001", name: "Spain" };
const madridRegion = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Comunidad de Madrid",
};

export const artistResolutionFixtures: ArtistResolutionResult[] = [
  {
    index: 0,
    name: "Architects",
    status: "existing",
    artist: { id: "00000000-0000-4000-8000-000000000010", name: "Architects" },
    candidates: [],
  },
  { index: 1, name: "New act", status: "new", artist: null, candidates: [] },
  {
    index: 2,
    name: "Alias collision",
    status: "ambiguous",
    code: "ARTIST_AMBIGUOUS",
    artist: null,
    candidates: [
      { id: "00000000-0000-4000-8000-000000000011", name: "Artist One" },
      { id: "00000000-0000-4000-8000-000000000012", name: "Artist Two" },
    ],
  },
  {
    index: 3,
    name: "\u0301",
    status: "invalid",
    code: "ARTIST_NAME_INVALID",
    artist: null,
    candidates: [],
  },
  {
    index: 4,
    name: "Architects",
    status: "existing",
    artist: { id: "00000000-0000-4000-8000-000000000010", name: "Architects" },
    candidates: [],
  },
];

export const localityResolutionFixtures: LocalityInspectionResult[] = [
  {
    index: 0,
    input: { name: "Madrid", countryId: spain.id, administrativeRegionId: madridRegion.id },
    status: "existing",
    locality: {
      id: "00000000-0000-4000-8000-000000000020",
      name: "Madrid",
      province: "Madrid",
      country: spain,
      administrativeRegion: madridRegion,
    },
    candidates: [],
  },
  {
    index: 1,
    input: { name: "New locality", countryId: spain.id },
    status: "new",
    candidates: [],
    requiresAdministrativeRegionId: true,
  },
  {
    index: 2,
    input: { name: "Santiago", countryId: spain.id },
    status: "ambiguous",
    code: "LOCALITY_AMBIGUOUS",
    candidates: [
      {
        id: "00000000-0000-4000-8000-000000000021",
        name: "Santiago",
        province: "A Coruña",
        country: spain,
        administrativeRegion: { id: "00000000-0000-4000-8000-000000000003", name: "Galicia" },
      },
      {
        id: "00000000-0000-4000-8000-000000000022",
        name: "Santiago",
        province: "Pontevedra",
        country: spain,
        administrativeRegion: { id: "00000000-0000-4000-8000-000000000004", name: "Galicia" },
      },
    ],
  },
  {
    index: 3,
    input: { name: "San Sebastián", countryId: spain.id, province: "Gipuzkoa" },
    status: "existing",
    locality: {
      id: "00000000-0000-4000-8000-000000000023",
      name: "Donostia",
      province: "Gipuzkoa",
      country: spain,
      administrativeRegion: { id: "00000000-0000-4000-8000-000000000005", name: "País Vasco" },
    },
    candidates: [],
  },
  {
    index: 4,
    input: { name: "Santiago", countryId: spain.id, administrativeRegionId: madridRegion.id },
    status: "new",
    candidates: [],
    requiresAdministrativeRegionId: false,
  },
  {
    index: 5,
    input: { name: "Santiago", countryId: spain.id, province: "Pontevedra" },
    status: "existing",
    locality: {
      id: "00000000-0000-4000-8000-000000000022",
      name: "Santiago",
      province: "Pontevedra",
      country: spain,
      administrativeRegion: { id: "00000000-0000-4000-8000-000000000004", name: "Galicia" },
    },
    candidates: [],
  },
  {
    index: 6,
    input: {
      name: "Santiago",
      countryId: spain.id,
      administrativeRegionId: "00000000-0000-4000-8000-000000000099",
    },
    status: "invalid",
    code: "LOCALITY_REGION_COUNTRY_MISMATCH",
    candidates: [],
  },
  {
    index: 7,
    input: { name: "Madrid", countryId: "00000000-0000-4000-8000-000000000099" },
    status: "invalid",
    code: "LOCALITY_COUNTRY_NOT_FOUND",
    candidates: [],
  },
];

export const tourResolutionFixtures: TourResolutionResult[] = [
  {
    index: 0,
    name: "Septicflesh European Tour 2027",
    status: "existing",
    code: "TOUR_CONFIRMATION_REQUIRED",
    entity: { id: "00000000-0000-4000-8000-000000000030", name: "Septicflesh European Tour 2027" },
    candidates: [],
  },
  { index: 1, name: "New tour", status: "new", candidates: [] },
  {
    index: 2,
    name: " SEPTICFLESH   European Tour 2027 ",
    status: "existing",
    code: "TOUR_CONFIRMATION_REQUIRED",
    entity: { id: "00000000-0000-4000-8000-000000000030", name: "Septicflesh European Tour 2027" },
    candidates: [],
  },
  {
    index: 3,
    name: "Legacy duplicate tour",
    status: "ambiguous",
    code: "TOUR_AMBIGUOUS",
    candidates: [
      { id: "00000000-0000-4000-8000-000000000031", name: "Legacy Tour One" },
      { id: "00000000-0000-4000-8000-000000000032", name: "Legacy Tour Two" },
    ],
  },
  {
    index: 4,
    name: "\u0301",
    status: "invalid",
    code: "TOUR_NAME_INVALID",
    candidates: [],
  },
];

export const venueResolutionFixtures: VenueResolutionResult[] = [
  {
    index: 0,
    name: "Sala Sol",
    localityId: "00000000-0000-4000-8000-000000000020",
    status: "existing",
    venue: { id: "00000000-0000-4000-8000-000000000040", name: "Sala Sol" },
    candidates: [{ id: "00000000-0000-4000-8000-000000000040", name: "Sala Sol" }],
  },
  {
    index: 1,
    name: "Sala Sol",
    localityId: "00000000-0000-4000-8000-000000000050",
    status: "new",
    venue: null,
    candidates: [],
  },
  {
    index: 2,
    name: "Duplicate venue records",
    localityId: "00000000-0000-4000-8000-000000000020",
    status: "ambiguous",
    code: "VENUE_AMBIGUOUS",
    venue: null,
    candidates: [
      { id: "00000000-0000-4000-8000-000000000041", name: "Duplicate venue records" },
      { id: "00000000-0000-4000-8000-000000000042", name: "Duplicate venue records" },
    ],
  },
];
