// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { contentFixtures } from "../../utils/contentFixtures";
import type { RadarListDetails } from "@services/list/list";
import RadarActionsModal from "./RadarActionsModal.vue";

const radar = contentFixtures.find((item) => item.type === "radar")!;
const details: RadarListDetails = {
  id: "list-radar",
  name: "Radar",
  type: "week",
  status: "new",
  asignations: [{ id: "asignation-1", done: false, position: 1, description: "Revisar" }],
};

describe("RadarActionsModal deferred details", () => {
  it("shows an independent error and exposes retries for List details and users", async () => {
    const wrapper = mount(RadarActionsModal, {
      props: {
        show: true,
        content: radar,
        radarDetails: null,
        loading: false,
        error: true,
        rvUsers: [],
        usersError: true,
      },
    });

    expect(wrapper.get('[role="alert"]').text()).toContain("No se han podido cargar los detalles");
    await wrapper.get('[role="alert"] button').trigger("click");
    expect(wrapper.emitted("retry-details")).toHaveLength(1);

    const userAlert = wrapper
      .findAll('[role="alert"]')
      .find((element) => element.text().includes("usuarios"));
    expect(userAlert).toBeDefined();
    await userAlert!.get("button").trigger("click");
    expect(wrapper.emitted("retry-users")).toHaveLength(1);
    expect(wrapper.text()).not.toContain("Revisar");
  });

  it("keeps available List data visible during a cache refresh", () => {
    const wrapper = mount(RadarActionsModal, {
      props: {
        show: true,
        content: radar,
        radarDetails: details,
        loading: true,
        error: false,
        rvUsers: [],
      },
    });

    expect(wrapper.text()).toContain("Actualizando detalles de la lista");
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
  });
});
