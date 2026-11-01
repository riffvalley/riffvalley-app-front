import api from "@services/api/api";
import type { RiffValleyPlaylist } from "@services/riff-valley-playlists/riffValleyPlaylists";
import type { Article } from "@services/articles/articles";
import type { Video } from "@services/videos/videos";
import type { Reunion } from "@services/reunions/reunions";
import type { RvUser } from "@/modules/identity/users";

// Interfaces
export type ContentType = "article" | "photos" | "riff_valley_playlist" | "radar" | "best" | "video" | "reunion";
export type ContentListType = "month" | "week" | "special" | "video";
export type ContentListStatus = "new" | "assigned" | "not_started" | "in_progress" | "editing" | "ready" | "published";

export type ContentAuthor = Pick<RvUser, "id" | "username"> & Partial<Pick<RvUser, "image">> & {
    /** Present when the backend serializes the full User entity. */
    isActive?: boolean;
};
/** @deprecated Use ContentAuthor for the backend's nullable Content author relation. */
export type Author = ContentAuthor;

export interface ContentListAsignation {
    id: string;
    done: boolean | null;
    position: number | null;
    description: string | null;
}

export function isContentListAsignation(value: unknown): value is ContentListAsignation {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.id === "string" &&
        (typeof candidate.done === "boolean" || candidate.done === null) &&
        (typeof candidate.position === "number" || candidate.position === null) &&
        (typeof candidate.description === "string" || candidate.description === null);
}

export interface ContentList {
    id: string;
    name: string;
    type: ContentListType;
    status?: ContentListStatus | null;
    listDate?: string | null;
    releaseDate?: string | null;
    closeDate?: string | null;
    asignations?: ContentListAsignation[];
}

/** Only the article fields consumed by Content Calendar, from the public Articles contract. */
export type ContentArticle = Pick<Article, "id" | "editor" | "type" | "status" | "link" | "user" | "userId" | "editorId">;
/** Only the video fields consumed by Content Calendar, from the public Videos contract. */
export type ContentVideo = Pick<Video, "id" | "editor" | "type" | "status" | "user" | "userId" | "editorId">;
export type ContentPlaylist = Pick<RiffValleyPlaylist, "id" | "name">;
/** Reunion is not loaded by Contents query responses; this type covers when it is included. */
export type ContentReunion = Pick<Reunion, "id">;

export interface Content {
    id: string;
    type: ContentType;
    name: string;
    notes?: string | null;
    publicationDate?: string | null;
    closeDate?: string | null;
    listDate?: string | null;
    reunionId?: string | null;
    riffValleyPlaylistId?: string | null;
    ready: boolean;
    backlog: boolean;
    author?: ContentAuthor | null;

    // TypeORM omits unloaded relations and serializes loaded empty relations as null.
    reunion?: ContentReunion | null;
    list?: ContentList | null;
    riffValleyPlaylist?: ContentPlaylist | null;
    article?: ContentArticle | null;
    video?: ContentVideo | null;
}

/**
 * Content asociado embebido en la respuesta de un Video/Article/Riff Valley playlist
 * (GET/POST /videos|articles|riff-valley-playlists[/:id][/content]).
 * Es una vista resumida de Content: solo garantiza los campos que el
 * backend documenta siempre presentes; el resto se trata como opcional
 * porque Video/Article/Riff Valley playlist y Content son entidades desacopladas.
 */
export interface ContentRef {
    id: string;
    type: ContentType;
    name: string;
    publicationDate?: string | null;
    backlog: boolean;
    ready?: boolean;
    notes?: string | null;
    closeDate?: string | null;
    author?: ContentAuthor | null;
}

interface CreateContentFields {
    name: string;
    notes?: string | null;
    closeDate?: string | null;
    authorId: string;
    listDate?: string | null;
    riffValleyPlaylistId?: string | null;
    articleId?: string | null;
    videoId?: string | null;
    reunionId?: string | null;
    ready?: boolean;
    backlog?: boolean;
}

export type CreateContentDto =
    | (CreateContentFields & { type: "radar"; publicationDate: string })
    | (CreateContentFields & { type: "best"; publicationDate: string })
    | (CreateContentFields & { type: "reunion"; publicationDate: string })
    | (CreateContentFields & { type: "article"; publicationDate?: string | null })
    | (CreateContentFields & { type: "photos"; publicationDate?: string | null })
    | (CreateContentFields & { type: "riff_valley_playlist"; publicationDate?: string | null })
    | (CreateContentFields & { type: "video"; publicationDate?: string | null });

export interface UpdateContentDto {
    type?: ContentType;
    name?: string;
    notes?: string | null;
    publicationDate?: string | null;
    closeDate?: string | null;
    listDate?: string | null;
    reunionId?: string | null;
    articleId?: string;
    videoId?: string;
    riffValleyPlaylistId?: string;
    authorId?: string;
    ready?: boolean;
    backlog?: boolean;
}

export interface ContentsByMonthResponse extends Array<Content> { }

// Services
export async function getContents(backlog?: boolean, signal?: AbortSignal): Promise<Content[]> {
    const response = await api.get<Content[]>("/contents", {
        params: backlog !== undefined ? { backlog } : undefined,
        signal,
    });
    return response.data;
}

export async function getContentById(id: string): Promise<Content> {
    const response = await api.get<Content>(`/contents/${id}`);
    return response.data;
}

function contentCalendarSourceConfig(sourceId?: string) {
    return sourceId ? { headers: { "X-Content-Calendar-Client-Id": sourceId } } : undefined;
}

export async function createContent(data: CreateContentDto, sourceId?: string): Promise<Content> {
    const config = contentCalendarSourceConfig(sourceId);
    const response = config
        ? await api.post<Content>("/contents", data, config)
        : await api.post<Content>("/contents", data);
    return response.data;
}

export async function updateContent(
    id: string,
    data: UpdateContentDto,
    sourceId?: string
): Promise<Content> {
    const config = contentCalendarSourceConfig(sourceId);
    const response = config
        ? await api.patch<Content>(`/contents/${id}`, data, config)
        : await api.patch<Content>(`/contents/${id}`, data);
    return response.data;
}

export async function deleteContent(id: string, sourceId?: string): Promise<void> {
    const config = contentCalendarSourceConfig(sourceId);
    if (config) await api.delete(`/contents/${id}`, config);
    else await api.delete(`/contents/${id}`);
}

export async function getContentsByMonth(
    year: number,
    month: number,
    signal?: AbortSignal
): Promise<Content[]> {
    const response = await api.get<Content[]>(
        `/contents/by-month`,
        {
            params: { year, month },
            signal,
        }
    );
    return response.data;
}
