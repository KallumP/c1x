// c1x's tools for players, packed with node as build/c1x_tools.exe (toolsExe.ts)
// so they need nothing installed: the level build, the level editor, the
// launcher's check for a newer release, and the levels shared on mod.io
import { existsSync } from "node:fs";
import { join } from "node:path";
import { buildLevel, levelSourcePath } from "../builder/buildLevel";
import { repoFolders } from "../builder/repoFolders";
import { addressLine, startEditorServer } from "../server/editorServer";
import { listOnlineLevelsCommand } from "./onlineLevels";
import { checkUpdate } from "./updateCheck";

export type ToolsCommand =
  | { kind: "build-level"; level: string }
  | { kind: "editor" }
  | { kind: "check-update"; version: string }
  | { kind: "list-online-levels" }
  | { kind: "usage" };

export const USAGE = `usage: c1x_tools build-level <level>
       c1x_tools editor
       c1x_tools check-update <version>
       c1x_tools list-online-levels
       (from tools/level_editor: npm run build-level -- <level>, npm run editor)

  build-level  builds a level source into build/levels: its name, such as
               1_tide_ruins (its folder in level_src), or the path of a level
               source's folder or .obj; its level.cfg and objects.json, which
               the level editor sets, scale, turn and place things in it
  editor       starts the level editor (its page built into build/editor by
               make, or npm run build), and says where it is
  check-update asks GitHub for c1x's latest release, and says if it's newer
               than version (two numbers, like 1.3), or why it can't tell
  list-online-levels
               lists the levels shared on mod.io, one a line: its id, author
               and name`;

const EDITOR_PORT = 5173; // vite's, as npm run dev has it

// what the command line asks for
export function toolsCommand(args: string[]): ToolsCommand {
  const [command, ...rest] = args;
  if (command === "build-level" && rest.length === 1) {
    return { kind: "build-level", level: rest[0] };
  }
  if (command === "editor" && rest.length === 0) {
    return { kind: "editor" };
  }
  if (command === "check-update" && rest.length === 1) {
    return { kind: "check-update", version: rest[0] };
  }
  if (command === "list-online-levels" && rest.length === 0) {
    return { kind: "list-online-levels" };
  }
  return { kind: "usage" };
}

// builds a level; whether it did
function runBuildLevel(repo: string, level: string): boolean {
  const { sourcesDir, streamsDir, levelsDir } = repoFolders(repo);
  return buildLevel(levelSourcePath(level, sourcesDir), { streamsDir, levelsDir, log: console.log });
}

// starts the editor, which runs until the process is stopped; whether it started
async function runEditor(repo: string): Promise<boolean> {
  const { editorPageDir } = repoFolders(repo);
  if (!existsSync(join(editorPageDir, "index.html"))) {
    console.log(`the level editor's page isn't built in ${editorPageDir}: run make (or npm run build in tools/level_editor)`);
    return false;
  }
  const { address } = await startEditorServer({ repo, pageDir: editorPageDir, firstPort: EDITOR_PORT });
  console.log("c1x level editor");
  console.log(addressLine(address));
  return true;
}

// runs what the command line asks for, in the project's folder repo; its exit code
export async function runTools(repo: string, args: string[]): Promise<number> {
  const command = toolsCommand(args);
  if (command.kind === "build-level") {
    return Number(!runBuildLevel(repo, command.level));
  }
  if (command.kind === "editor") {
    return Number(!(await runEditor(repo)));
  }
  if (command.kind === "check-update") {
    return checkUpdate(command.version, console.log);
  }
  if (command.kind === "list-online-levels") {
    return listOnlineLevelsCommand(console.log);
  }
  console.log(USAGE);
  return 1;
}
