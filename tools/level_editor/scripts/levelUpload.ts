// uploading a level source to mod.io as the signed-in player: a new mod the
// first time, then a new file on that same mod each time after
import { zipLevel } from "./levelZip";
import * as modio from "./modio";
import { isProblem, type Answer, type LevelMod, type NewLevel } from "./modio";

// mod.io's calls the upload makes, or a test's stand-ins for them
export interface LevelModio {
  findOwnLevelMod: (token: string, folder: string) => Promise<Answer<LevelMod | null>>;
  addLevelMod: (token: string, level: NewLevel) => Promise<Answer<LevelMod>>;
  addLevelFile: (token: string, modId: number, zip: Uint8Array) => Promise<Answer<object>>;
}

// what players see of a new level's mod
export type LevelDetails = Omit<NewLevel, "folder">;

export interface Uploaded {
  mod: LevelMod;
  isNew: boolean; // whether its mod was added, rather than updated
}

// the player's mod for level_src/<name>, adding one if they don't have it yet
async function levelMod(
  token: string,
  name: string,
  details: LevelDetails,
  calls: LevelModio,
): Promise<Answer<Uploaded>> {
  const own = await calls.findOwnLevelMod(token, name);
  if (isProblem(own)) {
    return own;
  }
  if (own) {
    return { mod: own, isNew: false };
  }
  const added = await calls.addLevelMod(token, { ...details, folder: name });
  if (isProblem(added)) {
    return added;
  }
  return { mod: added, isNew: true };
}

// uploads level_src/<name>, as the player token signs in as, zipped as the newest file of its mod
export async function uploadLevel(
  token: string,
  root: string,
  name: string,
  details: LevelDetails,
  calls: LevelModio = modio,
): Promise<Answer<Uploaded>> {
  const uploaded = await levelMod(token, name, details, calls);
  if (isProblem(uploaded)) {
    return uploaded;
  }
  const file = await calls.addLevelFile(token, uploaded.mod.id, zipLevel(root, name));
  if (isProblem(file)) {
    return file;
  }
  return uploaded;
}
