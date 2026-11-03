// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it } from "vitest";
import LineupCell from "./LineupCell.vue";

describe("LineupCell candidate selection", () => {
  it("announces existing identity without using a live status role on interactive chips", async () => {
    const wrapper = mount(LineupCell, {
      props: {
        rowId: "row-stable-key",
        rowNumber: 1,
        items: [{ key: "artist-entry", name: "Meshuggah", artistId: "artist-id" }],
        state: {
          draft: "",
          draftStatus: "idle",
          itemStatus: {},
          draftError: null,
          itemResolution: { "artist-entry": { status: "existing" } },
        },
      },
    });

    const chip = wrapper.get('[role="group"][aria-label="Meshuggah, artista existente"]');
    expect(chip.find("button").exists()).toBe(true);
    expect(chip.attributes("role")).toBe("group");
    wrapper.unmount();
  });

  it("moves focus into an artist editor and keeps native Tab navigation", async () => {
    const wrapper = mount(LineupCell, {
      attachTo: document.body,
      props: {
        rowId: "row-stable-key",
        rowNumber: 1,
        items: [{ key: "artist-entry", name: "Meshuggah", artistId: "artist-id" }],
        state: {
          draft: "",
          draftStatus: "idle",
          itemStatus: {},
          draftError: null,
          itemResolution: { "artist-entry": { status: "existing" } },
        },
      },
    });

    await wrapper.get('button[aria-label="Editar Meshuggah"]').trigger("click");
    await nextTick();
    expect(document.activeElement).toBe(
      wrapper.get('input[aria-label="Artista 1 de Lineup, fila 1"]').element
    );
    wrapper.unmount();
  });

  it("confirms with + and Enter while keeping the input as the active control", async () => {
    const wrapper = mount(LineupCell, {
      props: {
        rowId: "row-stable-key",
        rowNumber: 1,
        items: [],
        state: {
          draft: "",
          draftStatus: "idle",
          itemStatus: {},
          draftError: null,
          itemResolution: {},
        },
      },
    });
    const input = wrapper.get<HTMLInputElement>("input");
    expect(input.attributes("aria-required")).toBe("true");
    await input.setValue("Septicflesh");
    expect(wrapper.emitted("commitDraft")).toBeUndefined();

    await wrapper.get("button[aria-label='Confirmar artista de Lineup, fila 1']").trigger("click");
    expect(wrapper.emitted("commitDraft")).toHaveLength(1);
    await input.trigger("keydown.enter");
    expect(wrapper.emitted("commitDraft")).toHaveLength(2);
  });

  it("commits a nonempty draft on blur and leaves Tab navigation to the browser", async () => {
    const wrapper = mount(LineupCell, {
      props: {
        rowId: "row-stable-key",
        rowNumber: 1,
        items: [],
        state: {
          draft: "",
          draftStatus: "idle",
          itemStatus: {},
          draftError: null,
          itemResolution: {},
        },
      },
    });
    const input = wrapper.get<HTMLInputElement>("input");
    await input.setValue("Equilibrium");
    await input.trigger("keydown.tab");
    expect(wrapper.emitted("commitDraft")).toBeUndefined();
    const shiftTab = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    input.element.dispatchEvent(shiftTab);
    expect(shiftTab.defaultPrevented).toBe(false);
    expect(wrapper.emitted("commitDraft")).toBeUndefined();
    await input.trigger("blur");
    expect(wrapper.emitted("commitDraft")).toHaveLength(1);
  });

  it("confirms single value paste only into an empty draft and leaves in-progress text editable", async () => {
    const wrapper = mount(LineupCell, {
      props: {
        rowId: "row-stable-key",
        rowNumber: 1,
        items: [],
        state: {
          draft: "",
          draftStatus: "idle",
          itemStatus: {},
          draftError: null,
          itemResolution: {},
        },
      },
    });
    const input = wrapper.get<HTMLInputElement>("input");
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: { getData: () => "Septicflesh" } });
    input.element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(wrapper.emitted("pasteDraft")).toEqual([["Septicflesh"]]);

    await wrapper.setProps({ state: { ...wrapper.props("state"), draft: "Equilibrium" } });
    const editablePaste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(editablePaste, "clipboardData", { value: { getData: () => "Live" } });
    input.element.dispatchEvent(editablePaste);

    expect(editablePaste.defaultPrevented).toBe(false);
    expect(wrapper.emitted("pasteDraft")).toHaveLength(1);
  });

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
    expect(selector.text()).toContain("Artist A");
    await selector.setValue("artist-b");
    expect(wrapper.emitted("selectArtist")).toEqual([
      ["row-stable-key", "lineup-occurrence-a", "artist-b"],
    ]);
  });

  it("announces an artist lookup error and leaves retry available", async () => {
    const wrapper = mount(LineupCell, {
      props: {
        rowId: "row-stable-key",
        rowNumber: 2,
        items: [{ key: "artist-entry", name: "Artist text", artistId: null }],
        state: {
          draft: "",
          draftStatus: "idle",
          itemStatus: { "artist-entry": "error" },
          draftError: null,
          itemResolution: { "artist-entry": { status: "error", message: "ARTIST_INTERNAL" } },
        },
      },
    });

    const announcement = wrapper.get('[role="alert"]');
    expect(announcement.text()).toContain("Error al buscar para Artist text");
    expect(wrapper.text()).not.toContain("ARTIST_INTERNAL");
    await wrapper.get('button[aria-label="Reintentar resolución de Artist text"]').trigger("click");
    expect(wrapper.emitted("retryItem")).toEqual([["artist-entry"]]);
  });
});
