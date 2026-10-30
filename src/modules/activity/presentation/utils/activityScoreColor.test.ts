import { describe, expect, it } from "vitest";
import { getActivityScoreColorClasses } from "./activityScoreColor";

describe("getActivityScoreColorClasses", () => {
  it.each([
    [10, "intenseGreen"],
    [9.5, "intenseGreen"],
    [9.499, "green"],
    [9, "green"],
    [8.999, "softGreen"],
    [8, "softGreen"],
    [7.999, "lime"],
    [7, "lime"],
    [6.999, "yellow"],
    [6, "yellow"],
    [5.999, "amber"],
    [5, "amber"],
    [4.999, "orange"],
    [4, "orange"],
    [3.999, "red"],
    [0, "red"],
  ] as const)("maps %s to the %s score band without rounding", (score, band) => {
    const classes = getActivityScoreColorClasses(score);
    const colorClasses = {
      intenseGreen: "bg-green-700",
      green: "bg-green-100",
      softGreen: "bg-emerald-100",
      lime: "bg-lime-100",
      yellow: "bg-yellow-100",
      amber: "bg-amber-100",
      orange: "bg-orange-100",
      red: "bg-red-100",
    } as const;
    expect(classes).toContain(colorClasses[band as keyof typeof colorClasses]);
  });

  it("uses neutral colors for unknown and non-finite values", () => {
    expect(getActivityScoreColorClasses(null)).toContain("bg-gray-100");
    expect(getActivityScoreColorClasses(Number.NaN)).toContain("bg-gray-100");
  });
});
