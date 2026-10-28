// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/modules/identity/auth";
import type { RatesGeographyWorldResponseDto } from "@services/rates/rates";

const { getRatesGeographyWorld } = vi.hoisted(() => ({ getRatesGeographyWorld: vi.fn() }));
vi.mock("@services/rates/rates", async (importOriginal) => {
  const original = await importOriginal<typeof import("@services/rates/rates")>();
  return { ...original, getRatesGeographyWorld };
});

import DashboardMusicalWorldModal from "./DashboardMusicalWorldModal.vue";

const response: RatesGeographyWorldResponseDto = {
  totalRatedDiscs: 17,
  mappedDiscs: 15,
  unmappedDiscs: 2,
  countryCount: 3,
  countries: [
    { isoCode: "ES", name: "España", count: 8, percentage: 53.33 },
    { isoCode: "FR", name: "Francia", count: 5, percentage: 33.33 },
    { isoCode: "GB", name: "Reino Unido", count: 2, percentage: 13.33 },
  ],
};
function authenticatedPinia() {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore(pinia).$patch({ token: "token", userId: "user-a", authStatus: "authenticated", role: "user" });
  return pinia;
}
function query<T extends HTMLElement>(selector: string): T {
  const element = document.body.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element ${selector}`);
  return element;
}
function mountModal(pinia = authenticatedPinia()) {
  const opener = document.createElement("button");
  opener.textContent = "open";
  document.body.append(opener);
  opener.focus();
  const wrapper = mount(DashboardMusicalWorldModal, { attachTo: document.body, global: { plugins: [pinia] } });
  return { wrapper, opener };
}

describe("DashboardMusicalWorldModal", () => {
  afterEach(() => {
    document.body.querySelectorAll("[data-test='musical-world-modal']").forEach((element) => element.remove());
    document.body.querySelectorAll("button").forEach((button) => { if (button.textContent === "open") button.remove(); });
    document.body.style.overflow = "";
  });
  beforeEach(() => {
    getRatesGeographyWorld.mockReset().mockResolvedValue(response);
    document.body.style.overflow = "";
  });

  it("loads world only after opening, shows summary and backend-ordered top ten, then selects from ranking", async () => {
    const { wrapper } = mountModal();
    expect(getRatesGeographyWorld).toHaveBeenCalledOnce();
    expect(getRatesGeographyWorld.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
    await flushPromises();
    expect((document.body.textContent ?? "")).toContain("15");
    expect((document.body.textContent ?? "")).toContain("Países explorados");
    expect(document.body.querySelectorAll("[aria-label='Top 10 países'] li")).toHaveLength(3);
    expect((document.body.textContent ?? "").indexOf("España")).toBeLessThan((document.body.textContent ?? "").indexOf("Francia"));
    await query<HTMLButtonElement>("[aria-label='Top 10 países'] button").click();
    expect(query<HTMLButtonElement>("[aria-label='Top 10 países'] button").getAttribute("aria-pressed")).toBe("true");
    expect(query("[data-test='country-detail']").textContent ?? "").toContain("53,33%");
    wrapper.unmount();
  });


  it("limits the modal ranking to the first ten countries in backend order", async () => {
    const codes = ["ES", "FR", "GB", "CA", "NO", "SE", "FI", "DK", "IS", "RU", "IN", "JP"];
    const expanded = {
      ...response,
      countryCount: codes.length,
      countries: codes.map((isoCode, index) => ({
        isoCode,
        name: `País ${isoCode}`,
        count: codes.length - index,
        percentage: 10,
      })),
    };
    getRatesGeographyWorld.mockResolvedValueOnce(expanded);
    const { wrapper } = mountModal();
    await flushPromises();
    const rows = document.body.querySelectorAll("[aria-label='Top 10 países'] li");
    expect(rows).toHaveLength(10);
    expect([...rows].map((row) => row.textContent?.match(/País [A-Z]{2}/)?.[0]))
      .toEqual(codes.slice(0, 10).map((code) => `País ${code}`));
    wrapper.unmount();
  });

  it("shows an empty state separately from HTTP errors", async () => {
    getRatesGeographyWorld.mockResolvedValueOnce({ totalRatedDiscs: 0, mappedDiscs: 0, unmappedDiscs: 0, countryCount: 0, countries: [] });
    const { wrapper } = mountModal();
    await flushPromises();
    expect(Boolean(document.body.querySelector("[data-test='world-empty']"))).toBe(true);
    expect(Boolean(document.body.querySelector("[role='alert']"))).toBe(false);
    wrapper.unmount();
  });

  it("distinguishes HTTP errors and retries", async () => {
    getRatesGeographyWorld.mockRejectedValueOnce(new Error("503")).mockResolvedValueOnce(response);
    const { wrapper } = mountModal();
    await flushPromises();
    expect(Boolean(document.body.querySelector("[data-test='world-http-error']"))).toBe(true);
    await query<HTMLButtonElement>("[data-test='world-http-error'] button").click();
    await flushPromises();
    expect(getRatesGeographyWorld).toHaveBeenCalledTimes(2);
    expect(Boolean(document.body.querySelector("[aria-label='Top 10 países']"))).toBe(true);
    wrapper.unmount();
  });

  it("closes on Escape, cancels the request, restores focus and unlocks background scroll", async () => {
    let signal: AbortSignal | undefined;
    let resolveLate: ((value: RatesGeographyWorldResponseDto) => void) | undefined;
    getRatesGeographyWorld.mockImplementationOnce((requestSignal: AbortSignal) => {
      signal = requestSignal;
      return new Promise((resolve) => { resolveLate = resolve; });
    });
    const { wrapper, opener } = mountModal();
    await flushPromises();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(query("[aria-label='Cerrar mapa mundial']"));
    const dialog = query("[data-test='musical-world-modal']");
    const focusableElements = dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
    focusableElements[focusableElements.length - 1]?.focus();
    await document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(focusableElements[0]);
    await document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    resolveLate?.(response);
    await flushPromises();
    expect(Boolean(document.body.querySelector("[aria-label='Top 10 países']"))).toBe(false);
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
    await flushPromises();
    expect(signal?.aborted).toBe(true);
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("cancels and reloads after the authenticated session changes", async () => {
    let oldSignal: AbortSignal | undefined;
    getRatesGeographyWorld.mockImplementationOnce((requestSignal: AbortSignal) => {
      oldSignal = requestSignal;
      return new Promise(() => undefined);
    }).mockResolvedValueOnce(response);
    const pinia = authenticatedPinia();
    const auth = useAuthStore(pinia);
    const { wrapper } = mountModal(pinia);
    await flushPromises();
    auth.$patch({ userId: "user-b", authSessionGeneration: auth.authSessionGeneration + 1 });
    await flushPromises();
    expect(oldSignal?.aborted).toBe(true);
    expect(getRatesGeographyWorld).toHaveBeenCalledTimes(2);
    expect((document.body.textContent ?? "")).toContain("España");
    wrapper.unmount();
  });

  it("keeps the map geometry failure distinct while preserving textual ranking", async () => {
    const { wrapper } = mountModal();
    await flushPromises();
    const modalSource = await import("node:fs").then(({ readFileSync }) =>
      readFileSync("src/modules/dashboard/widgets/musical-world/components/DashboardMusicalWorldModal.vue", "utf8"),
    );
    expect(modalSource).toContain("No se pudo cargar la geometría del mapa");
    expect(Boolean(document.body.querySelector("[aria-label='Top 10 países']"))).toBe(true);
    expect((document.body.textContent ?? "")).toContain("Made with Natural Earth");
    wrapper.unmount();
  });
});
