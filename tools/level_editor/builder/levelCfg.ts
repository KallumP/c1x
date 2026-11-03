// a level source's level.cfg: the scale, turn and sky the level is built with,
// one "key = value" a line. the build reads it strictly, so a mistake stops it
// with a message; the editor reads it leniently (server/levelCfg.ts)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_SCALE } from "../src/coords";
import { DEFAULT_SKY, isSkySplit, parseRgb, SKY_ROWS, type Rgb, type Sky } from "../src/sky";

export const LEVEL_CFG = "level.cfg";

export interface LevelOptions {
  scale: number; // game units per blender metre
  turn: number;  // degrees to turn the level about the up axis
  sky: Sky;
}

// what a level.cfg sets, each by its key
export interface LevelCfgSettings {
  scale?: number;
  turn?: number;
  sky_top?: Rgb;
  sky_bottom?: Rgb;
  sky_split?: number;
}

const WHOLE_NUMBERS = ["scale", "turn"];
const COLOURS = ["sky_top", "sky_bottom"];
const SETTINGS = [...WHOLE_NUMBERS, ...COLOURS, "sky_split"];

const isComment = (line: string) => line === "" || line.startsWith("#");
const isWholeNumber = (value: string) => /^[+-]?\d+$/.test(value);

function readWholeNumber(key: string, value: string, where: string): number {
  if (!isWholeNumber(value)) {
    throw new Error(`${where}: ${key} has to be a whole number, not ${value || "nothing"}`);
  }
  return Number(value);
}

function readColour(key: string, value: string, where: string): Rgb {
  const colour = parseRgb(value);
  if (!colour) {
    throw new Error(`${where}: ${key} has to be red, green, blue (0 to 255 each), not ${value || "nothing"}`);
  }
  return colour;
}

function readSkySplit(value: string, where: string): number {
  const split = readWholeNumber("sky_split", value, where);
  if (!isSkySplit(split)) {
    throw new Error(`${where}: sky_split has to be 0 to ${SKY_ROWS}, not ${value}`);
  }
  return split;
}

// the setting one line gives; an unknown setting, or a value it can't take, is an error
function readSetting(line: string, where: string): [keyof LevelCfgSettings, number | Rgb] {
  const equals = line.indexOf("=");
  if (equals < 0) {
    throw new Error(`${where}: expected key = value`);
  }
  const key = line.slice(0, equals).trim();
  const value = line.slice(equals + 1).trim();
  if (!SETTINGS.includes(key)) {
    throw new Error(`${where}: unknown setting ${key} (it takes ${SETTINGS.join(", ")})`);
  }
  if (COLOURS.includes(key)) {
    return [key as keyof LevelCfgSettings, readColour(key, value, where)];
  }
  if (key === "sky_split") {
    return [key, readSkySplit(value, where)];
  }
  return [key as keyof LevelCfgSettings, readWholeNumber(key, value, where)];
}

// the settings the level.cfg in folder gives (none without one)
export function readLevelCfg(folder: string): LevelCfgSettings {
  const path = join(folder, LEVEL_CFG);
  if (!existsSync(path)) {
    return {};
  }
  const settings: Record<string, number | Rgb> = {};
  readFileSync(path, "utf8").split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!isComment(line)) {
      const [key, value] = readSetting(line, `${path}, line ${index + 1}`);
      settings[key] = value;
    }
  });
  return settings as LevelCfgSettings;
}

// the level's sky: what its level.cfg sets, else n. sanity beach's
function skyOf(settings: LevelCfgSettings): Sky {
  return {
    top: settings.sky_top ?? DEFAULT_SKY.top,
    bottom: settings.sky_bottom ?? DEFAULT_SKY.bottom,
    split: settings.sky_split ?? DEFAULT_SKY.split,
  };
}

// the scale, turn and sky for the level source in folder: those given, else its level.cfg's, else the defaults
export function levelOptions(folder: string, given: Partial<LevelOptions> = {}): LevelOptions {
  const settings = readLevelCfg(folder);
  return {
    scale: given.scale ?? settings.scale ?? DEFAULT_SCALE,
    turn: given.turn ?? settings.turn ?? 0,
    sky: given.sky ?? skyOf(settings),
  };
}
