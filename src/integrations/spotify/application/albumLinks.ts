export interface AlbumLinkQuery { albumName: string; artistName: string }
export type AlbumLinkResult = { status: "found"; link: string; image: string | null } | { status: "not-found" | "failed" };
export interface AlbumLinkSession { findAlbum(query: AlbumLinkQuery): Promise<AlbumLinkResult> }
export interface AlbumLinksPort { openSession(): Promise<AlbumLinkSession | null> }
