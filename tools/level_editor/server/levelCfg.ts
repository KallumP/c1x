// a level source's level.cfg (see doc/custom_levels.md): the turn, scale, sky,
// camera and music the level is built with (builder/levelCfg.ts reads it for the build),
// read and set by the editor
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CAMERA_ANGLE_MAX, CAMERA_ANGLE_MIN, CAMERA_DISTANCE_MAX, CAMERA_DISTANCE_MIN, DEFAULT_CAMERA, isCameraAngle, isCameraDistance, type Camera } from "../src/camera";
import { DEFAULT_SCALE } from "../src/coords";
import { DEFAULT_MUSIC, isMusicName, SOUNDTRACKS } from "../src/music";
import { DEFAULT_SKY, formatRgb, isSkySplit, parseRgb, SKY_ROWS, type Rgb, type Sky } from "../src/sky";
import { levelFolder } from "./levels";

export interface LevelCfg {
  turn: number;  // degrees the build turns the level about the up axis
  scale: number; // game units per blender metre
  sky: Sky;
  camera: Camera;
  music: string; // one of SOUNDTRACKS' names
}

const TURNS = [0, 90, 180, 270]; // the build turns in steps of 90 degrees

const settingLine = (key: string) => new RegExp(`^\\s*${key}\\s*=`);

// the value of the last line setting key, or undefined if none does
function settingValue(text: string, key: string): string | undefined {
  const values = text.split(/\r?\n/).map((line) => new RegExp(`^\\s*${key}\\s*=(.*)$`).exec(line)?.[1].trim());
  return values.filter((value) => value !== undefined).pop();
}

function parseWholeNumber(text: string, key: string, fallback: number): number {
  const value = settingValue(text, key);
  return value !== undefined && /^-?\d+$/.test(value) ? Number(value) : fallback;
}

function parseColour(text: string, key: string, fallback: Rgb): Rgb {
  const value = settingValue(text, key);
  return (value !== undefined && parseRgb(value)) || fallback;
}

function parseSky(text: string): Sky {
  const split = parseWholeNumber(text, "sky_split", DEFAULT_SKY.split);
  return {
    top: parseColour(text, "sky_top", DEFAULT_SKY.top),
    bottom: parseColour(text, "sky_bottom", DEFAULT_SKY.bottom),
    split: isSkySplit(split) ? split : DEFAULT_SKY.split,
  };
}

function parseCamera(text: string): Camera {
  const distance = Number(settingValue(text, "camera_distance"));
  const angle = Number(settingValue(text, "camera_angle"));
  return {
    distance: isCameraDistance(distance) ? distance : DEFAULT_CAMERA.distance,
    angle: isCameraAngle(angle) ? angle : DEFAULT_CAMERA.angle,
  };
}

// the music: a soundtrack's name, jungle rollers' if it isn't one
function parseMusic(text: string): string {
  const music = settingValue(text, "music");
  if (music !== undefined && isMusicName(music)) {
    return music;
  }
  return DEFAULT_MUSIC;
}

// turn, scale, sky, camera and music from level.cfg's text, the defaults for what it doesn't set (or sets wrong)
export function parseLevelCfg(text: string): LevelCfg {
  return {
    turn: parseWholeNumber(text, "turn", 0),
    scale: parseWholeNumber(text, "scale", DEFAULT_SCALE),
    sky: parseSky(text),
    camera: parseCamera(text),
    music: parseMusic(text),
  };
}

const isColour = (colour: Rgb) => colour.length === 3 && colour.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);

