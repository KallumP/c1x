import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { uploadLevel, type LevelModio } from "../../scripts/levelUpload";
import type { LevelMod, NewLevel } from "../../scripts/modio";

let root: string; // a stand-in for level_src/

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "level_src-"));
  mkdirSync(join(root, "my_level"));
  writeFileSync(join(root, "my_level", "my_level.obj"), "v 0 0 0");
});
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

const LOGO = new Uint8Array([1, 2, 3]);
const DETAILS = { name: "My Level", summary: "A level.", logo: LOGO };
const ONLINE: LevelMod = { id: 17302, page: "https://test.mod.io/m/my-level" };
const NEW_MOD: LevelMod = { id: 20000, page: "https://test.mod.io/m/new" };

// stand-ins for mod.io's calls: the player has the mod own (or none), and each
// call answers as given; what they were sent is kept
type Refusals = Partial<Record<keyof LevelModio, { problem: string }>>;

function standInModio(own: LevelMod | null, answers: Refusals = {}) {
  const sent = {
    newLevels: [] as NewLevel[],
    files: [] as { modId: number; zip: Uint8Array }[],
    logos: [] as { modId: number; logo: Uint8Array }[],
    tokens: [] as string[],
  };
  const modio: LevelModio = {
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
    setLevelLogo: async (token, modId, logo) => {
      sent.tokens.push(token);
      sent.logos.push({ modId, logo });
      return answers.setLevelLogo ?? {};
    },
  };
  return { modio, sent };
}

describe("uploading a level that isn't online yet", () => {
  test("adds it as a new mod, with its details and folder name", async () => {
    const { modio, sent } = standInModio(null);
    await uploadLevel("token", root, "my_level", DETAILS, modio);
    expect(sent.newLevels).toEqual([{ ...DETAILS, folder: "my_level" }]);
  });

  test("adds its zip to the new mod", async () => {
    const { modio, sent } = standInModio(null);
    await uploadLevel("token", root, "my_level", DETAILS, modio);
    expect(sent.files.map((file) => file.modId)).toEqual([NEW_MOD.id]);
    expect(Object.keys(unzipSync(sent.files[0].zip))).toEqual(["my_level/my_level.obj"]);
  });

  test("is the new mod, said to be new", async () => {
    const { modio } = standInModio(null);
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({ mod: NEW_MOD, isNew: true });
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
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({ mod: ONLINE, isNew: false });
  });
});

describe("uploading a level mod.io refuses", () => {
  test("is why mod.io couldn't say if it's online", async () => {
    const { modio, sent } = standInModio(null, { findOwnLevelMod: { problem: "expired" } });
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({ problem: "expired" });
    expect(sent.files).toEqual([]);
  });

  test("is why mod.io didn't add its mod, adding no file", async () => {
    const { modio, sent } = standInModio(null, { addLevelMod: { problem: "logo too small" } });
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({ problem: "logo too small" });
    expect(sent.files).toEqual([]);
  });

  test("is why mod.io didn't add its file", async () => {
    const { modio } = standInModio(ONLINE, { addLevelFile: { problem: "zip too big" } });
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({ problem: "zip too big" });
  });
});

describe("a level's picture", () => {
  const KEEP_LOGO = { ...DETAILS, logo: null };

  test("is set on a level already online when there's a new one", async () => {
    const { modio, sent } = standInModio(ONLINE);
    await uploadLevel("token", root, "my_level", DETAILS, modio);
    expect(sent.logos).toEqual([{ modId: ONLINE.id, logo: LOGO }]);
  });

  test("is kept on a level already online when there's no new one", async () => {
    const { modio, sent } = standInModio(ONLINE);
    await uploadLevel("token", root, "my_level", KEEP_LOGO, modio);
    expect(sent.logos).toEqual([]);
    expect(sent.files.map((file) => file.modId)).toEqual([ONLINE.id]);
  });

  test("is only sent with a new level's mod, not set again", async () => {
    const { modio, sent } = standInModio(null);
    await uploadLevel("token", root, "my_level", DETAILS, modio);
    expect(sent.logos).toEqual([]);
  });

  test("is needed for a new level", async () => {
    const { modio, sent } = standInModio(null);
    expect(await uploadLevel("token", root, "my_level", KEEP_LOGO, modio)).toEqual({
      problem: "A level needs a picture the first time it's uploaded.",
    });
    expect([sent.newLevels, sent.files]).toEqual([[], []]);
  });

  test("is why mod.io didn't set it", async () => {
    const { modio } = standInModio(ONLINE, { setLevelLogo: { problem: "The logo is too small." } });
    expect(await uploadLevel("token", root, "my_level", DETAILS, modio)).toEqual({ problem: "The logo is too small." });
  });
});
