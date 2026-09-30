// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { updateArtist } from "../../src/modules/catalog/application/updateArtist";
import type { ArtistUpdatePort } from "../../src/modules/catalog/application/artistManagementPort";
import { applyArtistEditLocally } from "../../src/modules/catalog/presentation/artistManagementEditing";
import ArtistEditForm from "../../src/app/components/ArtistEditForm.vue";
import type { ArtistManagementItem } from "../../src/modules/catalog/domain/artistManagement";

const artist: ArtistManagementItem = {
  id: "a1", name: "Old name", description: "Old bio", image: "old.jpg",
  country: { id: "es", name: "Spain", isoCode: "ES" },
  discs: [], nationalReleases: [], spotifyPlaylists: [],
};

describe("Catalog artist editing", () => {
  it("sends optional edit fields without converting empty values into clears", async () => {
    const updateArtistPort = vi.fn().mockResolvedValue(undefined);
    const port: ArtistUpdatePort = { updateArtist: updateArtistPort };
    const data = { name: "New name", countryId: undefined, image: undefined, description: undefined };
    await updateArtist(port, "a1", data);
    expect(updateArtistPort).toHaveBeenCalledWith("a1", data);
  });

  it("propagates update errors so presentation can keep the form open", async () => {
    const error = new Error("failed");
    const port: ArtistUpdatePort = { updateArtist: vi.fn().mockRejectedValue(error) };
    await expect(updateArtist(port, "a1", { name: "New name" })).rejects.toBe(error);
  });

  it("opens the edit fields and emits save/cancel without owning transport", async () => {
    const wrapper = mount(ArtistEditForm, {
      props: {
        name: "Artist", countryId: "es", image: "image.jpg", description: "Bio",
        countries: [{ id: "es", name: "Spain", isoCode: "ES" }], saving: false,
        fetchingImage: false, imageOptions: [],
      },
      global: { stubs: { SearchableSelect: true, Teleport: true } },
    });
    expect(wrapper.text()).toContain("Editar artista");
    expect(wrapper.find('input[type="text"]').element).toHaveProperty("value", "Artist");
    await wrapper.findAll("button").find((button) => button.text().includes("Guardar"))?.trigger("click");
    await wrapper.findAll("button").find((button) => button.text().includes("Cancelar"))?.trigger("click");
    expect(wrapper.emitted("save")).toHaveLength(1);
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("updates visible artist data and removes it from a needsReview result", () => {
    const values = { id: "a1", name: "New name", countryId: "fr", image: "", description: "" };
    const result = applyArtistEditLocally([artist], 1, values, [{ id: "fr", name: "France", isoCode: "FR" }], true);
    expect(result.artists).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(artist).toMatchObject({ name: "New name", image: null, description: null, country: { id: "fr", name: "France", isoCode: "FR" } });
  });

  it("keeps the updated row and total outside a needsReview filter", () => {
    const result = applyArtistEditLocally([artist], 1, { id: "a1", name: "New", countryId: "", image: "", description: "" }, [], null);
    expect(result.artists).toHaveLength(1);
    expect(result.totalItems).toBe(1);
    expect(result.artists[0]).toMatchObject({ name: "New", country: null, image: null, description: null });
  });
});
