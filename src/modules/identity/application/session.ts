export interface Session {
  token: string | null;
  username: string | null;
  userId: string | null;
  image: string | null;
  roles: string[];
}
export interface LoginPayload { username: string; password: string }
export interface SessionPersistence {
  read(): Session;
  write(session: Session): void;
  writeImage(image: string | null): void;
  clear(): void;
}
export interface IdentityDependencies {
  persistence: SessionPersistence;
  login(payload: LoginPayload): Promise<Session>;
  onLogout(): void;
}
export const emptySession = (): Session => ({ token: null, username: null, userId: null, image: null, roles: [] });
