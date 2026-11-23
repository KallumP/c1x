import { describe, expect, test } from "vitest";
import { SUMMARY_MAX, summaryProblem, uploadButtonText, uploadedText } from "../../src/levelSharing";

const MOD = { id: 17302, page: "https://test.mod.io/m/tide-ruins" };

describe("a level's summary on mod.io", () => {
  test("is fine with some words", () => {
    expect(summaryProblem("A beach with crabs.")).toBeNull();
  });

  test("needs writing", () => {
    expect(summaryProblem("  ")).toBe("Write a summary for players first.");
  });

  test("is fine at mod.io's longest", () => {
    expect(summaryProblem("a".repeat(SUMMARY_MAX))).toBeNull();
  });

  test("can't be longer than mod.io takes", () => {
    expect(summaryProblem("a".repeat(SUMMARY_MAX + 1))).toBe(`A summary can be at most ${SUMMARY_MAX} characters.`);
  });
});

describe("the upload button", () => {
  test("uploads a level that isn't online", () => {
    expect(uploadButtonText(false)).toBe("Upload");
  });

  test("uploads a new version of one that is", () => {
    expect(uploadButtonText(true)).toBe("Upload new version");
  });
});

describe("what an upload says", () => {
  test("for a new level, that it's on mod.io", () => {
    expect(uploadedText({ mod: MOD, isNew: true })).toBe("It's on mod.io.");
  });

  test("for a level already online, that its new version is", () => {
    expect(uploadedText({ mod: MOD, isNew: false })).toBe("Its new version is on mod.io.");
  });
});
