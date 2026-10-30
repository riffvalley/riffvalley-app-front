import { describe, expect, it } from "vitest";
import { feedbackErrorMessage } from "./feedbackErrorMessage";

describe("feedbackErrorMessage", () => {
  it("uses a server message when the error carries one", () => {
    expect(feedbackErrorMessage({ response: { data: { message: "Rejected by server" } } }, "Fallback"))
      .toBe("Rejected by server");
  });

  it("uses the fallback for non-HTTP errors and incomplete response data", () => {
    expect(feedbackErrorMessage(new Error("offline"), "Fallback")).toBe("Fallback");
    expect(feedbackErrorMessage({ response: { data: { message: 42 } } }, "Fallback")).toBe("Fallback");
  });
});
