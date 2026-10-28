// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import { geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import type { RatesGeographyCountryDto } from "@services/rates/rates";
import geometryData from "../assets/world-countries-110m.min.json";
import MusicalWorldMap from "./MusicalWorldMap.vue";

const countries: RatesGeographyCountryDto[] = [
  { isoCode: "ES", name: "España", count: 120, percentage: 50 },
  { isoCode: "FR", name: "Francia", count: 25, percentage: 10 },
  { isoCode: "GB", name: "Reino Unido", count: 1, percentage: 0.4 },
  { isoCode: "US", name: "Estados Unidos", count: 80, percentage: 33.3 },
  { isoCode: "CA", name: "Canadá", count: 13, percentage: 5.4 },
  { isoCode: "RU", name: "Rusia", count: 1, percentage: 0.4 },
  { isoCode: "IN", name: "India", count: 2, percentage: 0.8 },
  { isoCode: "NO", name: "Noruega", count: 17, percentage: 6.2 },
  { isoCode: "SE", name: "Suecia", count: 11, percentage: 4.1 },
  { isoCode: "FI", name: "Finlandia", count: 7, percentage: 2.6 },
  { isoCode: "DK", name: "Dinamarca", count: 4, percentage: 1.5 },
  { isoCode: "BN", name: "Brunei", count: 3, percentage: 1.1 },
  { isoCode: "LU", name: "Luxemburgo", count: 6, percentage: 2.2 },
];

