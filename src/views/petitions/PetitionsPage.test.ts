// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PetitionsPage from "./PetitionsPage.vue";
import SwalService from "@services/swal/SwalService";
import { getAllRequests, updateRequest } from "@services/requests/requests";

const mocks = vi.hoisted(() => ({
  getAllRequests: vi.fn(),
  updateRequest: vi.fn(),
  setPendingCount: vi.fn(),
}));

vi.mock("@services/requests/requests", async (importOriginal) => ({
  ...await importOriginal<typeof import("@services/requests/requests")>(),
  getAllRequests: mocks.getAllRequests,
  updateRequest: mocks.updateRequest,
}));

vi.mock("@stores/catalog/catalog", () => ({
  useCatalogStore: () => ({
    genres: [{ id: "genre-1", name: "Rock" }],
    countries: [{ id: "country-1", name: "Spain" }],
  }),
}));

vi.mock("@stores/petitions/petitions", () => ({
  usePetitionsStore: () => ({ setPendingCount: mocks.setPendingCount }),
}));

vi.mock("@services/swal/SwalService", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const SearchableSelectStub = defineComponent({
  name: "SearchableSelect",
  props: { modelValue: { type: String, default: "" } },
  emits: ["update:modelValue"],
  setup(_props, { emit }) {
    return () => h("button", {
      type: "button",
      "data-testid": "clear-selection",
      onClick: () => emit("update:modelValue", ""),
    }, "clear");
  },
});

const request = {
  id: "request-1",
  artistName: "Band",
  discName: "Record",
  releaseDate: "2025-04-02T00:00:00.000Z",
  ep: false,
  debut: false,
  status: "pending" as const,
  adminNotes: null,
  createdAt: "2025-04-03T00:00:00.000Z",
  user: { id: "user-1", username: "tester" },
  genre: { id: "genre-1", name: "Rock" },
  country: { id: "country-1", name: "Spain" },
};

async function mountPage() {
  const wrapper = mount(PetitionsPage, {
    global: { stubs: { SearchableSelect: SearchableSelectStub } },
  });
  await flushPromises();
  await wrapper.get('button[title="Editar"]').trigger("click");
  return wrapper;
}

describe("PetitionsPage Requests payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllRequests.mockResolvedValue([{ ...request }]);
    mocks.updateRequest.mockImplementation(async (_id, dto) => ({ ...request, ...dto }));
  });

  it("omits an unchanged releaseDate when saving an edit", async () => {
    const wrapper = await mountPage();

    await wrapper.findAll("button").find((button) => button.text().includes("Guardar"))?.trigger("click");
    await flushPromises();

    expect(updateRequest).toHaveBeenCalledWith("request-1", {});

    wrapper.unmount();
  });

  it("sends null when clearing the date, genre, and country", async () => {
    const wrapper = await mountPage();
    await wrapper.get('input[type="date"]').setValue("");
    for (const select of wrapper.findAllComponents(SearchableSelectStub)) {
      select.vm.$emit("update:modelValue", "");
    }
    await wrapper.findAll("button").find((button) => button.text().includes("Guardar"))?.trigger("click");
    await flushPromises();

    expect(updateRequest).toHaveBeenCalledWith("request-1", {
      releaseDate: null,
      genreId: null,
      countryId: null,
    });

    wrapper.unmount();
  });

  it("normalizes HTTP 404 array messages before showing the error", async () => {
    mocks.updateRequest.mockRejectedValueOnce({
      response: { status: 404, data: { message: ["Genre not found", "Country not found"] } },
    });
    const wrapper = await mountPage();
    await wrapper.get('textarea[placeholder="Correcciones realizadas..."]').setValue("Changed");
    await wrapper.findAll("button").find((button) => button.text().includes("Guardar"))?.trigger("click");
    await flushPromises();

    expect(SwalService.error).toHaveBeenCalledWith("Genre not found. Country not found");

    wrapper.unmount();
  });
});
