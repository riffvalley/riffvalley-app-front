// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventsFestivalsImportView from "./EventsFestivalsImportView.vue";

const { resolveArtistsBatchMock, searchVenueNamesMock } = vi.hoisted(() => ({
  resolveArtistsBatchMock: vi.fn(),
  searchVenueNamesMock: vi.fn(),
}));
vi.mock("../../api/artistResolution", () => ({ resolveArtistsBatch: resolveArtistsBatchMock }));
vi.mock("@/modules/venues", () => ({ searchVenueNames: searchVenueNamesMock }));

async function paste(input: HTMLInputElement, text: string) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => text } });
  input.dispatchEvent(event);
  await nextTick();
}

describe("EventsFestivalsImportView", () => {
  beforeEach(() => {
    resolveArtistsBatchMock.mockReset().mockImplementation(async (names: string[]) =>
      names.map((name) => ({
        name,
        artist:
          name === "Banda Desconocida" ? null : { id: `id-${name}`, name: `${name} Canonical` },
      }))
    );
    searchVenueNamesMock.mockReset().mockResolvedValue([]);
  });

  it("renders the requested editable columns in order", () => {
    const wrapper = mount(EventsFestivalsImportView);
    const headers = wrapper.findAll("th[scope='col']").map((header) => header.text());

    expect(wrapper.get("h1").text()).toBe("Importador de conciertos y festivales");
    expect(headers.slice(1, 11)).toEqual([
      "Type",
      "Event",
      "Lineup",
      "Start Date",
      "End Date (opcional)",
      "Venue",
      "Price (opcional)",
      "Other Info (opcional)",
      "City",
      "Province (opcional)",
    ]);
    expect(headers).not.toContain("Artista / Evento");
    expect(headers).not.toContain("Festival Lineup");
    expect(wrapper.findAll("tbody input")).toHaveLength(45);
    expect(wrapper.findAll("tbody select")).toHaveLength(5);
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 1"]').element.value).toBe(
      "concert"
    );
    expect(wrapper.get('select[aria-label="Type, fila 1"]').text()).toContain("Concierto");
    expect(wrapper.get('select[aria-label="Type, fila 1"]').text()).toContain("Festival");
  });

  it("changes Type independently per row and retains it while editing other cells", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const firstType = wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 1"]');
    const secondType = wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 2"]');

    await firstType.setValue("festival");
    await wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').setValue("Festival A");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]')
      .setValue("25€");

    expect(firstType.element.value).toBe("festival");
    expect(secondType.element.value).toBe("concert");
    expect(wrapper.get('select[aria-label="Type, fila 1"]').element.value).toBe("festival");
  });

  it("pastes valid Type values case-insensitively, warns on invalid values, and preserves rows and fields", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const firstType = wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 1"]');
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Event, fila 1"]')
      .setValue("Evento previo");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Event, fila 2"]')
      .setValue("Otro evento");
    await wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').setValue("Madrid");
    await wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 3"]').setValue("festival");

    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => "Concierto\nFestIval\nINVALID\nconcert\nFESTIVAL\nFestival" },
    });
    firstType.element.dispatchEvent(event);
    await nextTick();

    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 1"]').element.value).toBe(
      "concert"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 2"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 3"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get('select[aria-label="Type, fila 3"]').attributes("aria-invalid")).toBe(
      "true"
    );
    expect(wrapper.text()).toContain("Tipo inválido «INVALID»");
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 4"]').element.value).toBe(
      "concert"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 5"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 6"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').element.value).toBe(
      "Evento previo"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').element.value).toBe(
      "Madrid"
    );
  });

  it("edits Price and Other Info independently as optional free text", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const price = wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]');
    const otherInfo = wrapper.get<HTMLInputElement>(
      'input[aria-label="Other Info, fila 1 (opcional)"]'
    );

    expect(price.element.value).toBe("");
    expect(otherInfo.element.value).toBe("");
    await price.setValue("20€ anticipada / 25€ taquilla");
    await otherInfo.setValue("Apertura de puertas 19:30; entrada por la calle lateral");
    await price.setValue("");

    expect(price.element.value).toBe("");
    expect(otherInfo.element.value).toBe("Apertura de puertas 19:30; entrada por la calle lateral");
    expect(price.attributes("required")).toBeUndefined();
    expect(otherInfo.attributes("required")).toBeUndefined();
  });

  it("pastes Price and Other Info ranges across rows, retaining blank cells and other columns", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const price = wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]');
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]')
      .setValue("old price");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Other Info, fila 1 (opcional)"]')
      .setValue("old info");
    await wrapper.get<HTMLInputElement>('input[aria-label="City, fila 2"]').setValue("Santander");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Province, fila 3"]')
      .setValue("Cantabria");

    await paste(price.element, "Desde 49,50€\tApertura 18:00\n\tSolo mayores de edad\nGratis\t");

    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]').element.value
    ).toBe("Desde 49,50€");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 1 (opcional)"]').element
        .value
    ).toBe("Apertura 18:00");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 2 (opcional)"]').element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 2 (opcional)"]').element
        .value
    ).toBe("Solo mayores de edad");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 3 (opcional)"]').element.value
    ).toBe("Gratis");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 3 (opcional)"]').element
        .value
    ).toBe("");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="City, fila 2"]').element.value).toBe(
      "Santander"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Province, fila 3"]').element.value
    ).toBe("Cantabria");
  });

  it("pastes multiple Other Info rows without touching Price or later columns", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const otherInfo = wrapper.get<HTMLInputElement>(
      'input[aria-label="Other Info, fila 5 (opcional)"]'
    );
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Price, fila 5 (opcional)"]')
      .setValue("35€");
    await wrapper.get<HTMLInputElement>('input[aria-label="City, fila 5"]').setValue("Bilbao");

    await paste(otherInfo.element, "Acceso por puerta norte\n\nAforo limitado\nÚltima fila");

    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 5 (opcional)"]').element
        .value
    ).toBe("Acceso por puerta norte");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 6 (opcional)"]').element
        .value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 7 (opcional)"]').element
        .value
    ).toBe("Aforo limitado");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 8 (opcional)"]').element
        .value
    ).toBe("Última fila");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 5 (opcional)"]').element.value
    ).toBe("35€");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="City, fila 5"]').element.value).toBe(
      "Bilbao"
    );
  });

  it("edits and normalizes a date, allows an optional end date, and validates date order", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 1"]');
    const end = wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 1 (opcional)"]');

    expect(end.element.value).toBe("");
    await start.setValue("3/2/2026");
    expect(start.element.value).toBe("03/02/2026");
    await end.setValue("02/02/2026");
    expect(wrapper.text()).toContain("End Date no puede ser anterior a Start Date.");
    await end.setValue("3/2/2026");
    expect(end.element.value).toBe("03/02/2026");
    expect(wrapper.text()).not.toContain("End Date no puede ser anterior a Start Date.");
    await end.setValue("");
    expect(end.element.value).toBe("");
  });

  it("keeps invalid date text editable and shows a cell error", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 1"]');
    await start.setValue("29/02/2026");
    expect(start.element.value).toBe("29/02/2026");
    expect(start.attributes("aria-invalid")).toBe("true");
    expect(wrapper.text()).toContain("Usa una fecha válida en formato DD/MM/YYYY.");
  });

  it("pastes one date and a two-column multirow range, preserving blanks and other data", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 1"]');
    await wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').setValue("Fila uno");
    await wrapper.get<HTMLInputElement>('input[aria-label="Venue, fila 1"]').setValue("Sala uno");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Start Date, fila 4"]')
      .setValue("01/10/2026");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="End Date, fila 4 (opcional)"]')
      .setValue("02/10/2026");
    await paste(start.element, "3/2/2026");
    expect(start.element.value).toBe("03/02/2026");

    await paste(start.element, "3/2/2026\t\n12/6/2026\t14/6/2026\n25/9/2026\t26/9/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 1"]').element.value
    ).toBe("03/02/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 1 (opcional)"]').element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 2"]').element.value
    ).toBe("12/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 2 (opcional)"]').element.value
    ).toBe("14/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 3"]').element.value
    ).toBe("25/09/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 3 (opcional)"]').element.value
    ).toBe("26/09/2026");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').element.value).toBe(
      "Fila uno"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Venue, fila 1"]').element.value).toBe(
      "Sala uno"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 4"]').element.value
    ).toBe("01/10/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 4 (opcional)"]').element.value
    ).toBe("02/10/2026");
  });

  it("adds rows when a pasted date range extends beyond the existing table", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const startRow5 = wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 5"]');
    await paste(startRow5.element, "3/2/2026\t4/2/2026\n5/2/2026\t6/2/2026");

    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 6"]').element.value
    ).toBe("05/02/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 6 (opcional)"]').element.value
    ).toBe("06/02/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 5"]').element.value
    ).toBe("03/02/2026");
  });

  it("pastes a single column only into its starting date field and leaves later rows untouched", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const endRow2 = wrapper.get<HTMLInputElement>(
      'input[aria-label="End Date, fila 2 (opcional)"]'
    );
    await paste(endRow2.element, "12/6/2026\n14/6/2026");
    expect(endRow2.element.value).toBe("12/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 2"]').element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 3 (opcional)"]').element.value
    ).toBe("14/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 4"]').element.value
    ).toBe("");
  });

  it("edits and pastes Venue, City and Province independently and resolves the canonical venue", async () => {
    searchVenueNamesMock.mockResolvedValue([
      {
        id: "venue-1",
        name: "Sala Apolo",
        locality: {
          id: "locality-1",
          name: "Barcelona",
          province: "Barcelona",
          administrativeRegion: {
            id: "region-1",
            name: "Cataluña",
            country: { id: "country-1", name: "España" },
          },
        },
      },
    ]);
    const wrapper = mount(EventsFestivalsImportView);
    const venueInput = wrapper.get<HTMLInputElement>('input[aria-label="Venue, fila 1"]');
    await venueInput.setValue("Sala Apolo");
    await venueInput.trigger("blur");
    await flushPromises();

    expect(searchVenueNamesMock).toHaveBeenCalledWith("Sala Apolo");
    expect(wrapper.find('button[aria-label="Editar Sala Apolo, Venue fila 1"]').exists()).toBe(
      true
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').element.value).toBe(
      "Barcelona"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Province, fila 1"]').element.value
    ).toBe("Barcelona");

    await wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').setValue("Girona");
    await wrapper.get<HTMLInputElement>('input[aria-label="Province, fila 1"]').setValue("Girona");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').element.value).toBe(
      "Girona"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Province, fila 1"]').element.value
    ).toBe("Girona");
  });

  it("edits Event and Lineup independently and allows Event to stay empty", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const firstEvent = wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]');
    const firstLineup = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup, fila 1"]'
    );

    await firstEvent.setValue("Resurrection Fest 2027");
    await firstLineup.setValue("Electric Callboy + Bury Tomorrow + Wargasm");
    await firstEvent.setValue("");

    expect(firstEvent.element.value).toBe("");
    expect(firstEvent.attributes("required")).toBeUndefined();
    expect(firstLineup.element.value).toBe("Electric Callboy + Bury Tomorrow + Wargasm");
  });

  it("adds blank rows and deletes one without losing other rows", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Event, fila 1"]')
      .setValue("Gira XX Aniversario");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Añadir artistas a Lineup, fila 1"]')
      .setValue("Machine Head");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]')
      .setValue("35€");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Other Info, fila 1 (opcional)"]')
      .setValue("Anticipada online");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Event, fila 2"]')
      .setValue("Download Festival Madrid");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Añadir artistas a Lineup, fila 2"]')
      .setValue("Architects + Spiritbox");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Price, fila 2 (opcional)"]')
      .setValue("Gratis");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Other Info, fila 2 (opcional)"]')
      .setValue("Aforo limitado");
    await wrapper.get("button").trigger("click");

    expect(wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 6"]').element.value).toBe(
      ""
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 6 (opcional)"]').element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Añadir artistas a Lineup, fila 6"]').element
        .value
    ).toBe("");

    await wrapper.get("button[aria-label='Eliminar fila 1']").trigger("click");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').element.value).toBe(
      "Download Festival Madrid"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Añadir artistas a Lineup, fila 1"]').element
        .value
    ).toBe("Architects + Spiritbox");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]').element.value
    ).toBe("Gratis");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 1 (opcional)"]').element
        .value
    ).toBe("Aforo limitado");
  });

  it("renders resolved artists as pills and leaves unknown artists editable", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const lineupInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup, fila 1"]'
    );
    await lineupInput.setValue("Architects + Spiritbox + Banda Desconocida");
    await lineupInput.trigger("blur");
    await flushPromises();

    expect(wrapper.find('button[aria-label="Editar Architects Canonical"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Editar Spiritbox Canonical"]').exists()).toBe(true);
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Artista 3 de Lineup, fila 1"]').element.value
    ).toBe("Banda Desconocida");
    expect(wrapper.text()).toContain("Architects Canonical");
    expect(wrapper.text()).toContain("Spiritbox Canonical");

    const addArtistInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup, fila 1"]'
    );
    await addArtistInput.setValue("Loathe");
    await addArtistInput.trigger("blur");
    await flushPromises();
    expect(wrapper.find('button[aria-label="Editar Loathe Canonical"]').exists()).toBe(true);

    await wrapper.get('button[aria-label="Editar Architects Canonical"]').trigger("click");
    const editArtistInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Artista 1 de Lineup, fila 1"]'
    );
    await editArtistInput.setValue("Altered Band");
    await editArtistInput.trigger("blur");
    await flushPromises();
    expect(wrapper.find('button[aria-label="Editar Altered Band Canonical"]').exists()).toBe(true);

    await wrapper
      .get('button[aria-label="Eliminar Altered Band Canonical de Lineup, fila 1"]')
      .trigger("click");
    expect(wrapper.find('button[aria-label="Editar Altered Band Canonical"]').exists()).toBe(false);
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Artista 2 de Lineup, fila 1"]').element.value
    ).toBe("Banda Desconocida");
  });

  it("allows clearing cells and removing the last rows", async () => {
    const wrapper = mount(EventsFestivalsImportView);
    const eventInput = wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]');
    const lineupInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup, fila 1"]'
    );

    await eventInput.setValue("Texto temporal");
    await lineupInput.setValue("Artista temporal");
    await eventInput.setValue("");
    await lineupInput.setValue("");
    expect(eventInput.element.value).toBe("");
    expect(lineupInput.element.value).toBe("");

    for (let index = 0; index < 5; index += 1) {
      await wrapper.get("button[aria-label='Eliminar fila 1']").trigger("click");
    }
    expect(wrapper.findAll("tbody input")).toHaveLength(0);
    expect(wrapper.text()).toContain("No hay filas");
  });
});