function checkLevelCfg(cfg: LevelCfg): void {
  if (!TURNS.includes(cfg.turn)) {
    throw new Error(`turn has to be 0, 90, 180 or 270, not ${cfg.turn}`);
  }
  if (!Number.isInteger(cfg.scale) || cfg.scale <= 0) {
    throw new Error(`scale has to be a whole number above 0, not ${cfg.scale}`);
  }
  for (const [key, colour] of [["sky_top", cfg.sky.top], ["sky_bottom", cfg.sky.bottom]] as const) {
    if (!isColour(colour)) {
      throw new Error(`${key} has to be red, green, blue (0 to 255 each), not ${colour.join(", ")}`);
    }
  }
  if (!isSkySplit(cfg.sky.split)) {
    throw new Error(`sky_split has to be 0 to ${SKY_ROWS}, not ${cfg.sky.split}`);
  }
  if (!isCameraDistance(cfg.camera.distance)) {
    throw new Error(`camera_distance has to be ${CAMERA_DISTANCE_MIN} to ${CAMERA_DISTANCE_MAX}, not ${cfg.camera.distance}`);
  }
  if (!isCameraAngle(cfg.camera.angle)) {
    throw new Error(`camera_angle has to be ${CAMERA_ANGLE_MIN} to ${CAMERA_ANGLE_MAX}, not ${cfg.camera.angle}`);
  }
  if (!isMusicName(cfg.music)) {
    throw new Error(`music has to be one of ${SOUNDTRACKS.map(({ name }) => name).join(", ")}, not ${cfg.music}`);
  }
}

// each setting's line, and whether it's its default (a default sky, camera or music setting is only written over a line it already has)
function settingLines(cfg: LevelCfg): [string, string, boolean][] {
  return [
    ["turn", `turn = ${cfg.turn}`, false],
    ["scale", `scale = ${cfg.scale}`, false],
    ["sky_split", `sky_split = ${cfg.sky.split}`, cfg.sky.split === DEFAULT_SKY.split],
    ["sky_top", `sky_top = ${formatRgb(cfg.sky.top)}`, formatRgb(cfg.sky.top) === formatRgb(DEFAULT_SKY.top)],
    ["sky_bottom", `sky_bottom = ${formatRgb(cfg.sky.bottom)}`, formatRgb(cfg.sky.bottom) === formatRgb(DEFAULT_SKY.bottom)],
    ["camera_distance", `camera_distance = ${cfg.camera.distance}`, cfg.camera.distance === DEFAULT_CAMERA.distance],
    ["camera_angle", `camera_angle = ${cfg.camera.angle}`, cfg.camera.angle === DEFAULT_CAMERA.angle],
    ["music", `music = ${cfg.music}`, cfg.music === DEFAULT_MUSIC],
  ];
}

// level.cfg's text with turn, scale, the sky and the camera set: their lines changed, or
// added at the end (the sky's and camera's only if they aren't the defaults), keeping its
// comments, other lines and line endings
export function setLevelCfg(text: string, cfg: LevelCfg): string {
  checkLevelCfg(cfg);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text === "" ? [] : text.split(/\r?\n/);
  if (lines[lines.length - 1] === "") {
    lines.pop(); // the newline at the end, which goes back after the last line
  }
  for (const [key, line, isDefault] of settingLines(cfg)) {
    const existing = lines.findIndex((candidate) => settingLine(key).test(candidate));
    if (existing >= 0) {
      lines[existing] = line;
    } else if (!isDefault) {
      lines.push(line);
    }
  }
  return [...lines, ""].join(eol);
}

const cfgPath = (root: string, name: string) => join(levelFolder(root, name), "level.cfg");

// turn, scale and sky for level_src/<name>, the defaults without a level.cfg
export function readLevelCfg(root: string, name: string): LevelCfg {
  const path = cfgPath(root, name);
  return parseLevelCfg(existsSync(path) ? readFileSync(path, "utf8") : "");
}

// sets turn, scale and sky in level_src/<name>'s level.cfg, making it if there isn't one
export function writeLevelCfg(root: string, name: string, cfg: LevelCfg): void {
  const path = cfgPath(root, name);
  writeFileSync(path, setLevelCfg(existsSync(path) ? readFileSync(path, "utf8") : "", cfg));
}
