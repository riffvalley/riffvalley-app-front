import api from "@services/api/api";
import type { RiffValleyPlaylist } from "@services/riff-valley-playlists/riffValleyPlaylists";
import type { Article } from "@services/articles/articles";

// Interfaces
export type ContentType = "article" | "photos" | "riff_valley_playlist" | "radar" | "best" | "video" | "reunion";

export interface Author {
    id: string;
    username: string;
    isActive: boolean;
    image?: string | null;
}

export interface ContentListAsignation {
    id: string;
    done: boolean;
    position: number;
    description: string | null;
}

export interface ContentList {
    id: string;
    name: string;
    type: string;
    status: string;
    listDate: string;
    releaseDate: string | null;
    closeDate: string | null;
    free: boolean;
    asignations: ContentListAsignation[];
}

export interface Content {
    id: string;
    type: ContentType;
    name: string;
    notes?: string | null;
    publicationDate: string; // ISO date string
    closeDate: string | null;
    reunionId?: string | null;
    backlog: boolean;
    author: Author;

    // Relations based on type
    list: ContentList | null;
    riffValleyPlaylist: RiffValleyPlaylist | null;
    article: Article | null;
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
    publicationDate: string | null;
    backlog: boolean;
    ready?: boolean;
    notes?: string | null;
    closeDate?: string | null;
    author?: Author;
}

export interface CreateContentDto {
    type: ContentType;
    name: string;
    notes?: string;
    publicationDate?: string;
    closeDate?: string;
    reunionId?: string;
    authorId: string;
    listDate?: string;
    riffValleyPlaylistId?: string;
    backlog?: boolean;
}

export interface UpdateContentDto {
    type?: ContentType;
    name?: string;
    notes?: string;
    publicationDate?: string | null;
    closeDate?: string | null;
    reunionId?: string;
    authorId?: string;
    backlog?: boolean;
}

export interface ContentsByMonthResponse extends Array<Content> { }

// Services
export async function getContents(backlog?: boolean): Promise<Content[]> {
    const response = await api.get<Content[]>("/contents", {
        params: backlog !== undefined ? { backlog } : undefined,
    });
    return response.data;
}

export async function getContentById(id: string): Promise<Content> {
    const response = await api.get<Content>(`/contents/${id}`);
    return response.data;
}

export async function createContent(data: CreateContentDto): Promise<Content> {
    const response = await api.post<Content>("/contents", data);
    return response.data;
}

export async function updateContent(
    id: string,
    data: UpdateContentDto
): Promise<Content> {
    const response = await api.patch<Content>(`/contents/${id}`, data);
    return response.data;
}

export async function deleteContent(id: string): Promise<void> {
    await api.delete(`/contents/${id}`);
}

export async function getContentsByMonth(
    year: number,
    month: number
): Promise<Content[]> {
    const response = await api.get<Content[]>(
        `/contents/by-month`,
        {
            params: { year, month },
        }
    );
    return response.data;
}
