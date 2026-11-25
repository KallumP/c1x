import { describe, expect, test } from "vitest";
import { fetchOwnLevelMod } from "../../src/modioApi";
import {
  onlineText,
  failureOutcome,
  showsUpAsText,
  uploadAfterSaving,
  uploadButtonText,
  uploadedText,
} from "../../src/levelSharing";

const MOD = { id: 17302 };

describe("the upload button", () => {
  test.each([
    [false, "Upload"],
    [true, "Update level"],
  ])("for a level online (%s) says %j", (isOnline, text) => {
    expect(uploadButtonText(isOnline)).toBe(text);
  });
});

describe("what the level shows up as on mod.io", () => {
  test("is the title its level.cfg gives", () => {
    expect(showsUpAsText("Ice Climb", "7_my-level")).toBe("This level will show up as: Ice Climb");
  });

  test("without one, its folder's name without its number, underscores and dashes", () => {
    expect(showsUpAsText("", "7_my-level_2")).toBe("This level will show up as: Mylevel");
  });
});

describe("what an upload says", () => {
  test("for a new level, that it uploaded", () => {
    expect(uploadedText({ mod: MOD, isNew: true })).toBe("Upload successful.");
  });

  test("for a level already online, that its new version uploaded", () => {
    expect(uploadedText({ mod: MOD, isNew: false })).toBe(
      "Upload successful, a new version is up.",
    );
  });
});

describe("what the dialog says of a level", () => {
  test("once it's online, that it's been uploaded and can be again", () => {
    expect(onlineText(true)).toBe(
      "This level is already online. You can update the level if you've made changes below.",
    );
  });

  test("before it's online, that it isn't yet", () => {
    expect(onlineText(false)).toBe("This level hasn't been uploaded yet.");
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
