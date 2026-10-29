// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";

const api = vi.hoisted(() => ({ getDiscListSuggestions: vi.fn() }));
vi.mock("../../api/discList", () => api);

import DiscListAutocomplete from "./DiscListAutocomplete.vue";

const artistSuggestions = [
  {
    id: "artist-homonym-a",
    name: "MØL",
    image: "https://images.test/mol-a.jpg",
    country: { id: "country-a", name: "Dinamarca", isoCode: "DK" },
  },
  {
    id: "artist-homonym-b",
    name: "MØL",
    image: null,
    country: null,
  },
];

const results = {
  artists: artistSuggestions,
  discs: [
    {
      id: "disc-1",
      title: "Jord",
      artistId: "artist-homonym-a",
      artistName: "MØL",
      image: null,
    },
  ],
};

function mountAutocomplete(
  props: { modelValue?: string; selectedArtist?: { id: string; name: string } | null } = {}
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore(pinia).$patch({
    authStatus: "authenticated",
    token: "session-token",
    userId: "user-a",
    authSessionGeneration: 1,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 60_000 } },
  });
  return mount(DiscListAutocomplete, {
    props: { modelValue: "", selectedArtist: null, ...props },
    global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    attachTo: document.body,
  });
}

async function advanceDebounce() {
  await vi.advanceTimersByTimeAsync(250);
  await flushPromises();
}

function suggestionsPopup() {
  return document.body.querySelector(".disc-list-autocomplete-popup");
}

function suggestionsList() {
  return document.body.querySelector('[role="listbox"]');
}

async function typeQuery(wrapper: ReturnType<typeof mountAutocomplete>, value: string) {
  await wrapper.get<HTMLInputElement>("input[role=combobox]").setValue(value);
  await wrapper.setProps({ modelValue: value });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 20,
    y: 60,
    width: 350,
    height: 48,
    top: 60,
    right: 370,
    bottom: 108,
    left: 20,
    toJSON: () => ({}),
  } as DOMRect);
  api.getDiscListSuggestions.mockReset().mockResolvedValue(results);
});

