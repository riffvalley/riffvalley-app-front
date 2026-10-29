// @vitest-environment happy-dom
import { mount, shallowMount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/identity/auth", () => ({
  useAuthStore: () => ({ role: "riffvalley" }),
}));

import DiscComponent from "./DiscComponent.vue";
import DiscComponentBaby from "./DiscComponentBaby.vue";
import EditModal from "./EditModal.vue";

const genres = [{ id: "genre-1", name: "Rock", color: "#123456" }];

const editorialDisc = {
  id: "disc-1",
  name: "Álbum editorial",
  artist: { id: "artist-1", name: "Artista editorial", countryId: "country-1" },
  genreId: "genre-1",
  link: null,
  image: null,
  ep: false,
  debut: false,
  verified: false,
  pinned: false,
  releaseDate: new Date("2026-10-29T12:00:00.000Z"),
  pendingId: null,
  nationalReleaseId: null,
};

describe("Calendar presentation components", () => {
  it("renders the editorial disc card and its focused state", () => {
    const wrapper = shallowMount(DiscComponent, {
      props: {
        disc: editorialDisc,
        genres,
        countries: [],
        focusDiscId: "disc-1",
      },
    });

    expect(wrapper.text()).toContain("Álbum editorial");
    expect(wrapper.text()).toContain("Artista editorial");
    wrapper.unmount();
  });

  it("renders the simplified disc card", () => {
    const wrapper = shallowMount(DiscComponentBaby, {
      props: {
        disc: {
          ...editorialDisc,
          artist: { name: "Artista usuario" },
          genre: { name: "Rock", color: "#123456" },
        },
        genres,
      },
      global: { stubs: ["CircleFlags"] },
    });

    expect(wrapper.text()).toContain("Álbum editorial");
    expect(wrapper.text()).toContain("Artista usuario");
    wrapper.unmount();
  });

  it("keeps the editorial modal save and cancel events", async () => {
    const wrapper = mount(EditModal, {
      props: {
        show: true,
        title: "Editar fecha",
        modelValue: "2026-10-29",
      },
    });

    await wrapper.get("input").setValue("2026-11-01");
    await wrapper.get("button.bg-rv-pink").trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["2026-11-01"]);
    expect(wrapper.emitted("save")?.[0]).toEqual(["2026-11-01"]);
    expect(wrapper.emitted("update:show")?.[0]).toEqual([false]);

    await wrapper.setProps({ show: true, modelValue: "2026-10-29" });
    await wrapper.get("button.bg-gray-400").trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });
});
