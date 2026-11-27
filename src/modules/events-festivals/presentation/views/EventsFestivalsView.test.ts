// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import api from "@/services/api/api";
import { useAuthStore } from "@/modules/identity/auth";
import EventsFestivalsView from "./EventsFestivalsView.vue";

const confirmMock = vi.fn();
const successMock = vi.fn();
vi.mock("@/services/api/api", () => ({
  default: { get: vi.fn(), patch: vi.fn(), delete: vi.fn(), post: vi.fn() },
}));
vi.mock("@/services/swal/SwalService", () => ({
  default: {
    confirm: (...args: unknown[]) => confirmMock(...args),
    success: (...args: unknown[]) => successMock(...args),
  },
}));

function listedEvent(type: "concert" | "festival", id: string) {
  return {
    id,
    type,
    name: type === "festival" ? "Festival del Valle" : null,
    startDate: "2026-11-15",
    endDate: type === "festival" ? "2026-11-17" : null,
    venue: {
      name: "Escenario Central",
      locality: {
        name: "Santander",
        administrativeRegion: { name: "Cantabria", country: { name: "España" } },
      },
    },
    lineup: type === "concert" ? [{ name: "Apertura" }, { name: "Cabeza de cartel" }] : [],
  };
}

function page(
  type: "concert" | "festival",
  pageNum = 1,
  data = [listedEvent(type, `${type}-${pageNum}`)]
) {
  return {
    totalItems: 21,
    totalPages: 2,
    currentPage: pageNum,
    limit: 20,
    data,
  };
}

function editableEvent(type: "concert" | "festival" = "concert") {
  return {
    id: `${type}-1`,
    type,
    name: type === "festival" ? "Festival del Valle" : null,
    startDate: "2026-11-15",
    endDate: type === "festival" ? "2026-11-17" : null,
    venueId: "venue-1",
    tourId: null,
    price: "25 €",
    otherInfo: "Apertura 19:00",
    venue: {
      id: "venue-1",
      name: "Escenario Central",
      locality: {
        id: "locality-1",
        name: "Santander",
        province: null,
        administrativeRegion: {
          id: "region-1",
          name: "Cantabria",
          country: { id: "country-1", name: "España" },
        },
      },
    },
    lineup: [
      {
        id: "lineup-1",
        eventId: `${type}-1`,
        artistId: "artist-1",
        tourId: null,
        name: "Apertura",
        position: 1,
      },
      {
        id: "lineup-2",
        eventId: `${type}-1`,
        artistId: "artist-2",
        tourId: null,
        name: "Cabeza de cartel",
        position: 2,
      },
    ],
  };
}