afterEach(() => {
  document.body
    .querySelectorAll(".disc-list-autocomplete-popup")
    .forEach((element) => element.remove());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("DiscListAutocomplete", () => {
  it("keeps typing immediate and requests normalized suggestions after 250 ms only", async () => {
    const wrapper = mountAutocomplete();
    await typeQuery(wrapper, "m");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["m"]);
    await advanceDebounce();
    expect(api.getDiscListSuggestions).not.toHaveBeenCalled();

    await typeQuery(wrapper, "  MØL  ");
    await vi.advanceTimersByTimeAsync(249);
    expect(api.getDiscListSuggestions).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(api.getDiscListSuggestions).toHaveBeenCalledTimes(1);
    expect(api.getDiscListSuggestions).toHaveBeenCalledWith("møl", expect.any(AbortSignal));
    await wrapper.get("input").trigger("keydown", { key: "Escape" });
    await wrapper.get("input").trigger("focus");
    await flushPromises();
    expect(api.getDiscListSuggestions).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("shows homonymous artists by stable ID, country, and image fallbacks in grouped sections", async () => {
    const wrapper = mountAutocomplete();
    await typeQuery(wrapper, "mol");
    await advanceDebounce();

    expect(suggestionsList()?.querySelectorAll('[role="group"]')).toHaveLength(2);
    expect(suggestionsList()?.querySelectorAll('[role="option"]')).toHaveLength(3);
    expect(suggestionsPopup()?.querySelector("button")?.textContent).not.toContain("Añadir disco");
    const artistOption = suggestionsList()?.querySelector('[id$="artist-artist-homonym-a"]');
    expect(artistOption?.className).toContain("bg-rv-navy");
    expect(artistOption?.className).toContain("text-white");
    expect(artistOption?.className).toContain("dark:bg-gray-200");
    expect(artistOption?.className).toContain("dark:text-rv-navy");
    expect(suggestionsPopup()?.textContent).toContain("Dinamarca");
    expect(wrapper.get("input").attributes("aria-controls")).toBeTruthy();
    expect(
      suggestionsList()?.querySelector('[id$="artist-artist-homonym-a"] img')?.getAttribute("src")
    ).toContain("mol-a.jpg");
    expect(
      suggestionsList()?.querySelector('[id$="artist-artist-homonym-b"] .fa-user')
    ).not.toBeNull();
    expect(
      suggestionsList()?.querySelector('[id$="disc-disc-1"] img')?.getAttribute("src")
    ).toContain("disco.png");
    expect(suggestionsPopup()?.textContent).toContain("Jord");
    wrapper.unmount();
  });

  it("offers adding a disc only in the empty suggestions state", async () => {
    api.getDiscListSuggestions.mockResolvedValueOnce({ artists: [], discs: [] });
    const wrapper = mountAutocomplete();
    await typeQuery(wrapper, "new record");
    await advanceDebounce();

    const emptyStatus = suggestionsPopup()?.querySelector('[role="status"]');
    expect(emptyStatus?.textContent).toContain("No se han encontrado sugerencias.");
    const addButton = emptyStatus?.querySelector("button");
    expect(addButton?.textContent).toContain("Añadir disco");
    addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(wrapper.emitted("create-disc")).toEqual([[]]);

    wrapper.unmount();
  });

  it("selects a specific homonymous artist with keyboard and closes on Escape", async () => {
    const wrapper = mountAutocomplete();
    const input = wrapper.get<HTMLInputElement>("input[role=combobox]");
    await typeQuery(wrapper, "mol");
    input.element.focus();
    await flushPromises();
    await advanceDebounce();
    await input.trigger("keydown", { key: "ArrowDown" });
    expect(input.attributes("aria-activedescendant")).toContain("artist-homonym-a");
    const activeOption = document.getElementById(input.attributes("aria-activedescendant"));
    expect(activeOption?.className).toContain("bg-rv-navy");
    expect(activeOption?.className).toContain("dark:bg-gray-200");
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(wrapper.emitted("select-artist")?.[0]).toEqual([
      { id: "artist-homonym-b", name: "MØL" },
    ]);
    expect(wrapper.get("input").element).toBe(document.activeElement);
    expect(wrapper.get("input").attributes("aria-expanded")).toBe("false");

    input.element.focus();
    await flushPromises();
    await input.trigger("keydown", { key: "Escape" });
    expect(wrapper.get("input").element).toBe(document.activeElement);
    expect(wrapper.get("input").attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
  });

  it("uses the Todos los discos palette for the selected artist filter in both themes", () => {
    const wrapper = mountAutocomplete({
      selectedArtist: { id: "artist-homonym-a", name: "MØL" },
    });
    const filter = wrapper.get('[data-testid="selected-artist-filter"]');
    expect(filter.classes()).toContain("bg-rv-navy");
    expect(filter.classes()).toContain("text-white");
    expect(filter.classes()).toContain("dark:bg-gray-200");
    expect(filter.classes()).toContain("dark:text-rv-navy");
    wrapper.unmount();
  });

  it("closes on Enter without an active suggestion and emits no selection", async () => {
    const wrapper = mountAutocomplete();
    const input = wrapper.get<HTMLInputElement>("input[role=combobox]");
    await typeQuery(wrapper, "mol");
    input.element.focus();
    await advanceDebounce();
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("select-artist")).toBeUndefined();
    expect(wrapper.emitted("select-disc")).toBeUndefined();
    expect(input.attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
  });

  it("selects a disc with keyboard and dismisses suggestions on an outside pointer", async () => {
    const wrapper = mountAutocomplete();
    const input = wrapper.get<HTMLInputElement>("input[role=combobox]");
    await typeQuery(wrapper, "mol");
    await advanceDebounce();
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("select-disc")?.[0]).toEqual([results.discs[0]]);

    await input.trigger("focus");
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await flushPromises();
    expect(wrapper.get("input").attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
  });

  it("teleports the mobile popup to the document and clamps it to the viewport", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: -24,
      y: 60,
      width: 460,
      height: 48,
      top: 60,
      right: 436,
      bottom: 108,
      left: -24,
      toJSON: () => ({}),
    } as DOMRect);
    const wrapper = mountAutocomplete();
    await typeQuery(wrapper, "mol");
    await advanceDebounce();

    const popup = suggestionsPopup() as HTMLElement;
    expect(popup.parentElement).toBe(document.body);
    expect(popup.classList.contains("fixed")).toBe(true);
    expect(popup.style.left).toBe("8px");
    expect(popup.style.width).toBe("374px");
    wrapper.unmount();
  });

  it("does not keep stale results visible after the query changes and reports empty/error states", async () => {
    const wrapper = mountAutocomplete();
    await typeQuery(wrapper, "mol");
    await advanceDebounce();
    expect(suggestionsPopup()?.textContent).toContain("MØL");

    api.getDiscListSuggestions.mockResolvedValueOnce({ artists: [], discs: [] });
    await typeQuery(wrapper, "new");
    expect(suggestionsPopup()?.textContent).not.toContain("MØL");
    await advanceDebounce();
    expect(suggestionsPopup()?.textContent).toContain("No se han encontrado sugerencias");

    api.getDiscListSuggestions.mockRejectedValueOnce(new Error("offline"));
    await typeQuery(wrapper, "bad");
    await advanceDebounce();
    expect(suggestionsPopup()?.textContent).toContain("No se pudieron cargar");
    wrapper.unmount();
  });

  it("ignores an older response that resolves after a newer query", async () => {
    let resolveOld!: (value: typeof results) => void;
    api.getDiscListSuggestions.mockImplementation((query: string) => {
      if (query === "old") return new Promise((resolve) => (resolveOld = resolve));
      return Promise.resolve({
        artists: [{ ...artistSuggestions[0], id: "artist-new", name: "Nuevo" }],
        discs: [],
      });
    });
    const wrapper = mountAutocomplete();
    await typeQuery(wrapper, "old");
    await advanceDebounce();
    expect(api.getDiscListSuggestions).toHaveBeenCalledWith("old", expect.any(AbortSignal));

    await typeQuery(wrapper, "new");
    await advanceDebounce();
    expect(suggestionsPopup()?.textContent).toContain("Nuevo");
    resolveOld(results);
    await flushPromises();
    expect(suggestionsPopup()?.textContent).toContain("Nuevo");
    expect(suggestionsPopup()?.textContent).not.toContain("Jord");
    wrapper.unmount();
  });
});
