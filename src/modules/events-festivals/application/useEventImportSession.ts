import { onScopeDispose, shallowRef } from "vue";
import {
  deleteEventImportSession,
  EVENT_IMPORT_SESSION_FORMAT_VERSION,
  EventImportSessionStorageError,
  getEventImportSession,
  saveEventImportSession,
  type StoredEventImportSession,
} from "../infrastructure/eventImportSessionStorage";

export type EventImportSaveStatus = "saved" | "dirty" | "saving" | "error";

export function useEventImportSession() {
  const status = shallowRef<EventImportSaveStatus>("saved");
  const lastSavedAt = shallowRef<string | null>(null);
  const storedSession = shallowRef<StoredEventImportSession | null>(null);
  let ownerId: string | null = null;
  let revision = 0;
  let savedRevision = 0;
  let writing: Promise<void> | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let payloadFactory: (() => unknown) | null = null;
  let hasWork: (() => boolean) | null = null;
  let disposed = false;
  let ownerGeneration = 0;
  let savedFingerprint: string | null = null;

  async function load(owner: string): Promise<StoredEventImportSession | null> {
    const requestedGeneration = ownerGeneration;
    let record: StoredEventImportSession | null;
    try {
      record = await getEventImportSession(owner);
    } catch (error) {
      if (owner === ownerId && requestedGeneration === ownerGeneration && !disposed) {
        status.value = "error";
      }
      throw error;
    }
    if (owner !== ownerId || requestedGeneration !== ownerGeneration || disposed) return null;
    storedSession.value = record;
    lastSavedAt.value = record?.savedAt ?? null;
    return record;
  }

  function configure(factory: () => unknown, workExists: () => boolean) {
    payloadFactory = factory;
    hasWork = workExists;
  }

  function markDirty() {
    revision += 1;
    status.value = "dirty";
  }

  async function writeUntilCurrent(): Promise<void> {
    if (writing) {
      const pendingWrite = writing;
      const requestedOwner = ownerId;
      try {
        await pendingWrite;
      } catch (error) {
        if (ownerId === requestedOwner) throw error;
      }
      if (ownerId !== requestedOwner || disposed || savedRevision === revision) return;
      return writeUntilCurrent();
    }
    writing = (async () => {
      while (!disposed && ownerId && payloadFactory && hasWork && savedRevision !== revision) {
        const requestedRevision = revision;
        const requestedOwner = ownerId;
        let payload: unknown;
        let fingerprint: string;
        try {
          payload = payloadFactory();
          fingerprint = JSON.stringify(payload);
        } catch (error) {
          if (ownerId === requestedOwner && !disposed) status.value = "error";
          throw new EventImportSessionStorageError(
            "No se pudo preparar una copia serializable de la sesión local.",
            { cause: error }
          );
        }
        status.value = "saving";
        try {
          if (requestedOwner !== ownerId || disposed) return;
          if (hasWork() && fingerprint === savedFingerprint) {
            savedRevision = requestedRevision;
            status.value = savedRevision === revision ? "saved" : "dirty";
            continue;
          }
          if (hasWork()) {
            const savedAt = new Date().toISOString();
            const record: StoredEventImportSession = {
              ownerId: requestedOwner,
              formatVersion: EVENT_IMPORT_SESSION_FORMAT_VERSION,
              savedAt,
              payload,
            };
            await saveEventImportSession(record);
            if (ownerId !== requestedOwner || disposed) return;
            storedSession.value = record;
            lastSavedAt.value = savedAt;
            savedFingerprint = fingerprint;
          } else {
            await deleteEventImportSession(requestedOwner);
            if (ownerId !== requestedOwner || disposed) return;
            storedSession.value = null;
            lastSavedAt.value = null;
            savedFingerprint = null;
          }
          savedRevision = requestedRevision;
          status.value = savedRevision === revision ? "saved" : "dirty";
        } catch (error) {
          if (ownerId === requestedOwner && !disposed) status.value = "error";
          throw error instanceof Error
            ? error
            : new EventImportSessionStorageError("No se pudo guardar la sesión local.");
        }
      }
    })().finally(() => {
      writing = null;
    });
    return writing;
  }

  async function saveNow(): Promise<void> {
    if (!ownerId)
      throw new EventImportSessionStorageError(
        "Espera a que se confirme la identidad de la cuenta."
      );
    markDirty();
    await writeUntilCurrent();
  }

  async function discard(owner: string) {
    if (owner !== ownerId)
      throw new EventImportSessionStorageError("La cuenta cambió antes de eliminar la sesión.");
    await deleteEventImportSession(owner);
    storedSession.value = null;
    lastSavedAt.value = null;
    savedFingerprint = null;
    savedRevision = revision;
    status.value = "saved";
  }

  function startAutosave() {
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      if (savedRevision !== revision) void writeUntilCurrent().catch(() => undefined);
    }, 30_000);
  }

  function changeOwner(owner: string | null) {
    ownerGeneration += 1;
    ownerId = owner;
    revision = 0;
    savedRevision = 0;
    storedSession.value = null;
    lastSavedAt.value = null;
    savedFingerprint = null;
    status.value = "saved";
  }

  onScopeDispose(() => {
    disposed = true;
    if (interval) clearInterval(interval);
  });

  return {
    status,
    lastSavedAt,
    storedSession,
    load,
    configure,
    markDirty,
    saveNow,
    discard,
    startAutosave,
    changeOwner,
  };
}
