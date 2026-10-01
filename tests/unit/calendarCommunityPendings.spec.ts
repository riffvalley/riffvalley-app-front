// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import DiscComponent from "../../src/views/discsCalendar/components/DiscComponent.vue";
import DiscComponentBaby from "../../src/views/discsCalendarBaby/components/DiscComponentBaby.vue";
import { toggleUserPending } from "../../src/modules/community/pendings/application/pendingActions";
import { useCommunityPendingStore } from "../../src/modules/community/pendings/presentation/pendingStore";
import type { PendingPort } from "../../src/modules/community/pendings/application/pendingPort";
import type { CalendarDisc } from "../../src/modules/catalog/discs/calendars/domain/discCalendar";

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: false }) } }));
vi.mock("@services/swal/SwalService", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const calendarDisc: CalendarDisc = {
  id: "disc-1", name: "Álbum", releaseDate: "2026-09-18", artist: { id: "artist-1", name: "Banda" },
  genreId: "rock", genre: { id: "rock", name: "Rock", color: "#123456" }, image: null, link: null,
  ep: false, debut: false, verified: false, pinned: false, nationalReleaseId: null,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup(primary: typeof DiscComponent | typeof DiscComponentBaby, port: PendingPort) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useCommunityPendingStore(pinia);
  const userId = "user-1";
  const discId = calendarDisc.id;
  const state = computed(() => store.get(userId, discId));
  const submitting = computed(() => store.isSubmitting(userId, discId));
  const initialize = (id: string, currentDiscId: string, pendingId: string | null) => store.seed(id, currentDiscId, pendingId);
  const toggle = (id: string, currentDiscId: string) => toggleUserPending(store, port, id, currentDiscId);
  const pendingProps = {
    disc: calendarDisc,
    pendingUserId: userId,
    pendingState: state.value,
    pendingSubmitting: submitting.value,
    initializePending: initialize,
    togglePending: toggle,
  };
  const standardProps = { genres: [{ id: "rock", name: "Rock", color: "#123456" }], countries: [], focusDiscId: "" };
  const babyProps = { genres: [{ id: "rock", name: "Rock", color: "#123456" }], artistCountry: null };
  const propsFor = (card: typeof DiscComponent | typeof DiscComponentBaby) => ({
    ...pendingProps,
    ...(card === DiscComponent ? standardProps : babyProps),
  });
  const other = primary === DiscComponent ? DiscComponentBaby : DiscComponent;
  const Harness = defineComponent({
    setup() {
      return () => h("div", [
        h("div", { "data-testid": "primary" }, [h(primary, { ...propsFor(primary), pendingState: state.value, pendingSubmitting: submitting.value })]),
        h("div", { "data-testid": "other" }, [h(other, { ...propsFor(other), pendingState: state.value, pendingSubmitting: submitting.value })]),
      ]);
    },
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [pinia], stubs: {
      SearchableSelect: true, EditModal: true, DiscDetail: true, ArtistDetail: true,
      SpotifyArtistButton: true, CircleFlags: true,
    } },
  });
  return { wrapper, store, userId, discId };
}

function pendingButton(wrapper: ReturnType<typeof setup>["wrapper"], testId: string) {
  return wrapper.get(`[data-testid="${testId}"]`).findAll("button").find((button) =>
    /Pendiente|Guardado|¡Añadido!/.test(button.text()),
  )!;
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe.each([
  ["estándar", DiscComponent],
  ["babyUser", DiscComponentBaby],
] as const)("pendientes en calendario %s", (_variant, component) => {
  it("mantiene el estado confirmado ante error, permite reintentar y sincroniza las dos tarjetas", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const port: PendingPort = {
      create: vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce("pending-1"),
      remove: vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined),
      list: vi.fn(),
    };
    const { wrapper, store, userId, discId } = setup(component, port);
    const first = pendingButton(wrapper, "primary");

    await first.trigger("click");
    await flushPromises();
    expect(store.get(userId, discId)).toEqual({ pendingId: null, loaded: true });
    expect(pendingButton(wrapper, "other").text()).toContain("Pendiente");

    await pendingButton(wrapper, "primary").trigger("click");
    await flushPromises();
    expect(store.get(userId, discId)).toEqual({ pendingId: "pending-1", loaded: true });
    expect(pendingButton(wrapper, "other").text()).toContain("Guardado");

    await pendingButton(wrapper, "other").trigger("click");
    await flushPromises();
    expect(store.get(userId, discId)).toEqual({ pendingId: "pending-1", loaded: true });
    expect(pendingButton(wrapper, "primary").text()).toContain("¡Añadido!");
    expect(pendingButton(wrapper, "other").text()).toContain("Guardado");

    await pendingButton(wrapper, "other").trigger("click");
    await flushPromises();
    expect(store.get(userId, discId)).toEqual({ pendingId: null, loaded: true });
    expect(pendingButton(wrapper, "other").text()).toContain("Pendiente");
    expect(port.create).toHaveBeenCalledTimes(2);
    expect(port.remove).toHaveBeenCalledTimes(2);
  });

  it("bloquea envíos repetidos y no actualiza visualmente antes del éxito", async () => {
    const request = deferred<string>();
    const deleteRequest = deferred<void>();
    const port: PendingPort = {
      create: vi.fn(() => request.promise), remove: vi.fn(() => deleteRequest.promise), list: vi.fn(),
    };
    const { wrapper, store, userId, discId } = setup(component, port);

    await Promise.all([
      pendingButton(wrapper, "primary").trigger("click"),
      pendingButton(wrapper, "other").trigger("click"),
    ]);
    expect(port.create).toHaveBeenCalledTimes(1);
    expect(store.get(userId, discId)).toEqual({ pendingId: null, loaded: true });
    expect(pendingButton(wrapper, "other").text()).toContain("Pendiente");
    expect(pendingButton(wrapper, "other").element).toHaveProperty("disabled", true);

    request.resolve("pending-1");
    await flushPromises();
    expect(pendingButton(wrapper, "other").text()).toContain("Guardado");

    await pendingButton(wrapper, "other").trigger("click");
    expect(store.get(userId, discId)).toEqual({ pendingId: "pending-1", loaded: true });
    expect(pendingButton(wrapper, "other").text()).toContain("Guardado");
    expect(pendingButton(wrapper, "other").element).toHaveProperty("disabled", true);
    deleteRequest.resolve();
    await flushPromises();
    expect(store.get(userId, discId)).toEqual({ pendingId: null, loaded: true });
    expect(pendingButton(wrapper, "other").text()).toContain("Pendiente");
  });
});
