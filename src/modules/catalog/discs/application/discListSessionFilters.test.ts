// @vitest-environment happy-dom
import { nextTick, ref } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import {
  readDiscListSessionFilters,
  useDiscListSessionFilters,
  writeDiscListSessionFilters,
} from "./discListSessionFilters";

const week: [string, string] = ["2026-11-20T00:00:00.000Z", "2026-11-26T23:59:59.999Z"];

function createBindings(userId: string | null) {
  const selectedWeek = ref<[string, string] | null>(null);
  const selectedGenres = ref<string[]>([]);
  const selectedCountry = ref("");
  const noRatesOnly = ref(false);
  return {
    userId: ref(userId),
    selectedWeek,
    selectedGenres,
    selectedCountry,
    noRatesOnly,
    setSelectedWeek: (value: [string, string] | null) => (selectedWeek.value = value),
    setGenres: (value: string[]) => (selectedGenres.value = value),
    setCountry: (value: string) => (selectedCountry.value = value),
    setNoRatesOnly: (value: boolean) => (noRatesOnly.value = value),
  };
}

describe("disc list session filters", () => {
  afterEach(() => sessionStorage.clear());

  it("saves each change and restores it on the next visit of the same user", async () => {
    const first = createBindings("user-a");
    expect(useDiscListSessionFilters(first)).toBe(false);
    first.selectedWeek.value = week;
    first.selectedGenres.value = ["genre-a"];
    first.selectedCountry.value = "country-a";
    first.noRatesOnly.value = true;
    await nextTick();

    const second = createBindings("user-a");
    expect(useDiscListSessionFilters(second)).toBe(true);
    expect(second.selectedWeek.value).toEqual(week);
    expect(second.selectedGenres.value).toEqual(["genre-a"]);
    expect(second.selectedCountry.value).toBe("country-a");
    expect(second.noRatesOnly.value).toBe(true);
  });

  it("shows everything on an unfiltered visit without overwriting the remembered filters", async () => {
    writeDiscListSessionFilters("user-a", { week, genreIds: ["genre-a"], countryId: "country-a", noRatesOnly: true });
    const visit = createBindings("user-a");

    expect(useDiscListSessionFilters({ ...visit, unfilteredVisit: { week: null } })).toBe(false);
    await nextTick();

    expect(visit.selectedWeek.value).toBeNull();
    expect(visit.selectedGenres.value).toEqual([]);
    expect(visit.selectedCountry.value).toBe("");
    expect(visit.noRatesOnly.value).toBe(false);
    expect(readDiscListSessionFilters("user-a")).toEqual({ week, genreIds: ["genre-a"], countryId: "country-a", noRatesOnly: true });
  });

  it("remembers the filters again once the user changes one during an unfiltered visit", async () => {
    writeDiscListSessionFilters("user-a", { week, genreIds: ["genre-a"], countryId: "", noRatesOnly: false });
    const visit = createBindings("user-a");
    useDiscListSessionFilters({ ...visit, unfilteredVisit: { week: null } });
    await nextTick();

    visit.selectedCountry.value = "country-b";
    await nextTick();

    expect(readDiscListSessionFilters("user-a")).toEqual({ week: null, genreIds: [], countryId: "country-b", noRatesOnly: false });
  });

  it("keeps an explicit «all years» choice and separates users", () => {
    writeDiscListSessionFilters("user-a", { week: null, genreIds: [], countryId: "", noRatesOnly: false });

    expect(readDiscListSessionFilters("user-a")?.week).toBeNull();
    expect(readDiscListSessionFilters("user-b")).toBeNull();
    expect(readDiscListSessionFilters(null)).toBeNull();
  });

  it("ignores corrupted or unexpected stored data", () => {
    sessionStorage.setItem("rv_disc_list_filters:user-a", "{no-json");
    expect(readDiscListSessionFilters("user-a")).toBeNull();
    sessionStorage.setItem("rv_disc_list_filters:user-a", JSON.stringify({ week: ["x", "y"], genreIds: [], countryId: "", noRatesOnly: false }));
    expect(readDiscListSessionFilters("user-a")).toBeNull();
  });
});
