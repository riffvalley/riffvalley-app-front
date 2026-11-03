const DATABASE_NAME = "riff-valley-event-import";
const DATABASE_VERSION = 1;
const STORE_NAME = "sessions";
export const EVENT_IMPORT_SESSION_FORMAT_VERSION = 1;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export interface StoredEventImportSession {
  ownerId: string;
  formatVersion: number;
  savedAt: string;
  payload: unknown;
}

export class EventImportSessionStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EventImportSessionStorageError";
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new EventImportSessionStorageError("IndexedDB no está disponible."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let blocked = false;
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "ownerId" });
      }
    };
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      }
    };
    request.onerror = () =>
      reject(
        new EventImportSessionStorageError("No se pudo abrir el almacenamiento local.", {
          cause: request.error,
        })
      );
    request.onblocked = () => {
      blocked = true;
      reject(
        new EventImportSessionStorageError(
          "El almacenamiento local está bloqueado por otra pestaña."
        )
      );
    };
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        let request: IDBRequest<T>;
        try {
          request = action(transaction.objectStore(STORE_NAME));
        } catch (error) {
          database.close();
          reject(
            new EventImportSessionStorageError("No se pudo guardar el borrador local.", {
              cause: error,
            })
          );
          return;
        }
        let result: T;
        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () =>
          reject(
            new EventImportSessionStorageError("No se pudo acceder al borrador local.", {
              cause: request.error,
            })
          );
        transaction.onabort = () => {
          database.close();
          reject(
            new EventImportSessionStorageError(
              "No se pudo completar el acceso al borrador local.",
              { cause: transaction.error }
            )
          );
        };
        transaction.onerror = () => {
          database.close();
          reject(
            new EventImportSessionStorageError(
              "No se pudo completar el acceso al borrador local.",
              { cause: transaction.error }
            )
          );
        };
        transaction.oncomplete = () => {
          database.close();
          resolve(result!);
        };
      })
  );
}

export async function getEventImportSession(
  ownerId: string
): Promise<StoredEventImportSession | null> {
  if (!UUID_PATTERN.test(ownerId)) {
    throw new EventImportSessionStorageError("La identidad de la cuenta no es un UUID válido.");
  }
  const value = await withStore<unknown>("readonly", (store) => store.get(ownerId));
  if (value === undefined) return null;
  if (
    !value ||
    typeof value !== "object" ||
    (value as StoredEventImportSession).ownerId !== ownerId ||
    !Number.isInteger((value as StoredEventImportSession).formatVersion) ||
    typeof (value as StoredEventImportSession).savedAt !== "string" ||
    !("payload" in value)
  ) {
    throw new EventImportSessionStorageError(
      "El borrador local tiene un formato inválido. Puedes descartarlo."
    );
  }
  return value as StoredEventImportSession;
}

export function saveEventImportSession(session: StoredEventImportSession): Promise<IDBValidKey> {
  if (!UUID_PATTERN.test(session.ownerId) || !Number.isInteger(session.formatVersion)) {
    return Promise.reject(
      new EventImportSessionStorageError("La sesión no tiene una identidad o versión válida.")
    );
  }
  return withStore("readwrite", (store) => store.put(session));
}

export function deleteEventImportSession(ownerId: string): Promise<undefined> {
  if (!UUID_PATTERN.test(ownerId))
    return Promise.reject(
      new EventImportSessionStorageError("No se puede eliminar una sesión sin propietario.")
    );
  return withStore("readwrite", (store) => store.delete(ownerId));
}