describe("EventsFestivalsView", () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    setActivePinia(createPinia());
    const auth = useAuthStore();
    auth.$patch({
      authStatus: "authenticated",
      token: "token",
      role: "riffvalley",
      userId: "editor",
    });
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockImplementation(async (url, config) => {
      if (url === "/events/concert-1" || url === "/events/festival-1") {
        return { data: editableEvent(url.includes("festival") ? "festival" : "concert") } as never;
      }
      if (url === "/countries")
        return { data: { data: [{ id: "country-1", name: "España" }], totalItems: 1 } } as never;
      if (url === "/administrative-regions")
        return {
          data: {
            data: [{ id: "region-1", name: "Cantabria", countryId: "country-1" }],
            totalItems: 1,
          },
        } as never;
      const params = config?.params as { type: "concert" | "festival"; offset: number };
      return { data: page(params.type, Math.floor(params.offset / 20) + 1) } as never;
    });
    vi.mocked(api.patch)
      .mockReset()
      .mockResolvedValue({ data: editableEvent() } as never);
    vi.mocked(api.delete)
      .mockReset()
      .mockResolvedValue({ data: { affected: 1 } } as never);
    vi.mocked(api.post).mockReset();
    confirmMock.mockReset().mockResolvedValue({ isConfirmed: true });
    successMock.mockReset().mockResolvedValue({ isConfirmed: true });
  });

  afterEach(() => {
    wrapper?.unmount();
    queryClient.clear();
  });

  function mountView() {
    wrapper = mount(EventsFestivalsView, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient }]],
        stubs: { RouterLink: { template: "<a><slot /></a>" } },
      },
    });
    return wrapper;
  }

  it("switches tabs without dropping their independent date filters and page positions", async () => {
    const view = mountView();
    await flushPromises();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenLastCalledWith("/events", {
      params: { type: "concert", limit: 20, offset: 0 },
      signal: expect.any(AbortSignal),
    });

    await view.get('input[type="date"]').setValue("2026-11-01");
    await flushPromises();
    await view
      .get('[role="tabpanel"]:not([hidden]) [aria-label="Paginación de eventos"] button:last-child')
      .trigger("click");
    await flushPromises();
    await view.get('[role="tab"][data-tab="festivals"]').trigger("click");
    await flushPromises();
    expect(api.get).toHaveBeenLastCalledWith("/events", {
      params: { type: "festival", limit: 20, offset: 0 },
      signal: expect.any(AbortSignal),
    });

    await view.get('[role="tabpanel"]:not([hidden]) input[type="date"]').setValue("2026-11-05");
    await flushPromises();
    await view
      .get('[role="tabpanel"]:not([hidden]) [aria-label="Paginación de eventos"] button:last-child')
      .trigger("click");
    await flushPromises();
    expect(api.get).toHaveBeenLastCalledWith("/events", {
      params: { type: "festival", limit: 20, offset: 20, dateFrom: "2026-11-05" },
      signal: expect.any(AbortSignal),
    });
    const requestCountBeforeSwitchBack = vi.mocked(api.get).mock.calls.length;
    await view.get('[role="tab"][data-tab="concerts"]').trigger("click");
    await flushPromises();
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(requestCountBeforeSwitchBack);
    expect(view.get('[role="tab"][data-tab="concerts"]').attributes("aria-selected")).toBe("true");
  });

  it("renders the concert lineup in order and the festival date range and location", async () => {
    const view = mountView();
    await flushPromises();
    expect(view.text()).toContain("Apertura · Cabeza de cartel");
    expect(view.text()).toContain("Escenario Central");
    await view.get('[role="tab"][data-tab="festivals"]').trigger("click");
    await flushPromises();
    expect(view.text()).toContain("Festival del Valle");
    expect(view.text()).toContain("15 nov 2026 – 17 nov 2026");
    expect(view.text()).toContain("Santander");
    expect(view.text()).toContain("España");
  });

  it("shows empty and recoverable error states", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: page("concert", 1, []) } as never);
    const view = mountView();
    await flushPromises();
    expect(view.text()).toContain("No hay eventos para mostrar.");

    view.unmount();
    queryClient.clear();
    vi.mocked(api.get).mockReset().mockRejectedValueOnce(new Error("offline"));
    mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("No se pudieron cargar los conciertos.");
    expect(
      wrapper.findAll('button[type="button"]').some((button) => button.text() === "Reintentar")
    ).toBe(true);
  });

  it("opens the correct edit modal, preloads fields, saves edits and invalidates the listing", async () => {
    const view = mountView();
    await flushPromises();
    await view.get('[aria-label="Editar concierto Apertura, Cabeza de cartel"]').trigger("click");
    await flushPromises();
    expect(view.get('[role="dialog"] h2').text()).toBe("Editar concierto");
    expect((view.get('[role="dialog"] input[type="date"]').element as HTMLInputElement).value).toBe(
      "2026-11-15"
    );
    expect(view.text()).toContain("Escenario Central");
    expect(view.text()).toContain("Apertura");
    await view.get('[role="dialog"] input[type="date"]').setValue("2026-11-16");
    await view.get('[aria-label="Bajar Apertura"]').trigger("click");
    await view.get('[role="dialog"] form').trigger("submit");
    await flushPromises();
    expect(api.patch).toHaveBeenCalledWith(
      "/events/concert-1",
      expect.objectContaining({
        startDate: "2026-11-16",
        lineup: [
          { artistId: "artist-2", name: "Cabeza de cartel", tourId: null },
          { artistId: "artist-1", name: "Apertura", tourId: null },
        ],
      })
    );
    expect(view.find('[role="dialog"]').exists()).toBe(false);
    expect(successMock).toHaveBeenCalledWith("Evento actualizado correctamente.");
    expect(
      vi.mocked(api.get).mock.calls.filter(([url]) => url === "/events").length
    ).toBeGreaterThan(1);
  });

  it("edits festival name and both dates through the shared event modal", async () => {
    const view = mountView();
    await flushPromises();
    await view.get('[role="tab"][data-tab="festivals"]').trigger("click");
    await flushPromises();
    await view.get('[aria-label="Editar festival Festival del Valle"]').trigger("click");
    await flushPromises();
    expect(view.get('[role="dialog"] h2').text()).toBe("Editar festival");
    await view.get("#event-name").setValue("Festival del Valle 2027");
    const dates = view.findAll('[role="dialog"] input[type="date"]');
    await dates[0]?.setValue("2027-07-01");
    await dates[1]?.setValue("2027-07-03");
    await view.get('[role="dialog"] form').trigger("submit");
    await flushPromises();
    expect(api.patch).toHaveBeenCalledWith(
      "/events/festival-1",
      expect.objectContaining({
        name: "Festival del Valle 2027",
        startDate: "2027-07-01",
        endDate: "2027-07-03",
      })
    );
  });

  it("keeps the edit modal open after validation and server errors", async () => {
    const view = mountView();
    await flushPromises();
    await view.get('[aria-label="Editar concierto Apertura, Cabeza de cartel"]').trigger("click");
    await flushPromises();
    const dates = view.findAll('[role="dialog"] input[type="date"]');
    await dates[0]?.setValue("2026-11-20");
    await dates[1]?.setValue("2026-11-19");
    await view.get('[role="dialog"] form').trigger("submit");
    expect(view.get('[role="alert"]').text()).toContain("Revisa las fechas");
    expect(api.patch).not.toHaveBeenCalled();
    await view.findAll('[role="dialog"] input[type="date"]')[1]?.setValue("");
    vi.mocked(api.patch).mockRejectedValueOnce(new Error("conflict"));
    await view.get('[role="dialog"] form').trigger("submit");
    await flushPromises();
    expect(view.get('[role="dialog"]').exists()).toBe(true);
    expect(view.get('[role="alert"]').text()).toContain("No se pudo guardar");
  });

  it("asks before discarding edits and leaves the modal open when cancelled", async () => {
    const view = mountView();
    await flushPromises();
    await view.get('[aria-label="Editar concierto Apertura, Cabeza de cartel"]').trigger("click");
    await flushPromises();
    await view.get('[role="dialog"] input[type="date"]').setValue("2026-11-16");
    confirmMock.mockResolvedValueOnce({ isConfirmed: false });
    await view.get('[aria-label="Cerrar edición"]').trigger("click");
    await flushPromises();
    expect(confirmMock).toHaveBeenCalled();
    expect(view.get('[role="dialog"]').exists()).toBe(true);
    confirmMock.mockResolvedValueOnce({ isConfirmed: true });
    await view.get('[aria-label="Cerrar edición"]').trigger("click");
    await flushPromises();
    expect(view.find('[role="dialog"]').exists()).toBe(false);
  });

  it("does not call DELETE when the confirmation dialog is cancelled", async () => {
    const view = mountView();
    await flushPromises();
    await view.get('[aria-label="Eliminar concierto Apertura, Cabeza de cartel"]').trigger("click");
    expect(view.get('[role="alertdialog"]').text()).toContain("15 de noviembre de 2026");
    await view.get('[role="alertdialog"] button').trigger("click");
    expect(api.delete).not.toHaveBeenCalled();
    expect(view.find('[role="alertdialog"]').exists()).toBe(false);
  });

  it("confirms deletion once, retries errors in place and retains the dialog", async () => {
    const view = mountView();
    await flushPromises();
    await view.get('[aria-label="Eliminar concierto Apertura, Cabeza de cartel"]').trigger("click");
    vi.mocked(api.delete).mockRejectedValueOnce(new Error("conflict"));
    await view.get('[role="alertdialog"] footer button:last-child').trigger("click");
    await flushPromises();
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(view.get('[role="alertdialog"]').text()).toContain("puedes reintentar");
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { affected: 1 } } as never);
    await view.get('[role="alertdialog"] footer button:last-child').trigger("click");
    await flushPromises();
    expect(api.delete).toHaveBeenCalledTimes(2);
    expect(view.find('[role="alertdialog"]').exists()).toBe(false);
    expect(successMock).toHaveBeenCalledWith("Evento eliminado correctamente.");
  });

  it("prevents duplicate DELETE requests while the confirmed operation is pending", async () => {
    let finishDelete!: (value: { data: { affected: number } }) => void;
    vi.mocked(api.delete).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishDelete = resolve;
        }) as never
    );
    const view = mountView();
    await flushPromises();
    await view.get('[aria-label="Eliminar concierto Apertura, Cabeza de cartel"]').trigger("click");
    const confirmDelete = view.get('[role="alertdialog"] footer button:last-child');
    await confirmDelete.trigger("click");
    await flushPromises();
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(
      view.get('[role="alertdialog"] footer button:last-child').attributes("disabled")
    ).toBeDefined();
    finishDelete({ data: { affected: 1 } });
    await flushPromises();
    expect(api.delete).toHaveBeenCalledTimes(1);
  });

  it("moves back from an emptied last page after deletion and keeps the date filter", async () => {
    let removed = false;
    vi.mocked(api.get).mockImplementation(async (url, config) => {
      if (url !== "/events") return { data: editableEvent() } as never;
      const params = config?.params as {
        type: "concert" | "festival";
        offset: number;
        dateFrom?: string;
      };
      if (params.offset === 20 && !removed) {
        return {
          data: {
            totalItems: 21,
            totalPages: 2,
            currentPage: 2,
            limit: 20,
            data: [listedEvent("concert", "concert-2")],
          },
        } as never;
      }
      if (params.offset === 20 && removed) {
        return {
          data: { totalItems: 20, totalPages: 1, currentPage: 2, limit: 20, data: [] },
        } as never;
      }
      if (params.offset === 0 && !removed) {
        return {
          data: {
            totalItems: 21,
            totalPages: 2,
            currentPage: 1,
            limit: 20,
            data: [listedEvent("concert", "concert-1")],
          },
        } as never;
      }
      return {
        data: {
          totalItems: 20,
          totalPages: 1,
          currentPage: 1,
          limit: 20,
          data: [listedEvent("concert", "concert-1")],
        },
      } as never;
    });
    vi.mocked(api.delete).mockImplementationOnce(async () => {
      removed = true;
      return { data: { affected: 1 } } as never;
    });
    const view = mountView();
    await flushPromises();
    await view.get("#concerts-date-from").setValue("2026-11-01");
    await flushPromises();
    await view.get('[aria-label="Paginación de eventos"] button:last-child').trigger("click");
    await flushPromises();
    await view.get('[aria-label="Eliminar concierto Apertura, Cabeza de cartel"]').trigger("click");
    await view.get('[role="alertdialog"] footer button:last-child').trigger("click");
    await flushPromises();
    const eventRequests = vi
      .mocked(api.get)
      .mock.calls.filter(([url]) => url === "/events")
      .map(([, config]) => config?.params as { offset: number; dateFrom?: string });
    expect(
      eventRequests.some((params) => params.offset === 20 && params.dateFrom === "2026-11-01")
    ).toBe(true);
    expect(eventRequests.at(-1)).toMatchObject({ offset: 0, dateFrom: "2026-11-01" });
    expect(view.find("table").exists()).toBe(true);
    expect(view.get("#concerts-date-from").element).toHaveProperty("value", "2026-11-01");
  });

  it("resolves a new lineup row to an existing catalog artist before saving", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        results: [
          {
            index: 0,
            name: "Nuevo artista",
            status: "existing",
            artist: { id: "artist-3", name: "Nuevo artista" },
            candidates: [],
          },
        ],
      },
    } as never);
    const view = mountView();
    await flushPromises();
    await view.get('[aria-label="Editar concierto Apertura, Cabeza de cartel"]').trigger("click");
    await flushPromises();
    await view
      .findAll('[role="dialog"] button')
      .find((button) => button.text() === "Añadir artista")
      ?.trigger("click");
    const rowInputs = view.findAll('[role="dialog"] li input');
    const newArtistInput = rowInputs.at(-1);
    await newArtistInput?.setValue("Nuevo artista");
    await view.get('[role="dialog"] li:last-child button').trigger("click");
    await flushPromises();
    await view.get('[role="dialog"] form').trigger("submit");
    await flushPromises();
    expect(api.post).toHaveBeenCalledWith(
      "/artists/resolve-batch",
      { names: ["Nuevo artista"] },
      expect.anything()
    );
    expect(api.patch).toHaveBeenCalledWith(
      "/events/concert-1",
      expect.objectContaining({
        lineup: expect.arrayContaining([
          expect.objectContaining({ artistId: "artist-3", name: "Nuevo artista" }),
        ]),
      })
    );
  });

  it("does not create a missing artist and blocks saving until an existing artist is selected", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        results: [{ index: 0, name: "Sin registrar", status: "new", artist: null, candidates: [] }],
      },
    } as never);
    const view = mountView();
    await flushPromises();
    await view.get('[aria-label="Editar concierto Apertura, Cabeza de cartel"]').trigger("click");
    await flushPromises();
    await view
      .findAll('[role="dialog"] button')
      .find((button) => button.text() === "Añadir artista")
      ?.trigger("click");
    await view.findAll('[role="dialog"] li input').at(-1)?.setValue("Sin registrar");
    await view.get('[role="dialog"] li:last-child button').trigger("click");
    await flushPromises();
    await view.get('[role="dialog"] form').trigger("submit");
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.patch).not.toHaveBeenCalled();
    expect(view.get('[role="dialog"] [role="status"]').text()).toContain(
      "No se encontró un artista existente"
    );
  });

  it("hides write actions from users without the riffvalley role", async () => {
    const auth = useAuthStore();
    auth.role = "user";
    const view = mountView();
    await flushPromises();
    expect(view.find('[aria-label^="Editar concierto"]').exists()).toBe(false);
    expect(view.find('[aria-label^="Eliminar concierto"]').exists()).toBe(false);
  });
});
