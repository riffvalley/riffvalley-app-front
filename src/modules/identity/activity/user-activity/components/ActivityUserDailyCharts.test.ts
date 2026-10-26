// @vitest-environment happy-dom
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { ActivityUserDetailResponse } from "@/modules/identity/activity/types/activity";

vi.mock("vue-chartjs", () => ({
  Line: defineComponent({
    name: "MockLineChart",
    props: { data: { type: Object, required: true }, options: { type: Object, required: true } },
    setup(props) {
      return () =>
        h("div", {
          "data-testid": "line-chart",
          "data-datasets": JSON.stringify(props.data.datasets),
        });
    },
  }),
}));

import ActivityUserDailyCharts from "./ActivityUserDailyCharts.vue";

const activity: ActivityUserDetailResponse = {
  userId: "user-1",
  lastActiveDate: "2026-10-22",
  activeDays7: 1,
  activeDays30: 1,
  activeDates: ["2026-10-20"],
  presenceByDay: [
    { date: "2026-10-20", present: true },
    { date: "2026-10-21", present: false },
    { date: "2026-10-22", present: null },
  ],
  activityDataSince: "2026-10-20",
  activityCoverage: { status: "incomplete", dataSince: "2026-10-20" },
  currentVotes: 1,
  newVotes7: 1,
  newVotes30: 1,
  newVotesRecorded: 1,
  changedVotes7: 0,
  changedVotes30: 0,
  changedVotesRecorded: 0,
  lastVoteEventAt: "2026-10-20T12:00:00.000Z",
  voteDataSince: "2026-10-20",
  voteCoverage: { status: "incomplete", dataSince: "2026-10-20" },
  newVotesByDay: [
    { date: "2026-10-20", count: 1 },
    { date: "2026-10-21", count: 0 },
    { date: "2026-10-22", count: null },
  ],
  changedVotesByDay: [
    { date: "2026-10-20", count: 0 },
    { date: "2026-10-21", count: 0 },
    { date: "2026-10-22", count: null },
  ],
};

describe("ActivityUserDailyCharts", () => {
  it("maps true, false and null presence separately from zero and unknown vote counts", () => {
    const wrapper = mount(ActivityUserDailyCharts, { props: { activity } });
    const charts = wrapper.findAll('[data-testid="line-chart"]');
    const presenceDatasets = JSON.parse(charts[0]!.attributes("data-datasets")!);
    const voteDatasets = JSON.parse(charts[1]!.attributes("data-datasets")!);

    expect(presenceDatasets[0].data).toEqual([1, 0, null]);
    expect(
      voteDatasets.map((dataset: { label: string; data: (number | null)[] }) => [
        dataset.label,
        dataset.data,
      ])
    ).toEqual([
      ["Votos nuevos (set)", [1, 0, null]],
      ["Modificaciones (change)", [0, 0, null]],
    ]);
  });
});
