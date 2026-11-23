// uploading a level source to mod.io as the signed-in player: a new mod the
// first time, then a new file on that same mod each time after
import { zipLevel } from "./levelZip";
import * as modio from "./modio";
import { isProblem, type Answer, type LevelMod } from "./modio";

// mod.io's calls the upload makes, or a test's stand-ins for them
export interface UploadCalls {
  findOwnLevelMod: typeof modio.findOwnLevelMod;
  addLevelMod: typeof modio.addLevelMod;
  addLevelFile: typeof modio.addLevelFile;
  setLevelLogo: typeof modio.setLevelLogo;
}

// what players see of a level's mod: its name and summary when it's new, and its
// picture, new or (null) kept as it is
export interface LevelDetails {
  name: string;
  summary: string;
  logo: Uint8Array | null;
}

const NO_LOGO = { problem: "A level needs a picture the first time it's uploaded." };

export interface Uploaded {
  mod: LevelMod;
  isNew: boolean; // whether its mod was added, rather than updated
}

// the level's mod, already online, with its picture set to logo if there's one
async function updateExistingMod(
  token: string,
  mod: LevelMod,
  logo: Uint8Array | null,
  calls: UploadCalls,
): Promise<Answer<Uploaded>> {
  if (logo) {
    const set = await calls.setLevelLogo(token, mod.id, logo);
    if (isProblem(set)) {
      return set;
    }
  }
  return { mod, isNew: false };
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
    return updateExistingMod(token, own, details.logo, calls);
  }
  const { logo } = details;
  if (!logo) {
    return NO_LOGO;
  }
  const added = await calls.addLevelMod(token, { ...details, logo, folder: name });
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
