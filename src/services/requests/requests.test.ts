// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { getRequestErrorMessage } from "./requests";

describe("getRequestErrorMessage", () => {
  it.each([400, 404])("converts HTTP %i validation message arrays to strings", (status) => {
    const error = {
      response: { status, data: { message: ["Invalid releaseDate", "Country not found"] } },
    };

    expect(getRequestErrorMessage(error, "Request failed")).toBe(
      "Invalid releaseDate. Country not found",
    );
  });

  it("preserves string messages and falls back for missing messages", () => {
    expect(
      getRequestErrorMessage(
        { response: { data: { message: "Genre not found" } } },
        "Request failed",
      ),
    ).toBe("Genre not found");
    expect(getRequestErrorMessage(new Error("Network error"), "Request failed")).toBe(
      "Request failed",
    );
  });
});