describe("MusicalWorldMap", () => {
  it("renders local country paths, labels France, Canada and Nordic countries, and keeps the legend", () => {
    const wrapper = mount(MusicalWorldMap, { props: { countries, selectedCode: null } });
    expect(wrapper.findAll(".country-feature path")).toHaveLength(177);
    expect(wrapper.find(".country-feature[aria-label^='España']").exists()).toBe(true);
    expect(wrapper.find(".country-labels [data-country-label='US']").exists()).toBe(true);
    expect(wrapper.find(".country-labels [data-country-label='CA']").text()).toBe("13");
    expect(wrapper.find(".country-labels [data-country-label='RU']").text()).toBe("1");
    expect(wrapper.find(".country-labels [data-country-label='IN']").text()).toBe("2");
    expect(wrapper.text()).toContain("Discos:");
    expect(wrapper.text()).toContain("0");
    expect(wrapper.find(".country-feature[aria-label^='España']").classes()).toContain("fill-pink-900");
    const excludedLabelCodes = new Set(["BN", "LU"]);
    for (const country of countries) {
      const label = wrapper.find(`.country-labels [data-country-label='${country.isoCode}']`);
      if (excludedLabelCodes.has(country.isoCode)) {
        expect(label.exists()).toBe(false);
      } else {
        expect(label.text()).toBe(new Intl.NumberFormat("es-ES").format(country.count));
      }
    }
    expect(wrapper.find(".country-feature[aria-label^='Brunei']").exists()).toBe(true);
    expect(wrapper.find(".country-feature[aria-label^='Luxemburgo']").exists()).toBe(true);
    const shapes = wrapper.get(".country-shapes").element;
    const labelsLayer = wrapper.get(".country-labels").element;
    expect((shapes.compareDocumentPosition(labelsLayer) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
    expect(wrapper.find(".country-feature[aria-label^='Francia']").classes()).toContain("fill-pink-900");
    expect(wrapper.find(".country-labels [data-country-label='ES']").classes()).toContain("text-[6px]");
    expect(wrapper.find(".country-labels [data-country-label='ES']").classes()).toContain("select-none");
    const projection = geoNaturalEarth1().fitSize([984, 544], geometryData);
    const spainFeature = geometryData.features.find(({ properties }) => properties.isoCode === "ES");
    const spainCenter = spainFeature ? projection(geoCentroid(spainFeature)) : null;
    const spainLabel = wrapper.find(".country-labels [data-country-label='ES']");
    expect(Number(spainLabel.attributes("x"))).toBeCloseTo(spainCenter?.[0] ?? 0, 4);
    expect(Number(spainLabel.attributes("y"))).toBeCloseTo(spainCenter?.[1] ?? 0, 4);
    const franceFeature = geometryData.features.find(({ properties }) => properties.isoCode === "FR");
    const francePolygons = franceFeature?.geometry.type === "MultiPolygon" ? franceFeature.geometry.coordinates : [];
    const franceProjection = geoNaturalEarth1().fitSize([984, 544], geometryData);
    const francePath = geoPath(franceProjection);
    let largestFrancePolygon: (typeof francePolygons)[number] | undefined;
    let largestFranceArea = 0;
    for (const polygon of francePolygons) {
      const area = francePath.area({ type: "Polygon", coordinates: polygon });
      if (area > largestFranceArea) {
        largestFranceArea = area;
        largestFrancePolygon = polygon;
      }
    }
    const franceCenter = largestFrancePolygon
      ? franceProjection(geoCentroid({ type: "Polygon", coordinates: largestFrancePolygon }))
      : null;
    const franceLabel = wrapper.find(".country-labels [data-country-label='FR']");
    expect(Number(franceLabel.attributes("x"))).toBeCloseTo(franceCenter?.[0] ?? 0, 4);
    expect(Number(franceLabel.attributes("y"))).toBeCloseTo(franceCenter?.[1] ?? 0, 4);
    wrapper.unmount();
  });

  it("keeps every country count visible even when labels are close and zooms the labels with the map", async () => {
    const denseCountries = [
      ...countries,
      { isoCode: "PT", name: "Portugal", count: 50, percentage: 20 },
      { isoCode: "IT", name: "Italia", count: 48, percentage: 19 },
      { isoCode: "DE", name: "Alemania", count: 42, percentage: 18 },
      { isoCode: "BE", name: "Bélgica", count: 39, percentage: 17 },
      { isoCode: "NL", name: "Países Bajos", count: 35, percentage: 16 },
    ];
    const wrapper = mount(MusicalWorldMap, { props: { countries: denseCountries, selectedCode: null } });
    expect(wrapper.findAll(".country-labels .country-value")).toHaveLength(denseCountries.length - 2);
    for (const country of denseCountries) {
      const label = wrapper.find(`.country-labels [data-country-label='${country.isoCode}']`);
      if (country.isoCode === "BN" || country.isoCode === "LU") {
        expect(label.exists()).toBe(false);
      } else {
        expect(label.text()).toBe(new Intl.NumberFormat("es-ES").format(country.count));
      }
    }
    const initialTransform = wrapper.get(".map-features").attributes("transform");
    await wrapper.get("[aria-label='Acercar mapa']").trigger("click");
    expect(wrapper.get(".map-features").attributes("transform")).not.toBe(initialTransform);
    expect(wrapper.findAll(".country-labels .country-value")).toHaveLength(denseCountries.length - 2);
    wrapper.unmount();
  });

  it("selects with click and keyboard, and clears on clicking the selected country again", async () => {
    const wrapper = mount(MusicalWorldMap, { props: { countries, selectedCode: null } });
    const spain = wrapper.find(".country-feature[aria-label^='España']");
    await spain.trigger("click");
    expect(wrapper.emitted("select")?.[0]?.[0]).toMatchObject(countries[0]);
    await spain.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("select")?.[1]?.[0]).toMatchObject(countries[0]);
    await spain.trigger("keydown", { key: " " });
    expect(wrapper.emitted("select")?.[2]?.[0]).toMatchObject(countries[0]);
    wrapper.unmount();
  });

  it("exposes accessible zoom, pan keyboard and reset controls", async () => {
    const wrapper = mount(MusicalWorldMap, { props: { countries, selectedCode: "ES" } });
    const svg = wrapper.get("[role='application']");
    const group = wrapper.get(".map-features");
    const initialTransform = group.attributes("transform");
    await wrapper.get("[aria-label='Acercar mapa']").trigger("click");
    expect(group.attributes("transform")).not.toBe(initialTransform);
    await svg.trigger("keydown", { key: "ArrowRight" });
    expect(group.attributes("transform")).toContain("translate(-32 0)");
    await wrapper.get("[aria-label='Restablecer mapa']").trigger("click");
    expect(group.attributes("transform")).toContain("scale(1)");
    expect(wrapper.get("[aria-label='Alejar mapa']").attributes("disabled")).toBeDefined();
    expect(wrapper.get(".country-feature[aria-label^='España']").classes()).toContain("is-selected");
    wrapper.unmount();
  });

  it("supports pointer pan within the zoom bounds", async () => {
    const wrapper = mount(MusicalWorldMap, { props: { countries, selectedCode: null } });
    const surface = wrapper.get("[role='application']").element as HTMLDivElement & { setPointerCapture: (pointerId: number) => void };
    surface.setPointerCapture = vi.fn();
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue({
      width: 500, height: 280, x: 0, y: 0, top: 0, right: 500, bottom: 280, left: 0, toJSON: () => ({}),
    });
    await wrapper.get("[aria-label='Acercar mapa']").trigger("click");
    const dispatchPointer = (type: string, x: number, y: number) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, {
        button: { value: 0 }, pointerId: { value: 3 }, clientX: { value: x }, clientY: { value: y },
      });
      surface.dispatchEvent(event);
    };
    dispatchPointer("pointerdown", 100, 100);
    dispatchPointer("pointermove", 130, 110);
    dispatchPointer("pointerup", 130, 110);
    await nextTick();
    expect(surface.setPointerCapture).toHaveBeenCalledOnce();
    expect(surface.getBoundingClientRect).toHaveBeenCalledOnce();
    expect(wrapper.get(".map-features").attributes("transform")).toContain("translate(60 20)");
    wrapper.unmount();
  });


  it("does not capture a click on a country when the map is zoomed", async () => {
    const wrapper = mount(MusicalWorldMap, { props: { countries, selectedCode: null } });
    const surface = wrapper.get("[role='application']").element as HTMLDivElement & { setPointerCapture: (pointerId: number) => void };
    surface.setPointerCapture = vi.fn();
    await wrapper.get("[aria-label='Acercar mapa']").trigger("click");
    const spain = wrapper.find(".country-feature[aria-label^='España']");
    const sendPointer = (type: string) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, { button: { value: 0 }, pointerId: { value: 7 }, clientX: { value: 100 }, clientY: { value: 100 } });
      spain.element.dispatchEvent(event);
    };
    sendPointer("pointerdown");
    sendPointer("pointerup");
    await spain.trigger("click");

    expect(surface.setPointerCapture).not.toHaveBeenCalled();
    expect(wrapper.emitted("select")?.[0]?.[0]).toMatchObject(countries[0]);
    expect(wrapper.get(".country-labels").attributes("pointer-events")).toBe("none");
    wrapper.unmount();
  });

  it("reports hover detail to the modal and ignores uncoded geometry as a selection target", async () => {
    const wrapper = mount(MusicalWorldMap, { props: { countries, selectedCode: null } });
    await wrapper.find(".country-feature[aria-label^='España']").trigger("mouseenter");
    expect(wrapper.emitted("preview")?.[0]?.[0]).toMatchObject(countries[0]);
    const uncoded = wrapper.findAll(".country-feature").find((feature) => feature.attributes("tabindex") === "-1");
    expect(uncoded).toBeDefined();
    await uncoded?.trigger("click");
    expect(wrapper.emitted("select")).toBeUndefined();
    wrapper.unmount();
  });
});
