// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import LineupCell from "./LineupCell.vue";

describe("LineupCell candidate selection", () => {
  it("shows real ambiguous Artist candidates and emits an explicit UUID selection", async () => {
    const wrapper = mount(LineupCell, {
      props: {
        rowId: "row-stable-key",
        rowNumber: 3,
        items: [{ key: "lineup-occurrence-a", name: "Artist text", artistId: null }],
        state: {
          draft: "",
          draftStatus: "idle",
          itemStatus: {},
          draftError: null,
          itemResolution: {
            "lineup-occurrence-a": {
              index: 0,
              name: "Artist text",
              status: "ambiguous",
              code: "ARTIST_AMBIGUOUS",
              artist: null,
              candidates: [
                { id: "artist-a", name: "Artist A" },
                { id: "artist-b", name: "Artist B" },
              ],
            },
          },
        },
      },
    });

    const selector = wrapper.get<HTMLSelectElement>(
      'select[aria-label="Candidato de artista Artist text, fila 3"]'
    );
    expect(selector.element.value).toBe("");
    expect(selector.text()).toContain("Artist A · artist-a");
    await selector.setValue("artist-b");
    expect(wrapper.emitted("selectArtist")).toEqual([
      ["row-stable-key", "lineup-occurrence-a", "artist-b"],
    ]);
  });
});
