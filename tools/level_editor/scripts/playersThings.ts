// what's the player's own in their c1x folder, copied into a new version's folder
// so it starts as their old one left off. a file the new version has by the same
// name is the new version's, so it stays
import { cpSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// what git leaves out as the player's (see .gitignore), that the game and launcher use
const PLAYERS_FILES = ["settings.cfg", "controls.cfg", "imgui.ini", "modio_token.json"];
const PLAYERS_FOLDERS = ["streams", "memory_card"];
const LEVELS = "level_src";

function copyWithoutOverwriting(from: string, to: string): void {
  if (!existsSync(from)) {
    return;
  }
  cpSync(from, to, { recursive: true, force: false, errorOnExist: false });
}

const levelFolders = (folder: string): string[] =>
  readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

// a level the new version has is left whole, not mixed with the old one's files
function copyMissingLevels(from: string, to: string): void {
  if (!existsSync(from)) {
    return;
  }
  for (const level of levelFolders(from)) {
    if (!existsSync(join(to, level))) {
      cpSync(join(from, level), join(to, level), { recursive: true });
    }
  }
}

export function copyPlayersThings(current: string, newer: string): void {
  for (const name of [...PLAYERS_FILES, ...PLAYERS_FOLDERS]) {
    copyWithoutOverwriting(join(current, name), join(newer, name));
  }
  copyMissingLevels(join(current, LEVELS), join(newer, LEVELS));
}
