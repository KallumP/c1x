import { describe, expect, test } from "vitest";
import { errorMessage } from "../../src/errorMessage";

describe("an error's message", () => {
  test("is an Error's own message", () => {
    expect(errorMessage(new Error("couldn't read it"))).toBe("couldn't read it");
  });

  test("is anything else thrown, as text", () => {
    expect(errorMessage("offline")).toBe("offline");
  });
});
