import { describe, expect, test } from "vitest";
import { nextVersion } from "../../scripts/nextVersion";

describe("the next release's version", () => {
  test("is one more than the latest release's tag", () => {
    expect(nextVersion(["v1.3", "v1.4"])).toBe("1.5");
  });

  test("takes the highest tag as the latest, not the last listed", () => {
    expect(nextVersion(["v1.4", "v1.3"])).toBe("1.5");
  });

  test("compares tags as numbers, so 1.10 is after 1.9", () => {
    expect(nextVersion(["v1.9", "v1.10"])).toBe("1.11");
  });

  test("takes a higher first number over a higher second", () => {
    expect(nextVersion(["v1.9", "v2.0"])).toBe("2.1");
  });

  test("ignores tags that aren't two numbers after a v", () => {
    expect(nextVersion(["v1.2.0", "v1.4", "nightly", "1.6"])).toBe("1.5");
  });

  test("is 1.0 without a release", () => {
    expect(nextVersion([])).toBe("1.0");
  });
});
