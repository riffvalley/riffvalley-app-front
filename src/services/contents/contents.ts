import api from "@services/api/api";
import type { Spotify } from "@services/spotify/spotify";
import type { Article } from "@services/articles/articles";

// Interfaces
export type ContentType = "article" | "photos" | "spotify" | "radar" | "best" | "video" | "reunion";

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
    spotify: Spotify | null;
    article: Article | null;
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
