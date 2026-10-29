// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getArtistDetails } = vi.hoisted(() => ({ getArtistDetails: vi.fn() }));
vi.mock("../api/artistDetails", () => ({ getArtistDetails }));
import { useArtistDetails } from "./useArtistDetails";

const ids = { one: "00000000-0000-4000-8000-000000000001", two: "00000000-0000-4000-8000-000000000002" };
const details = (id: string, discs = []) => ({ id, name: id === ids.one ? "Homónimo" : "Homónimo", image: null, description: null, country: null, genres: [], discs });
const disc = (id: string, releaseDate: string | null) => ({ id, name: id, image: null, releaseDate, genre: null });

function setup() {
  const id = ref(ids.one);
  const enabled = ref(true);
  let state!: ReturnType<typeof useArtistDetails>;
  const Host = defineComponent({ setup() { state = useArtistDetails(id, enabled); return () => h("div"); } });
  const wrapper = mount(Host);
  return { id, enabled, state, wrapper };
}

afterEach(() => getArtistDetails.mockReset());

describe("useArtistDetails", () => {
  it("requests by Catalog ID, deduplicates discs and orders dated releases before null dates", async () => {
    getArtistDetails.mockResolvedValue(details(ids.one, [disc("old", "1990-01-01"), disc("new", "2024-01-01"), disc("new", "2024-01-01"), disc("unknown", null)]));
    const { state, wrapper } = setup();
    await flushPromises();
    expect(getArtistDetails).toHaveBeenCalledWith(ids.one, expect.any(AbortSignal));
    expect(state.detail.value?.discs.map(({ id }) => id)).toEqual(["new", "old", "unknown"]);
    wrapper.unmount();
  });

  it("discards a late response when navigating between homonymous artists", async () => {
    let resolveOld!: (value: ReturnType<typeof details>) => void;
    getArtistDetails.mockImplementation((id: string) => id === ids.one ? new Promise((resolve) => { resolveOld = resolve; }) : Promise.resolve(details(ids.two)));
    const { id, state, wrapper } = setup();
    id.value = ids.two;
    await flushPromises();
    resolveOld(details(ids.one, [disc("wrong", "2020-01-01")]));
    await flushPromises();
    expect(state.detail.value?.id).toBe(ids.two);
    expect(state.detail.value?.discs).toEqual([]);
    wrapper.unmount();
  });

  it("keeps an empty discography as a successful result and exposes retryable failures", async () => {
    getArtistDetails.mockResolvedValueOnce(details(ids.one));
    const { state, wrapper } = setup();
    await flushPromises();
    expect(state.error.value).toBe(false);
    expect(state.detail.value?.discs).toEqual([]);
    wrapper.unmount();

    getArtistDetails.mockRejectedValueOnce(new Error("offline"));
    const failed = setup();
    await flushPromises();
    expect(failed.state.error.value).toBe(true);
    expect(failed.state.detail.value).toBeNull();
    failed.wrapper.unmount();
  });
});
