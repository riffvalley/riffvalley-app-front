// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchManualData, getCatalogImportGlobalErrorMessage, updateDiscFromSpotify } = vi.hoisted(
  () => ({
    fetchManualData: vi.fn(),
    getCatalogImportGlobalErrorMessage: vi.fn(() => "No se pudo completar la importación."),
    updateDiscFromSpotify: vi.fn(),
  })
);

vi.mock("@services/imports/imports", () => ({
  fetchManualData,
  getCatalogImportGlobalErrorMessage,
}));
vi.mock("@stores/catalog/catalog", () => ({
  useCatalogStore: () => ({
    genres: [{ id: "genre-rock", name: "Rock" }],
    countries: [{ id: "country-es", name: "España" }],
    fetchCatalog: vi.fn(),
  }),
}));
vi.mock("@services/spotify/updateDiscFromSpotify", () => ({ updateDiscFromSpotify }));

import CreateDiscModal from "./CreateDiscModal.vue";

const importedResult = {
  inputIndex: 0,
  source: { kind: "manual" as const },
  status: "imported" as const,
  artistId: "artist-new",
  artistName: "New Artist",
  discId: "disc-new",
  discName: "New Album",
  message: "Disco añadido correctamente.",
};
const createdDisc = {
  id: "disc-new",
  discId: "disc-new",
  discName: "New Album",
  artistName: "New Artist",
};

const SearchableSelectStub = defineComponent({
  props: {
    modelValue: { type: String, default: "" },
    options: { type: Array, default: () => [] },
    triggerPlaceholder: { type: String, default: "" },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h(
        "select",
        {
          value: props.modelValue,
          onChange: (event: Event) =>
            emit("update:modelValue", (event.target as HTMLSelectElement).value),
        },
        [
          h("option", { value: "" }, props.triggerPlaceholder),
          ...(props.options as Array<{ id: string; name: string }>).map((option) =>
            h("option", { value: option.id }, option.name)
          ),
        ]
      );
  },
});

function mountModal() {
  return mount(CreateDiscModal, { global: { stubs: { SearchableSelect: SearchableSelectStub } } });
}

function buttonWithText(wrapper: ReturnType<typeof mountModal>, text: string) {
  const button = wrapper.findAll("button").find((item) => item.text().includes(text));
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

async function completeForm(wrapper: ReturnType<typeof mountModal>) {
  await wrapper.get("#create-disc-date").setValue("2026-10-01");
  await wrapper.get("#create-disc-line").setValue("New Artist – New Album");
}

async function submitForm(wrapper: ReturnType<typeof mountModal>) {
  await wrapper.get("form").trigger("submit");
  await flushPromises();
}

async function clickSpotify(wrapper: ReturnType<typeof mountModal>) {
  await buttonWithText(wrapper, "Buscar en Spotify").trigger("click");
  await flushPromises();
}

describe("CreateDiscModal", () => {
  beforeEach(() => {
    fetchManualData.mockReset().mockResolvedValue({ data: { results: [importedResult] } });
    updateDiscFromSpotify.mockReset().mockResolvedValue(true);
  });

  it("adds one album with the import confirmation and keeps the modal open for Spotify", async () => {
    const wrapper = mountModal();
    await completeForm(wrapper);
    await submitForm(wrapper);

    expect(fetchManualData).toHaveBeenCalledTimes(1);
    expect(fetchManualData).toHaveBeenCalledWith("October 1, 2026", [
      { line: "New Artist – New Album" },
    ]);
    expect(wrapper.text()).toContain("Álbum añadido: New Artist — New Album");
    expect(wrapper.text()).toContain("disc-new");
    expect(wrapper.get('[role="dialog"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Buscar en Spotify");
    expect(wrapper.emitted("close")).toBeUndefined();
    wrapper.unmount();
  });

  it("passes date and all optional import fields for the single album", async () => {
    const wrapper = mountModal();
    await completeForm(wrapper);
    const selects = wrapper.findAll("select");
    await selects[0].setValue("genre-rock");
    await selects[1].setValue("country-es");
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true);
    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true);
    await submitForm(wrapper);

    expect(fetchManualData).toHaveBeenCalledWith("October 1, 2026", [
      {
        line: "New Artist – New Album",
        genreId: "genre-rock",
        countryId: "country-es",
        ep: true,
        debut: true,
      },
    ]);
    wrapper.unmount();
  });

  it("reuses the existing Spotify action and does not submit the album a second time", async () => {
    const wrapper = mountModal();
    await completeForm(wrapper);
    await submitForm(wrapper);
    await clickSpotify(wrapper);

    expect(updateDiscFromSpotify).toHaveBeenCalledWith("disc-new", "New Album", "New Artist");
    expect(fetchManualData).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Se encontraron y guardaron los datos de Spotify.");
    expect(wrapper.text()).toContain("Cerrar");
    wrapper.unmount();
  });

  it("preserves entered values when the import fails", async () => {
    fetchManualData.mockRejectedValueOnce({
      response: { data: { message: "Error del servidor" } },
    });
    const wrapper = mountModal();
    await completeForm(wrapper);
    await submitForm(wrapper);

    expect(wrapper.get("#create-disc-line").element).toHaveProperty(
      "value",
      "New Artist – New Album"
    );
    expect(wrapper.text()).toContain("No se pudo completar la importación.");
    expect(wrapper.get('[role="dialog"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("keeps the album added and lets the user close after a Spotify error", async () => {
    updateDiscFromSpotify.mockRejectedValueOnce(new Error("Spotify unavailable"));
    const wrapper = mountModal();
    await completeForm(wrapper);
    await submitForm(wrapper);
    await clickSpotify(wrapper);

    expect(wrapper.text()).toContain("El disco sigue creado y puedes cerrar este modal.");
    expect(fetchManualData).toHaveBeenCalledTimes(1);
    await buttonWithText(wrapper, "Cerrar").trigger("click");
    expect(wrapper.emitted("close")?.[0]).toEqual([{ createdDisc }]);
    wrapper.unmount();
  });

  it("does not add a duplicate result a second time", async () => {
    fetchManualData.mockResolvedValueOnce({
      data: {
        results: [{ ...importedResult, status: "duplicate", message: "El disco ya existe." }],
      },
    });
    const wrapper = mountModal();
    await completeForm(wrapper);
    await submitForm(wrapper);

    expect(wrapper.text()).toContain("El disco ya existe y se ha omitido; no se ha creado otro.");
    expect(wrapper.text()).not.toContain("Buscar en Spotify");
    expect(wrapper.get("#create-disc-line").element).toHaveProperty(
      "value",
      "New Artist – New Album"
    );
    wrapper.unmount();
  });

  it("closes after a successful single-album import and emits its backend ID", async () => {
    const wrapper = mountModal();
    await completeForm(wrapper);
    await submitForm(wrapper);
    await buttonWithText(wrapper, "Cerrar").trigger("click");

    expect(wrapper.emitted("close")?.[0]).toEqual([{ createdDisc }]);
    wrapper.unmount();
  });
});
