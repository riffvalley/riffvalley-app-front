// @vitest-environment happy-dom
import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEventImportSession } from "./useEventImportSession";

const storage = vi.hoisted(() => ({
  get: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../infrastructure/eventImportSessionStorage", () => ({
  deleteEventImportSession: storage.remove,
  EVENT_IMPORT_SESSION_FORMAT_VERSION: 1,
  EventImportSessionStorageError: class EventImportSessionStorageError extends Error {
    constructor(message: string, options?: ErrorOptions) {
      super(message, options);
      this.name = "EventImportSessionStorageError";
    }
  },
  getEventImportSession: storage.get,
  saveEventImportSession: storage.save,
}));

function setup() {
  let session!: ReturnType<typeof useEventImportSession>;
  const wrapper = mount(
    defineComponent({
      setup() {
        session = useEventImportSession();
        return () => null;
      },
    })
  );
  return { session, wrapper };
}

describe("useEventImportSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    storage.get.mockReset().mockResolvedValue(null);
    storage.save.mockReset().mockResolvedValue("user-1");
    storage.remove.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it("saves only dirty sessions at 30 seconds and avoids interval writes without changes", async () => {
    const { session, wrapper } = setup();
    const payload = { rows: [1] };
    session.changeOwner("user-1");
    session.configure(
      () => payload,
      () => true
    );
    session.startAutosave();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(storage.save).not.toHaveBeenCalled();
    session.markDirty();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(storage.save).toHaveBeenCalledTimes(1);
    expect(storage.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ownerId: "user-1",
        formatVersion: 1,
        payload: { rows: [1] },
      })
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(storage.save).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("serializes writes and saves the latest revision when state changes during a write", async () => {
    const { session, wrapper } = setup();
    let payload = "first";
    let finishFirst!: () => void;
    storage.save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = () => resolve("user-1");
        })
    );
    session.changeOwner("user-1");
    session.configure(
      () => payload,
      () => true
    );
    session.markDirty();
    const firstWrite = session.saveNow();
    await flushPromises();
    payload = "latest";
    session.markDirty();
    finishFirst();
    await firstWrite;
    expect(storage.save).toHaveBeenCalledTimes(2);
    expect(storage.save.mock.calls.map(([record]) => record.payload)).toEqual(["first", "latest"]);
    expect(session.status.value).toBe("saved");
    wrapper.unmount();
  });

  it("does not let a late write for the previous account block the new account's critical save", async () => {
    const { session, wrapper } = setup();
    let finishPrevious!: () => void;
    storage.save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishPrevious = () => resolve("previous-user");
        })
    );
    session.changeOwner("previous-user");
    session.configure(
      () => ({ owner: "previous" }),
      () => true
    );
    const previousSave = session.saveNow();
    await flushPromises();

    session.changeOwner("123e4567-e89b-42d3-a456-426614174099");
    session.configure(
      () => ({ owner: "current" }),
      () => true
    );
    const currentSave = session.saveNow();
    finishPrevious();
    await Promise.all([previousSave, currentSave]);

    expect(storage.save.mock.calls.map(([record]) => record.ownerId)).toEqual([
      "previous-user",
      "123e4567-e89b-42d3-a456-426614174099",
    ]);
    expect(storage.save.mock.calls[1]?.[0].payload).toEqual({ owner: "current" });
    wrapper.unmount();
  });

  it("loads and deletes only the active user's record", async () => {
    const { session, wrapper } = setup();
    storage.get.mockResolvedValue({
      ownerId: "user-1",
      formatVersion: 1,
      savedAt: "2026-01-01T00:00:00.000Z",
      payload: { rows: [] },
    });
    session.changeOwner("user-1");
    await expect(session.load("user-1")).resolves.toMatchObject({ ownerId: "user-1" });
    await session.discard("user-1");
    expect(storage.get).toHaveBeenCalledWith("user-1");
    expect(storage.remove).toHaveBeenCalledWith("user-1");
    expect(session.storedSession.value).toBeNull();
    wrapper.unmount();
  });

  it("reports an error and keeps the dirty state when IndexedDB cannot save", async () => {
    const { session, wrapper } = setup();
    session.changeOwner("user-1");
    session.configure(
      () => ({ rows: ["draft"] }),
      () => true
    );
    storage.save.mockRejectedValueOnce(new Error("quota"));
    await expect(session.saveNow()).rejects.toThrow("quota");
    expect(session.status.value).toBe("error");
    wrapper.unmount();
  });

  it("reports serialization errors without writing or marking the session saved", async () => {
    const { session, wrapper } = setup();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    session.changeOwner("user-1");
    session.configure(
      () => circular,
      () => true
    );

    await expect(session.saveNow()).rejects.toMatchObject({
      name: "EventImportSessionStorageError",
      cause: expect.objectContaining({ name: "TypeError" }),
    });
    expect(storage.save).not.toHaveBeenCalled();
    expect(session.status.value).toBe("error");
    wrapper.unmount();
  });
});
