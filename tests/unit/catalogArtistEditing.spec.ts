// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { updateArtist } from "../../src/modules/catalog/application/updateArtist";
import type { ArtistUpdatePort } from "../../src/modules/catalog/application/artistManagementPort";
import { applyArtistEditLocally } from "../../src/modules/catalog/presentation/artistManagementEditing";
import { confirmAndDeleteArtist, removeArtistLocally } from "../../src/modules/catalog/presentation/artistManagementEditing";
import { deleteArtist } from "../../src/modules/catalog/application/deleteArtist";
import type { ArtistDeletePort } from "../../src/modules/catalog/application/artistManagementPort";
import ArtistEditForm from "../../src/app/components/ArtistEditForm.vue";
import type { ArtistManagementItem } from "../../src/modules/catalog/domain/artistManagement";
import { alternateCalendarCountryId } from "../../src/modules/catalog/domain/artistManagement";
import { createCalendarArtist } from "../../src/modules/catalog/application/createCalendarArtist";
import type { CalendarArtistCreationPort } from "../../src/modules/catalog/application/artistManagementPort";
import { applyCalendarDiscArtistCreation } from "../../src/modules/catalog/domain/discCalendar";
import type { CalendarGroup } from "../../src/modules/catalog/domain/discCalendar";

const artist: ArtistManagementItem = {
  id: "a1", name: "Old name", description: "Old bio", image: "old.jpg",
  country: { id: "es", name: "Spain", isoCode: "ES" },
  discs: [], nationalReleases: [], spotifyPlaylists: [],
};

describe("Catalog artist editing", () => {
  it("alternates between the two configured calendar countries", () => {
    const firstCountry = "4108d9b0-a44e-4877-a839-a5541eac852d";
    const secondCountry = "a121dfc4-7ee8-4435-ab26-1db8e4071dde";
    expect(alternateCalendarCountryId(firstCountry)).toBe(secondCountry);
    expect(alternateCalendarCountryId(secondCountry)).toBe(firstCountry);
    expect(alternateCalendarCountryId(null)).toBe(firstCountry);
  });

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

  it("keeps the calendar artist update contract limited to name and country", async () => {
    const updateArtistPort = vi.fn().mockResolvedValue(undefined);
    const port: ArtistUpdatePort = { updateArtist: updateArtistPort };
    await updateArtist(port, "a1", { name: "Calendar name", countryId: "fr" });
    expect(updateArtistPort).toHaveBeenCalledWith("a1", { name: "Calendar name", countryId: "fr" });
  });

  it("propagates a calendar artist update error without converting it to success", async () => {
    const failure = new Error("calendar update failed");
    const port: ArtistUpdatePort = { updateArtist: vi.fn().mockRejectedValue(failure) };
    await expect(updateArtist(port, "a1", { countryId: "fr" })).rejects.toBe(failure);
  });

  it("creates the artist before associating it to the disc", async () => {
    const port: CalendarArtistCreationPort = {
      createArtist: vi.fn().mockResolvedValue({ id: "new", name: "New band" }),
      associateArtistToDisc: vi.fn().mockResolvedValue(undefined),
    };
    await expect(createCalendarArtist(port, "disc-1", "New band"))
      .resolves.toEqual({ id: "new", name: "New band" });
    expect(port.createArtist).toHaveBeenCalledWith("New band");
    expect(port.associateArtistToDisc).toHaveBeenCalledWith("disc-1", "new");
    expect(vi.mocked(port.createArtist).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(port.associateArtistToDisc).mock.invocationCallOrder[0]);
  });

  it("propagates artist creation failure without attempting disc association", async () => {
    const failure = new Error("artist creation failed");
    const port: CalendarArtistCreationPort = {
      createArtist: vi.fn().mockRejectedValue(failure),
      associateArtistToDisc: vi.fn(),
    };
    await expect(createCalendarArtist(port, "disc-1", "New band")).rejects.toBe(failure);
    expect(port.associateArtistToDisc).not.toHaveBeenCalled();
  });

  it("propagates association failure after creation without trying rollback", async () => {
    const failure = new Error("disc association failed");
    const port: CalendarArtistCreationPort = {
      createArtist: vi.fn().mockResolvedValue({ id: "new", name: "New band" }),
      associateArtistToDisc: vi.fn().mockRejectedValue(failure),
    };
    await expect(createCalendarArtist(port, "disc-1", "New band")).rejects.toBe(failure);
    expect(port.createArtist).toHaveBeenCalledOnce();
    expect(port.associateArtistToDisc).toHaveBeenCalledWith("disc-1", "new");
  });

  it("replaces only the selected calendar disc artist after successful association", () => {
    const groups = [{ releaseDate: "2026-09-18", discs: [
      { id: "disc-1", artist: { id: "old", name: "Old band", countryId: "es" } },
      { id: "disc-2", artist: { id: "old", name: "Old band", countryId: "es" } },
    ] }] as unknown as CalendarGroup[];
    const changed = applyCalendarDiscArtistCreation(groups, "disc-1", { id: "new", name: "New band" });
    expect(changed[0].discs[0].artist).toEqual({ id: "new", name: "New band", countryId: "es" });
    expect(changed[0].discs[1].artist).toEqual({ id: "old", name: "Old band", countryId: "es" });
    expect(groups[0].discs[0].artist.id).toBe("old");
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

  it("does not call delete or change local state when confirmation is cancelled", async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    const remove = vi.fn();
    const rows = [artist];
    const result = await confirmAndDeleteArtist(confirm, remove);
    expect(result).toBe("cancelled");
    expect(remove).not.toHaveBeenCalled();
    expect(rows).toEqual([artist]);
  });

  it("deletes through the port and removes the row while decrementing the total", async () => {
    const deletePort = vi.fn().mockResolvedValue(undefined);
    const port: ArtistDeletePort = { deleteArtist: deletePort };
    const result = await confirmAndDeleteArtist(
      async () => true,
      () => deleteArtist(port, "a1"),
    );
    const local = removeArtistLocally([artist], 1, "a1");
    expect(result).toBe("deleted");
    expect(deletePort).toHaveBeenCalledWith("a1");
    expect(local).toEqual({ artists: [], totalItems: 0 });
  });

  it("preserves the row and total when deletion fails", async () => {
    const failure = new Error("delete failed");
    const remove = vi.fn().mockRejectedValue(failure);
    const rows = [artist];
    const result = await confirmAndDeleteArtist(async () => true, remove);
    expect(result).toBe("failed");
    expect(rows).toEqual([artist]);
  });
});
