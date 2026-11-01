export interface PointHttpResponse {
  id: string;
  titulo: string;
  content: string | null;
  done: boolean | null;
  createdAt: string;
  reunion?: ReunionReference | null;
}

export interface ReunionReference {
  id: string;
  titulo: string;
}

export interface ReunionHttpResponse {
  id: string;
  titulo: string;
  fecha: string;
  description?: string | null;
  points?: PointHttpResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface Reunion extends Omit<
  ReunionHttpResponse,
  "titulo" | "fecha" | "description" | "points"
> {
  title: string;
  date: string;
  description: string | null;
  points: Point[];
}

export interface Point extends Omit<PointHttpResponse, "titulo" | "reunion"> {
  title: string;
  reunion?: ReunionReference | null;
}

export interface CreateReunionDto {
  titulo: string;
  fecha: string;
  description?: string;
}

export type UpdateReunionDto = Partial<CreateReunionDto>;

export interface CreatePointDto {
  titulo: string;
  reunionId: string;
  content?: string | null;
  done?: boolean | null;
}

export interface UpdatePointDto {
  titulo?: string;
  content?: string | null;
  done?: boolean | null;
  reunionId?: string;
}

export type CreateReunionResponse = ReunionHttpResponse;
export type UpdateReunionResponse = ReunionHttpResponse;
export type CreatePointResponse = PointHttpResponse;
export type UpdatePointResponse = PointHttpResponse;

export type EditorialActor =
  { kind: "user"; id: string; displayName: string } | { kind: "system"; displayName: string };

export interface ReunionsEventBase {
  type: "reunions.invalidate";
  version: 1;
}

export interface ReunionsInitialEvent extends ReunionsEventBase {
  reason: "initial";
}

export type ReunionsAction =
  | "reunion.created"
  | "reunion.updated"
  | "reunion.deleted"
  | "point.created"
  | "point.updated"
  | "point.completed"
  | "point.reopened"
  | "point.moved"
  | "point.deleted";

export interface ReunionDescriptor {
  id: string;
  title: string;
}

export interface PointDescriptor {
  id: string;
  title: string;
}

interface ReunionsChangeBase extends ReunionsEventBase {
  reason: "change";
}

export type ReunionsChangeEvent =
  | (ReunionsChangeBase & {
      action?: never;
      actor?: never;
      reunion?: never;
      point?: never;
      previousReunion?: never;
      sourceId?: never;
    })
  | (ReunionsChangeBase & {
      action: "reunion.created" | "reunion.updated" | "reunion.deleted";
      actor: EditorialActor;
      reunion: ReunionDescriptor;
      sourceId?: string;
    })
  | (ReunionsChangeBase & {
      action:
        "point.created" | "point.updated" | "point.completed" | "point.reopened" | "point.deleted";
      actor: EditorialActor;
      reunion: ReunionDescriptor;
      point: PointDescriptor;
      sourceId?: string;
    })
  | (ReunionsChangeBase & {
      action: "point.moved";
      actor: EditorialActor;
      previousReunion: ReunionDescriptor;
      reunion: ReunionDescriptor;
      point: PointDescriptor;
      sourceId?: string;
    });

export type ReunionsEvent = ReunionsInitialEvent | ReunionsChangeEvent;
