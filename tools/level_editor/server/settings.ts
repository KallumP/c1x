// the game's settings.cfg (see doc/settings.md), for the editor's boot button
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listLevels } from "./levels";

const BOOT_LEVEL = /^\s*boot_level\s*=/;

// settings.cfg's text with boot_level set to name: its boot_level line changed,
// or one added at the end, keeping the file's line endings
export function setBootLevel(text: string, name: string): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const line = `boot_level = ${name}`;
  const at = lines.findIndex((l) => BOOT_LEVEL.test(l));
  if (at >= 0) {
    lines[at] = line;
    return lines.join(eol);
  }
  if (lines[lines.length - 1] === "") lines.pop();
  return [...lines, line, ""].join(eol);
}

// sets boot_level in the settings.cfg at path, making it if there isn't one
export function writeBootLevel(path: string, name: string): void {
  writeFileSync(path, setBootLevel(existsSync(path) ? readFileSync(path, "utf8") : "", name));
}

const BOOTABLE = /^[A-Za-z0-9_-]+$/; // the names boot_level takes (doc/settings.md)

// sets the game in repo to boot into the level built from level_src/<name>
export function bootLevel(repo: string, name: string): void {
  if (!listLevels(join(repo, "level_src")).some((l) => l.name === name)) throw new Error(`no level source ${name}`);
  if (!BOOTABLE.test(name)) throw new Error(`the game can only boot a level named with letters, digits, _ and -, not ${name}`);
  writeBootLevel(join(repo, "settings.cfg"), name);
}
