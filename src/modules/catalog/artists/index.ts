/** Operaciones y ficha de Artistas expuestas a consumidores externos al módulo. */
export { postArtist, updateArtist } from "./api/artistMutations";
export { default as ArtistDetailsModal } from "./presentation/components/ArtistDetailsModal.vue";
export type {
  ArtistWithCountry,
  CreateArtistPayload,
  UpdateArtistPayload,
} from "./types/artistApi";
