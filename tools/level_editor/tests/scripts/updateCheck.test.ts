import { describe, expect, test } from "vitest";
import { checkUpdate, isNewer, newerReleaseLine, versionNumbers } from "../../scripts/updateCheck";

describe("a version's numbers", () => {
  test("are its two numbers", () => {
    expect(versionNumbers("1.4")).toEqual([1, 4]);
  });

  test("are a tag's, after its v", () => {
    expect(versionNumbers("v1.12")).toEqual([1, 12]);
  });

  test("aren't there for anything else", () => {
    ["", "1", "1.4.2", "v1.4-beta", "latest"].forEach((version) => expect(versionNumbers(version)).toBeUndefined());
  });
});

describe("a release is newer", () => {
  test("with a higher second number, compared as a number", () => {
    expect(isNewer("v1.10", "1.9")).toBe(true);
  });

  test("with a higher first number", () => {
    expect(isNewer("v2.0", "1.9")).toBe(true);
  });

  test("not when it's the same version", () => {
    expect(isNewer("v1.4", "1.4")).toBe(false);
  });

  test("not when it's older", () => {
    expect(isNewer("v1.3", "1.4")).toBe(false);
    expect(isNewer("v1.9", "2.0")).toBe(false);
  });

  test("not when its tag or the version isn't a version", () => {
    expect(isNewer("nightly", "1.4")).toBe(false);
    expect(isNewer("v1.5", "")).toBe(false);
  });
});

describe("what's said of the latest release", () => {
  test("is its version and its page, when it's newer", () => {
    expect(newerReleaseLine("1.4", { tag: "v1.5" })).toBe(
      "newer release: 1.5 https://github.com/KallumP/c1x/releases/tag/v1.5",
    );
  });

  test("has a tag without a v as it is in its page", () => {
    expect(newerReleaseLine("1.4", { tag: "1.5" })).toBe(
      "newer release: 1.5 https://github.com/KallumP/c1x/releases/tag/1.5",
    );
  });

  test("is nothing when it isn't newer", () => {
    expect(newerReleaseLine("1.5", { tag: "v1.5" })).toBe("");
  });

  test("is nothing when there's no telling what it is", () => {
    expect(newerReleaseLine("1.4", undefined)).toBe("");
  });
});

describe("checking for an update", () => {
  const logged = async (version: string, tag: string | undefined): Promise<string[]> => {
    const lines: string[] = [];
    await checkUpdate(version, (line) => lines.push(line), async () => (tag ? { tag } : undefined));
    return lines;
  };

  test("says there's a newer release", async () => {
    expect(await logged("1.4", "v1.5")).toEqual(["newer release: 1.5 https://github.com/KallumP/c1x/releases/tag/v1.5"]);
  });

  test("says nothing when up to date", async () => {
    expect(await logged("1.5", "v1.5")).toEqual([]);
  });

  test("says nothing when GitHub can't be asked", async () => {
    expect(await logged("1.4", undefined)).toEqual([]);
  });
});
