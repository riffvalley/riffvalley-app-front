import type { Content } from "@services/contents/contents";

const author = { id: "author-1", username: "Autora", isActive: true, image: "/author.png" };
const secondAuthor = { id: "author-2", username: "Editor", isActive: true };

const backendFixtures = [
  {
    id: "article-scheduled",
    type: "article",
    name: "Artículo programado",
    notes: "Nota de artículo",
    publicationDate: "2026-10-31T18:00:00.000Z",
    closeDate: "2026-11-02T18:00:00.000Z",
    ready: false,
    backlog: false,
    author,
    article: { id: "article-1", type: "articulo", status: "editing", editor: secondAuthor },
  },
  {
    id: "photos-backlog",
    type: "photos",
    name: "Fotos sin programar",
    notes: null,
    publicationDate: null,
    closeDate: null,
    ready: false,
    backlog: true,
    author: null,
  },
  {
    id: "playlist-scheduled",
    type: "riff_valley_playlist",
    name: "Playlist programada",
    publicationDate: "2026-11-01T18:00:00.000Z",
    closeDate: null,
    ready: false,
    backlog: false,
    author: secondAuthor,
    riffValleyPlaylist: { id: "playlist-1", name: "RV Weekly" },
  },
  {
    id: "radar-scheduled",
    type: "radar",
    name: "Radar de noviembre",
    notes: "Tiene asignaciones",
    publicationDate: "2026-11-04T18:00:00.000Z",
    closeDate: "2026-11-10T18:00:00.000Z",
    ready: false,
    backlog: false,
    author,
    list: {
      id: "list-radar",
      name: "Radar",
      type: "week",
      status: "editing",
      listDate: "2026-11-04T18:00:00.000Z",
      releaseDate: null,
      closeDate: null,
      asignations: [{ id: "asignation-1", done: false, position: 1, description: "Revisar" }],
    },
  },
  {
    id: "best-scheduled",
    type: "best",
    name: "Mejores de noviembre",
    publicationDate: "2026-11-30T18:00:00.000Z",
    closeDate: null,
    ready: false,
    backlog: false,
    author: secondAuthor,
    list: null,
  },
  {
    id: "video-backlog",
    type: "video",
    name: "Vídeo sin programar",
    notes: "Sin fecha ni cierre",
    publicationDate: null,
    closeDate: null,
    ready: false,
    backlog: true,
    author,
    video: {
      id: "video-1",
      type: "best",
      status: "editing",
      userId: "author-1",
      editorId: "author-2",
      user: author,
      editor: secondAuthor,
    },
  },
  {
    id: "reunion-scheduled",
    type: "reunion",
    name: "Reunión editorial",
    publicationDate: "2026-11-05T18:00:00.000Z",
    closeDate: null,
    ready: false,
    reunionId: "reunion-1",
    backlog: false,
    author: null,
  },
] satisfies Content[];

export const contentFixtures: Content[] = backendFixtures;

export const scheduledContentFixtures = contentFixtures.filter((content) => !content.backlog);
export const backlogContentFixtures = contentFixtures.filter((content) => content.backlog);
