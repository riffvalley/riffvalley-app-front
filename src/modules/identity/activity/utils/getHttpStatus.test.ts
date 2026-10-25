import { describe, expect, it } from "vitest";
import { getHttpStatus } from "./getHttpStatus";

describe("getHttpStatus", () => {
  it.each([401, 403, 404])("returns numeric HTTP status %i", (status) => {
    expect(getHttpStatus({ response: { status } })).toBe(status);
  });

  it("returns undefined when the error has no response status", () => {
    expect(getHttpStatus(new Error("request failed"))).toBeUndefined();
    expect(getHttpStatus({})).toBeUndefined();
    expect(getHttpStatus({ response: {} })).toBeUndefined();
  });

  it("returns undefined for unexpected error values and response shapes", () => {
    expect(getHttpStatus(null)).toBeUndefined();
    expect(getHttpStatus(undefined)).toBeUndefined();
    expect(getHttpStatus("401")).toBeUndefined();
    expect(getHttpStatus({ response: null })).toBeUndefined();
    expect(getHttpStatus({ response: "unavailable" })).toBeUndefined();
    expect(getHttpStatus({ response: { status: "401" } })).toBeUndefined();
  });

  it("preserves numeric status values without imposing extra validation", () => {
    expect(getHttpStatus({ response: { status: 0 } })).toBe(0);
    expect(getHttpStatus({ response: { status: Number.NaN } })).toBeNaN();
  });
});
