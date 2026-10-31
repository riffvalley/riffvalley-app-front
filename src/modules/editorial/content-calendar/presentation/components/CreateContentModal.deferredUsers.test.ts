// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CreateContentModal from "./CreateContentModal.vue";

describe("CreateContentModal deferred users", () => {
  it("shows loading, exposes retry on error, and enables author selection when data arrives", async () => {
    const wrapper = mount(CreateContentModal, {
      props: {
        show: true,
        rvUsers: [],
        usersLoading: true,
        usersError: false,
        usersRefreshing: false,
      },
    });

    expect(wrapper.get('[role="status"]').text()).toContain("Cargando usuarios");
    const authorSelect = () => wrapper.findAll("select")[1];
    const createButton = () =>
      wrapper.findAll("button").find((button) => button.text() === "Crear");
    expect(authorSelect().attributes("disabled")).toBeDefined();
    expect(createButton()?.attributes("disabled")).toBeDefined();

    await wrapper.setProps({ usersLoading: false, usersError: true });
    expect(wrapper.get('[role="alert"]').text()).toContain("No se pudieron cargar");
    await wrapper.get('[role="alert"] button').trigger("click");
    expect(wrapper.emitted("retry-users")).toHaveLength(1);

    await wrapper.setProps({
      usersError: false,
      rvUsers: [
        {
          id: "rv",
          username: "RiffValley",
          email: "rv@example.test",
          image: null,
          role: "riffvalley",
        },
      ],
    });
    expect(authorSelect().attributes("disabled")).toBeUndefined();
    expect((authorSelect().element as HTMLSelectElement).value).toBe("rv");
    expect(createButton()?.attributes("disabled")).toBeUndefined();
  });
});
