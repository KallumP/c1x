import { describe, expect, test } from "vitest";
import { fetchOwnLevelMod } from "../../src/modioApi";
import {
  onlineText,
  pictureChoices,
  pictureProblem,
  SUMMARY_MAX,
  summaryProblem,
  failureOutcome,
  uploadAfterSaving,
  uploadProblem,
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
    expect(summaryProblem("a".repeat(SUMMARY_MAX + 1))).toBe(
      `A summary can be at most ${SUMMARY_MAX} characters.`,
    );
  });
});

describe("the upload button", () => {
  test.each([
    [false, "Upload"],
    [true, "Upload new version"],
  ])("for a level online (%s) says %j", (isOnline, text) => {
    expect(uploadButtonText(isOnline)).toBe(text);
  });
});

describe("what an upload says", () => {
  test("for a new level, that it uploaded", () => {
    expect(uploadedText({ mod: MOD, isNew: true })).toBe("Upload successful.");
  });

  test("for a level already online, that its new version uploaded", () => {
    expect(uploadedText({ mod: MOD, isNew: false })).toBe("Upload successful, a new version is up.");
  });
});

describe("what the dialog says of a map", () => {
  test("once it's online, that it's been uploaded and can be again", () => {
    expect(onlineText(true)).toBe(
      "This map has already been uploaded to mod.io. Alternatively, upload a new version below.",
    );
  });

  test("before it's online, that it isn't yet", () => {
    expect(onlineText(false)).toBe("This map isn't on mod.io yet.");
  });
});

describe("the level's picture", () => {
  test("is the view or an image for a level that isn't online", () => {
    expect(pictureChoices(false)).toEqual(["view", "image"]);
  });

  test("can also be kept as it is once it's online", () => {
    expect(pictureChoices(true)).toEqual(["keep", "view", "image"]);
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

describe("whether an upload can go ahead", () => {
  test("a new level needs a summary", () => {
    expect(uploadProblem(false, "", "view", false)).toBe(summaryProblem(""));
  });

  test("a level already online keeps its summary, so needs none", () => {
    expect(uploadProblem(true, "", "keep", false)).toBeNull();
  });

  test("a new level with a summary and the view as its picture can", () => {
    expect(uploadProblem(false, "A beach.", "view", false)).toBeNull();
  });
});

describe("what a failed request does", () => {
  const refusedWith = (status: number) => async () => new Response("refused", { status });

  async function failureOf(status: number) {
    try {
      await fetchOwnLevelMod("1_tide_ruins", refusedWith(status));
    } catch (error) {
      return failureOutcome(error);
    }
    return null;
  }

  test("signs the player out when their sign-in was refused", async () => {
    expect(await failureOf(401)).toEqual({ signOut: true });
  });

  test("says why otherwise", async () => {
    expect(await failureOf(400)).toEqual({ problem: "refused" });
  });
});

describe("uploading after saving", () => {
  const UPLOADED = { mod: MOD, isNew: true };

  test("uploads once it's saved", async () => {
    expect(await uploadAfterSaving(async () => true, async () => UPLOADED)).toEqual(
      UPLOADED,
    );
  });

  test("uploads nothing when it doesn't save", async () => {
    let wasUploaded = false;
    const upload = async () => {
      wasUploaded = true;
      return UPLOADED;
    };
    expect(await uploadAfterSaving(async () => false, upload)).toBeNull();
    expect(wasUploaded).toBe(false);
  });
});
