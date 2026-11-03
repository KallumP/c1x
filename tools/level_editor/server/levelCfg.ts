// a level source's level.cfg (see doc/custom_levels.md): the turn and scale
// the level is built with (builder/levelCfg.ts reads it for the build), read and set by the editor
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_SCALE } from "../src/coords";
import { levelFolder } from "./levels";

export interface LevelCfg {
  turn: number;  // degrees the build turns the level about the up axis
  scale: number; // game units per blender metre
}

const TURNS = [0, 90, 180, 270]; // the build turns in steps of 90 degrees
const KEYS = ["turn", "scale"] as const;

const settingLine = (key: string) => new RegExp(`^\\s*${key}\\s*=`);

// turn and scale from level.cfg's text, the defaults for what it doesn't set
export function parseLevelCfg(text: string): LevelCfg {
  const cfg: LevelCfg = { turn: 0, scale: DEFAULT_SCALE };
  for (const line of text.split(/\r?\n/)) {
    const setting = /^\s*(turn|scale)\s*=\s*(-?\d+)\s*$/.exec(line);
    if (setting) {
      cfg[setting[1] as keyof LevelCfg] = Number(setting[2]);
    }
  }
  return cfg;
}

function checkLevelCfg(cfg: LevelCfg): void {
  if (!TURNS.includes(cfg.turn)) {
    throw new Error(`turn has to be 0, 90, 180 or 270, not ${cfg.turn}`);
  }
  if (!Number.isInteger(cfg.scale) || cfg.scale <= 0) {
    throw new Error(`scale has to be a whole number above 0, not ${cfg.scale}`);
  }
}

// level.cfg's text with turn and scale set: their lines changed, or added at the
// end, keeping its comments, other lines and line endings
export function setLevelCfg(text: string, cfg: LevelCfg): string {
  checkLevelCfg(cfg);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text === "" ? [] : text.split(/\r?\n/);
  if (lines[lines.length - 1] === "") {
    lines.pop(); // the newline at the end, which goes back after the last line
  }
  for (const key of KEYS) {
    const line = `${key} = ${cfg[key]}`;
    const existing = lines.findIndex((candidate) => settingLine(key).test(candidate));
    if (existing >= 0) {
      lines[existing] = line;
    } else {
      lines.push(line);
    }
  }
  return [...lines, ""].join(eol);
}

const cfgPath = (root: string, name: string) => join(levelFolder(root, name), "level.cfg");

// turn and scale for level_src/<name>, the defaults without a level.cfg
export function readLevelCfg(root: string, name: string): LevelCfg {
  const path = cfgPath(root, name);
  return parseLevelCfg(existsSync(path) ? readFileSync(path, "utf8") : "");
}

// sets turn and scale in level_src/<name>'s level.cfg, making it if there isn't one
export function writeLevelCfg(root: string, name: string, cfg: LevelCfg): void {
  const path = cfgPath(root, name);
  writeFileSync(path, setLevelCfg(existsSync(path) ? readFileSync(path, "utf8") : "", cfg));
}
