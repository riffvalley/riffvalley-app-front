// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { discCardDialogKey } from "@/composables/discCardDialog";
import CalendarVoteButton from "./CalendarVoteButton.vue";

const { getDiscRates } = vi.hoisted(() => ({ getDiscRates: vi.fn() }));
vi.mock("@services/rates/rates", () => ({ getDiscRates }));
vi.mock("@/modules/identity/auth", () => ({ useAuthStore: () => ({ userId: "user-1" }) }));

describe("CalendarVoteButton", () => {
  const open = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 26, 12));
    open.mockReset();
    getDiscRates.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  function mountButton(disc: Record<string, unknown>, withDialog = true) {
    return mount(CalendarVoteButton, {
      props: { disc: { id: "d-1", name: "Uno", ...disc } as never },
      global: withDialog ? { provide: { [discCardDialogKey as symbol]: { isOpen: ref(false), open } } } : {},
    });
  }

  it("offers to vote a disc that came out today and opens the votable card", async () => {
    const wrapper = mountButton({ releaseDate: "2026-11-26", userRate: null });
    const button = wrapper.get('[data-test="calendar-disc-vote"]');

    expect(button.text()).toContain("Votar disco");
    expect(button.attributes("aria-label")).toBe("Votar Uno");
    await button.trigger("click");
    expect(open).toHaveBeenCalledWith("d-1", expect.any(Object));
  });

  it("offers to edit the note when you already voted it", () => {
    const wrapper = mountButton({ releaseDate: "2026-11-01", userRate: { rate: "7.00" } });
    expect(wrapper.get('[data-test="calendar-disc-vote"]').text()).toContain("Editar nota");
  });

  it("is hidden for discs that have not come out yet or without the card host", () => {
    expect(mountButton({ releaseDate: "2026-11-27" }).find('[data-test="calendar-disc-vote"]').exists()).toBe(false);
    expect(mountButton({ releaseDate: "2026-11-26" }, false).find('[data-test="calendar-disc-vote"]').exists()).toBe(false);
  });

  it("refreshes the label after voting in the card", async () => {
    getDiscRates.mockResolvedValue([{ id: "r-1", rate: "8", cover: "5", user: { id: "user-1" } }]);
    const wrapper = mountButton({ releaseDate: "2026-11-20", userRate: null });

    await wrapper.get('[data-test="calendar-disc-vote"]').trigger("click");
    open.mock.calls[0]![1].onClose(true);
    await flushPromises();

    expect(getDiscRates).toHaveBeenCalledWith("d-1");
    expect(wrapper.get('[data-test="calendar-disc-vote"]').text()).toContain("Editar nota");
  });
});
