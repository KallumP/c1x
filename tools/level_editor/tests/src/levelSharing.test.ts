import { describe, expect, test } from "vitest";
import {
  firstPictureChoice,
  onlineText,
  pictureChoices,
  pictureProblem,
  SUMMARY_MAX,
  summaryProblem,
  uploadButtonText,
  uploadedText,
} from "../../src/levelSharing";

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

describe("what an upload says, around its link to mod.io", () => {
  test("for a new level, where to view it", () => {
    expect(uploadedText({ mod: MOD, isNew: true })).toEqual({ before: "Upload successful, view it", link: "here", after: "." });
  });

  test("for a level already online, where to view its new version", () => {
    expect(uploadedText({ mod: MOD, isNew: false })).toEqual({
      before: "Upload successful, view the new version",
      link: "here",
      after: ".",
    });
  });
});

describe("what the dialog says of a map, around its link to mod.io", () => {
  test("once it's online, that it's been uploaded, where to view it, and that it can be again", () => {
    expect(onlineText(true)).toEqual({
      before: "This map has already been uploaded to mod.io, view it",
      link: "here",
      after: ". Alternatively, upload a new version below.",
    });
  });

  test("before it's online, that it isn't yet, with no link", () => {
    expect(onlineText(false)).toEqual({ before: "This map isn't on mod.io yet.", link: null, after: "" });
  });
});

describe("the level's picture", () => {
  test("is the view or an image for a level that isn't online", () => {
    expect(pictureChoices(false)).toEqual(["view", "image"]);
  });

  test("can also be kept as it is once it's online", () => {
    expect(pictureChoices(true)).toEqual(["keep", "view", "image"]);
  });

  test("starts as the view for a new level", () => {
    expect(firstPictureChoice(false)).toBe("view");
  });

  test("starts kept as it is once it's online", () => {
    expect(firstPictureChoice(true)).toBe("keep");
  });

  test("needs an image chosen to be an image", () => {
    expect(pictureProblem("image", false)).toBe("Choose an image for its picture first.");
  });

  test("is fine as an image once one's chosen", () => {
    expect(pictureProblem("image", true)).toBeNull();
  });

  test.each(["keep", "view"] as const)("is fine as %s without an image", (choice) => {
    expect(pictureProblem(choice, false)).toBeNull();
  });
});
