// a level source's level.cfg: the scale and turn the level is built with, one
// "key = value" a line. the build reads it strictly, so a mistake stops it with
// a message; the editor reads it leniently (server/levelCfg.ts)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_SCALE } from "../src/coords";

export const LEVEL_CFG = "level.cfg";

export interface LevelOptions {
  scale: number; // game units per blender metre
  turn: number;  // degrees to turn the level about the up axis
}

const SETTINGS = ["scale", "turn"];

const isComment = (line: string) => line === "" || line.startsWith("#");
const isWholeNumber = (value: string) => /^[+-]?\d+$/.test(value);

// the setting one line gives; anything that isn't scale or turn set to a whole number is an error
function readSetting(line: string, where: string): [keyof LevelOptions, number] {
  const equals = line.indexOf("=");
  if (equals < 0) {
    throw new Error(`${where}: expected key = value`);
  }
  const key = line.slice(0, equals).trim();
  const value = line.slice(equals + 1).trim();
  if (!SETTINGS.includes(key)) {
    throw new Error(`${where}: unknown setting ${key} (it takes scale and turn)`);
  }
  if (!isWholeNumber(value)) {
    throw new Error(`${where}: ${key} has to be a whole number, not ${value || "nothing"}`);
  }
  return [key as keyof LevelOptions, Number(value)];
}

// the settings the level.cfg in folder gives (none without one)
export function readLevelCfg(folder: string): Partial<LevelOptions> {
  const path = join(folder, LEVEL_CFG);
  if (!existsSync(path)) {
    return {};
  }
  const settings: Partial<LevelOptions> = {};
  readFileSync(path, "utf8").split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!isComment(line)) {
      const [key, value] = readSetting(line, `${path}, line ${index + 1}`);
      settings[key] = value;
    }
  });
  return settings;
}

// the scale and turn for the level source in folder: those given, else its level.cfg's, else the defaults
export function levelOptions(folder: string, given: Partial<LevelOptions> = {}): LevelOptions {
  const settings = readLevelCfg(folder);
  return {
    scale: given.scale ?? settings.scale ?? DEFAULT_SCALE,
    turn: given.turn ?? settings.turn ?? 0,
  };
}
