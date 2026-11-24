// c1x's tools for players, packed with node as build/c1x_tools.exe (toolsExe.ts)
// so they need nothing installed: the level build, the level editor, the
// launcher's check for a newer release, and the levels shared on mod.io
import { existsSync } from "node:fs";
import { join } from "node:path";
import { buildLevel, levelSourcePath } from "../builder/buildLevel";
import { repoFolders } from "../builder/repoFolders";
import { addressLine, startEditorServer } from "../server/editorServer";
import { downloadLevelCommand } from "../launcher/levelDownload";
import { downloadReleaseCommand } from "../launcher/releaseDownload";
import { downloadFile } from "../launcher/download";
import { fetchOnlineLevel } from "./modio";
import { listOnlineLevelsCommand } from "../launcher/onlineLevels";
import { checkUpdate } from "../launcher/updateCheck";

export type ToolsCommand =
  | { kind: "build-level"; level: string }
  | { kind: "editor" }
  | { kind: "check-update"; version: string }
  | { kind: "list-online-levels"; name: string }
  | { kind: "download-level"; modId: number }
  | { kind: "download-release"; version: string }
  | { kind: "usage" };

export const USAGE = `usage: c1x_tools build-level <level>
       c1x_tools editor
       c1x_tools check-update <version>
       c1x_tools list-online-levels [name]
       c1x_tools download-level <id>
       c1x_tools download-release <version>
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
               lists the 10 most downloaded levels shared on mod.io, or those
               with name in theirs, one a line: its id, author, name and page
  download-level
               downloads the level with that id from mod.io into level_src,
               then builds it
  download-release
               downloads that release of c1x (two numbers, like 1.5), unzips
               it beside this c1x's folder with the player's things copied in,
               and says where`;

const MOD_ID = /^[1-9]\d*$/; // a mod's id on mod.io
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
  if (command === "list-online-levels") {
    return { kind: "list-online-levels", name: rest.join(" ") };
  }
  if (command === "download-release" && rest.length === 1) {
    return { kind: "download-release", version: rest[0] };
  }
  if (command === "download-level" && rest.length === 1 && MOD_ID.test(rest[0])) {
    return { kind: "download-level", modId: Number(rest[0]) };
  }
  return { kind: "usage" };
}

// builds a level; whether it did
function runBuildLevel(repo: string, level: string): boolean {
  const { sourcesDir, streamsDir, levelsDir } = repoFolders(repo);
  return buildLevel(levelSourcePath(level, sourcesDir), { streamsDir, levelsDir, log: console.log });
}

// downloads a level from mod.io into level_src and builds it; its exit code
function runDownloadLevel(repo: string, modId: number): Promise<number> {
  const calls = {
    fetchOnlineLevel,
    downloadFile,
    buildLevel: (name: string) => runBuildLevel(repo, name),
  };
  return downloadLevelCommand(repoFolders(repo).sourcesDir, modId, console.log, calls);
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

// what each command does: whether it worked, or its exit code
export type ToolsHandlers = {
  buildLevel: (level: string) => boolean;
  editor: () => Promise<boolean>;
  checkUpdate: (version: string) => Promise<number>;
  listOnlineLevels: (name: string) => Promise<number>;
  downloadLevel: (modId: number) => Promise<number>;
  downloadRelease: (version: string) => Promise<number>;
};

// the commands, run in the project's folder repo
export function toolsHandlers(repo: string): ToolsHandlers {
  return {
    buildLevel: (level) => runBuildLevel(repo, level),
    editor: () => runEditor(repo),
    checkUpdate: (version) => checkUpdate(version, console.log),
    listOnlineLevels: (name) => listOnlineLevelsCommand(name, console.log),
    downloadLevel: (modId) => runDownloadLevel(repo, modId),
    downloadRelease: (version) => downloadReleaseCommand(repo, version, console.log),
  };
}

// runs what the command line asks for with handlers; its exit code
export async function runTools(args: string[], handlers: ToolsHandlers): Promise<number> {
  const command = toolsCommand(args);
  if (command.kind === "build-level") {
    return Number(!handlers.buildLevel(command.level));
  }
  if (command.kind === "editor") {
    return Number(!(await handlers.editor()));
  }
  if (command.kind === "check-update") {
    return handlers.checkUpdate(command.version);
  }
  if (command.kind === "list-online-levels") {
    return handlers.listOnlineLevels(command.name);
  }
  if (command.kind === "download-release") {
    return handlers.downloadRelease(command.version);
  }
  if (command.kind === "download-level") {
    return handlers.downloadLevel(command.modId);
  }
  console.log(USAGE);
  return 1;
}
