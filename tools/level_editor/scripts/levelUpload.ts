// uploading a level source to mod.io as the signed-in player: a new mod the
// first time, then a new file on that same mod each time after
import { zipLevel } from "./levelZip";
import * as modio from "./modio";
import { isProblem, type Answer } from "./answer";
import type { LevelMod } from "./modio";

// mod.io's calls the upload makes, or a test's stand-ins for them
export interface UploadCalls {
  findOwnLevelMod: typeof modio.findOwnLevelMod;
  addLevelMod: typeof modio.addLevelMod;
  addLevelFile: typeof modio.addLevelFile;
}

// what players see of a new level's mod: its name and picture (null if there's
// none, which only a new version can do without, as it keeps its own)
export interface LevelDetails {
  name: string;
  logo: Uint8Array | null;
}

// mod.io needs a summary for a new mod: one made from the level's name
const levelSummary = (name: string) => `${name}, a custom level for c1x.`;

const NO_LOGO = { problem: "A level needs a picture the first time it's uploaded." };

export interface Uploaded {
  mod: LevelMod;
  isNew: boolean; // whether its mod was added, rather than updated
}

// the player's mod for level_src/<name>, adding one if they don't have it yet
async function findOrAddLevelMod(
  token: string,
  name: string,
  details: LevelDetails,
  calls: UploadCalls,
): Promise<Answer<Uploaded>> {
  const own = await calls.findOwnLevelMod(token, name);
  if (isProblem(own)) {
    return own;
  }
  if (own) {
    return { mod: own, isNew: false };
  }
  const { name: title, logo } = details;
  if (!logo) {
    return NO_LOGO;
  }
  const level = { name: title, summary: levelSummary(title), logo, folder: name };
  const added = await calls.addLevelMod(token, level);
  if (isProblem(added)) {
    return added;
  }
  return { mod: added, isNew: true };
}

// uploads level_src/<name>, signed in with the player's token, zipped as the
// newest file of its mod
export async function uploadLevel(
  token: string,
  root: string,
  name: string,
  details: LevelDetails,
  calls: UploadCalls = modio,
): Promise<Answer<Uploaded>> {
  const uploaded = await findOrAddLevelMod(token, name, details, calls);
  if (isProblem(uploaded)) {
    return uploaded;
  }
  const file = await calls.addLevelFile(token, uploaded.mod.id, zipLevel(root, name));
  if (isProblem(file)) {
    return file;
  }
  return uploaded;
}
