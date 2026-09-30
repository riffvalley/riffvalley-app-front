// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ArtistEditForm from "../../src/app/components/ArtistEditForm.vue";

describe("ArtistEditForm Spotify image choices", () => {
  it("keeps the image chooser visible and emits the manually selected image", async () => {
    const wrapper = mount(ArtistEditForm, { props: {
      name: "Banda", countryId: "", image: "current.jpg", description: "", saving: false,
      fetchingImage: false,
      imageOptions: [
        { name: "Banda", image: "first.jpg" },
        { name: "Banda alternativa", image: "second.jpg" },
      ],
    }, global: { stubs: { teleport: true } } });

    const optionImage = wrapper.find('img[src="second.jpg"]');
    expect(optionImage.exists()).toBe(true);
    await optionImage.element.closest("button")?.click();
    expect(wrapper.emitted("pick-image")).toEqual([["second.jpg"]]);
    wrapper.unmount();
  });
});
