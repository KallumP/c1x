import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { uploadLevel, type UploadCalls } from "../../scripts/levelUpload";
import type { LevelMod, NewLevel } from "../../scripts/modio";

let root: string; // a stand-in for level_src/

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "level_src-"));
  mkdirSync(join(root, "my_level"));
  writeFileSync(join(root, "my_level", "my_level.obj"), "v 0 0 0");
});
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

const LOGO = new Uint8Array([1, 2, 3]);
const DETAILS = { name: "My Level", logo: LOGO };
const ONLINE: LevelMod = { id: 17302 };
const NEW_MOD: LevelMod = { id: 20000 };

// stand-ins for mod.io's calls: the player has the mod own (or none), and each
// call answers as given; what they were sent is kept
type Refusals = Partial<Record<keyof UploadCalls, { problem: string }>>;

function standInModio(own: LevelMod | null, answers: Refusals = {}) {
  const sent = {
    newLevels: [] as NewLevel[],
    files: [] as { modId: number; zip: Uint8Array }[],
    tokens: [] as string[],
  };
  const modio: UploadCalls = {
    findOwnLevelMod: async (token) => {
      sent.tokens.push(token);
      return answers.findOwnLevelMod ?? own;
    },
    addLevelMod: async (token, level) => {
      sent.tokens.push(token);
      sent.newLevels.push(level);
      return answers.addLevelMod ?? NEW_MOD;
    },
    addLevelFile: async (token, modId, zip) => {
      sent.tokens.push(token);
      sent.files.push({ modId, zip });
      return answers.addLevelFile ?? {};
    },
  };
  return { modio, sent };
}

describe("uploading a level that isn't online yet", () => {
  test("adds it as a new mod, with its name, picture and folder name", async () => {
    const { modio, sent } = standInModio(null);
    await uploadLevel("token", root, "my_level", DETAILS, modio);
    expect(sent.newLevels).toMatchObject([{ ...DETAILS, folder: "my_level" }]);
  });

  test("gives the new mod a summary made from its name", async () => {
    const { modio, sent } = standInModio(null);
    await uploadLevel("token", root, "my_level", DETAILS, modio);
    expect(sent.newLevels[0].summary).toBe("My Level, a custom level for c1x.");
  });

  test("adds its zip to the new mod", async () => {
    const { modio, sent } = standInModio(null);
    await uploadLevel("token", root, "my_level", DETAILS, modio);
    expect(sent.files.map((file) => file.modId)).toEqual([NEW_MOD.id]);
  });

  test("is the new mod, said to be new", async () => {
    const { modio } = standInModio(null);
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({
      mod: NEW_MOD,
      isNew: true,
    });
  });

  test("signs each call in with the player's token", async () => {
    const { modio, sent } = standInModio(null);
    await uploadLevel("token", root, "my_level", DETAILS, modio);
    expect(sent.tokens).toEqual(["token", "token", "token"]);
  });
});

describe("uploading a level that's already online", () => {
  test("adds no new mod", async () => {
    const { modio, sent } = standInModio(ONLINE);
    await uploadLevel("token", root, "my_level", DETAILS, modio);
    expect(sent.newLevels).toEqual([]);
  });

  test("adds its zip to the mod it has", async () => {
    const { modio, sent } = standInModio(ONLINE);
    await uploadLevel("token", root, "my_level", DETAILS, modio);
    expect(sent.files.map((file) => file.modId)).toEqual([ONLINE.id]);
  });

  test("is the mod it has, not said to be new", async () => {
    const { modio } = standInModio(ONLINE);
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({
      mod: ONLINE,
      isNew: false,
    });
  });
});

describe("uploading a level whose folder the game can't boot", () => {
  beforeEach(() => {
    mkdirSync(join(root, "my level"));
    writeFileSync(join(root, "my level", "my_level.obj"), "v 0 0 0");
  });

  test("says to rename its folder", async () => {
    const { modio } = standInModio(null);
    expect(await uploadLevel("token", root, "my level", DETAILS, modio)).toEqual({
      problem: "Rename the level's folder, my level, to only letters, digits, _ and - "
        + "first: otherwise players can't download it.",
    });
  });

  test("asks mod.io nothing", async () => {
    const { modio, sent } = standInModio(null);
    await uploadLevel("token", root, "my level", DETAILS, modio);
    expect(sent.tokens).toEqual([]);
  });
});

describe("uploading a level that comes with c1x", () => {
  beforeEach(() => {
    writeFileSync(join(root, "included_levels.txt"), "# the levels that come with c1x\nmy_level\n");
  });

  test("says it can't be uploaded", async () => {
    const { modio } = standInModio(null);
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({
      problem: "This level comes with c1x, so it can't be uploaded.",
    });
  });

  test("asks mod.io nothing", async () => {
    const { modio, sent } = standInModio(null);
    await uploadLevel("token", root, "my_level", DETAILS, modio);
    expect(sent.tokens).toEqual([]);
  });
});

describe("uploading a level mod.io refuses", () => {
  test("is why mod.io couldn't say if it's online", async () => {
    const { modio, sent } = standInModio(
      null,
      { findOwnLevelMod: { problem: "expired" } },
    );
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({
      problem: "expired",
    });
    expect(sent.files).toEqual([]);
  });

  test("is why mod.io didn't add its mod, adding no file", async () => {
    const { modio, sent } = standInModio(
      null,
      { addLevelMod: { problem: "logo too small" } },
    );
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({
      problem: "logo too small",
    });
    expect(sent.files).toEqual([]);
  });

  test("is why mod.io didn't add its file", async () => {
    const { modio } = standInModio(ONLINE, { addLevelFile: { problem: "zip too big" } });
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({
      problem: "zip too big",
    });
  });
});

describe("a level's picture", () => {
  test("is needed for a new level", async () => {
    const { modio, sent } = standInModio(null);
    const noLogo = { ...DETAILS, logo: null };
    expect(await uploadLevel("token", root, "my_level", noLogo, modio)).toEqual({
      problem: "A level needs a picture the first time it's uploaded.",
    });
    expect([sent.newLevels, sent.files]).toEqual([[], []]);
  });

  test("isn't needed for a new version", async () => {
    const { modio } = standInModio(ONLINE);
    const noLogo = { ...DETAILS, logo: null };
    expect(await uploadLevel("token", root, "my_level", noLogo, modio)).toEqual({
      mod: ONLINE,
      isNew: false,
    });
  });
});
