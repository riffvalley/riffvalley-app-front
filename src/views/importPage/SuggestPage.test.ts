// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SuggestPage from "./SuggestPage.vue";
import SwalService from "@services/swal/SwalService";
import { createRequest, getMyRequests } from "@services/requests/requests";

const mocks = vi.hoisted(() => ({
  createRequest: vi.fn(),
  getMyRequests: vi.fn(),
}));

vi.mock("@services/requests/requests", async (importOriginal) => ({
  ...await importOriginal<typeof import("@services/requests/requests")>(),
  createRequest: mocks.createRequest,
  getMyRequests: mocks.getMyRequests,
}));

vi.mock("@stores/catalog/catalog", () => ({
  useCatalogStore: () => ({
    genres: [{ id: "genre-1", name: "Rock" }],
    countries: [{ id: "country-1", name: "Spain" }],
  }),
}));

vi.mock("@services/swal/SwalService", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const SearchableSelectStub = defineComponent({
  name: "SearchableSelect",
  props: {
    modelValue: { type: String, default: "" },
    allLabel: { type: String, default: "" },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () => h("div", [
      h("button", {
        type: "button",
        "data-testid": "select-option",
        onClick: () => emit(
          "update:modelValue",
          props.allLabel === "Sin género" ? "genre-1" : "country-1",
        ),
      }, "select"),
      h("button", {
        type: "button",
        "data-testid": "clear-selection",
        onClick: () => emit("update:modelValue", ""),
      }, "clear"),
    ]);
  },
});

describe("SuggestPage Requests payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createRequest.mockResolvedValue({ id: "request-new" });
    mocks.getMyRequests.mockResolvedValue([]);
  });

  it("creates with a date-only value and omits empty Catalog references", async () => {
    const wrapper = mount(SuggestPage, {
      global: { stubs: { SearchableSelect: SearchableSelectStub } },
    });
    await flushPromises();

    await wrapper.get('input[placeholder="Ej: Metallica"]').setValue("Band");
    await wrapper.get('input[placeholder="Ej: Master of Puppets"]').setValue("Record");
    await wrapper.get('input[type="date"]').setValue("2025-04-02");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(createRequest).toHaveBeenCalledWith({
      artistName: "Band",
      discName: "Record",
      releaseDate: "2025-04-02",
    });

    wrapper.unmount();
  });

  it("keeps selected Catalog UUIDs in the valid create payload", async () => {
    const wrapper = mount(SuggestPage, {
      global: { stubs: { SearchableSelect: SearchableSelectStub } },
    });
    await flushPromises();

    await wrapper.get('input[placeholder="Ej: Metallica"]').setValue("Band");
    await wrapper.get('input[placeholder="Ej: Master of Puppets"]').setValue("Record");
    await wrapper.get('input[type="date"]').setValue("2025-04-02");
    for (const select of wrapper.findAll('[data-testid="select-option"]')) {
      await select.trigger("click");
    }
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(createRequest).toHaveBeenCalledWith({
      artistName: "Band",
      discName: "Record",
      releaseDate: "2025-04-02",
      genreId: "genre-1",
      countryId: "country-1",
    });

    wrapper.unmount();
  });

  it("passes array messages from HTTP 400 errors to Swal as one string", async () => {
    mocks.createRequest.mockRejectedValueOnce({
      response: { status: 400, data: { message: ["Invalid date", "Date is required"] } },
    });
    const wrapper = mount(SuggestPage, {
      global: { stubs: { SearchableSelect: SearchableSelectStub } },
    });
    await flushPromises();

    await wrapper.get('input[placeholder="Ej: Metallica"]').setValue("Band");
    await wrapper.get('input[placeholder="Ej: Master of Puppets"]').setValue("Record");
    await wrapper.get('input[type="date"]').setValue("2025-04-02");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(SwalService.error).toHaveBeenCalledWith("Invalid date. Date is required");

    wrapper.unmount();
  });
});
