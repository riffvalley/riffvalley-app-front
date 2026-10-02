/** Meeting resource returned by the legacy /reunions endpoints. */
export interface Reunion {
  id: string;
  title: string;
  description?: string;
  date: string;
  points?: ReunionPoint[];
  createdAt: string;
  updatedAt: string;
}

/** Point embedded in a meeting or returned by the legacy points endpoints. */
export interface ReunionPoint {
  id: string;
  titulo: string;
  content: string;
  done: boolean;
}

/** Editable fields accepted by PATCH /reunions/:id. */
export interface UpdateReunion {
  title: string;
  date: string;
}

/** Fields submitted to POST /points by the current meeting consumers. */
export interface CreateReunionPoint {
  titulo: string;
  content: string;
  reunionId: string;
}

/** Fields submitted to PATCH /points/:id. */
export interface UpdateReunionPoint {
  titulo?: string;
  content?: string;
  done?: boolean;
}
