// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, h, type PropType } from "vue";
import { describe, expect, it } from "vitest";
import type { RatesTopArtistDto } from "@services/rates/rates";

const SharedArtistModal = defineComponent({
  props: { artistId: { type: String, required: true }, favoriteArtist: { type: Object as PropType<RatesTopArtistDto>, default: null } },
  emits: ["close", "open-related-artist"],
  setup(props, { emit }) {
    return () => h("div", { "data-test": "shared-modal", "data-artist-id": props.artistId, "data-personal-id": props.favoriteArtist?.id }, [
      h("button", { onClick: () => emit("open-related-artist", "00000000-0000-4000-8000-000000000002") }, "Relacionado"),
      h("button", { onClick: () => emit("close") }, "Cerrar"),
    ]);
  },
});
import DashboardFavoriteArtistModal from "./DashboardFavoriteArtistModal.vue";

const artist: RatesTopArtistDto = { id: "00000000-0000-4000-8000-000000000001", name: "Favorito", image: null, ratingCount: 3, averageRate: 8 };

describe("DashboardFavoriteArtistModal", () => {
  it("opens the shared Catalog-ID ficha with personal data and keeps it open for related navigation", async () => {
    const wrapper = mount(DashboardFavoriteArtistModal, { props: { artist }, global: { stubs: { ArtistDetailsModal: SharedArtistModal } } });
    expect(wrapper.get("[data-test=shared-modal]").attributes("data-artist-id")).toBe(artist.id);
    expect(wrapper.get("[data-test=shared-modal]").attributes("data-personal-id")).toBe(artist.id);
    await wrapper.get("button").trigger("click");
    expect(wrapper.get("[data-test=shared-modal]").attributes("data-artist-id")).toBe("00000000-0000-4000-8000-000000000002");
    expect(wrapper.get("[data-test=shared-modal]").attributes("data-personal-id")).toBe("00000000-0000-4000-8000-000000000002");
    await wrapper.findAll("button")[1]!.trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});
