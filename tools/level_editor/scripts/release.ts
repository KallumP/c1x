// the player release zip (see doc/releasing.md): which of the repo's files go in it,
// copied into release/c1x-<version>/ (beside release.bat) and zipped there.
// paths are relative to the repo and to the release folder, with forward slashes
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, sep } from "node:path";
import { htmlDocPage } from "./htmlDocs";

export type ReleaseFile = { from: string; to: string; asPage?: boolean }; // asPage: a doc, written as its html page
type Command = { program: string; args: string[] };

// at the top of the release, as they are in the repo
const LICENSE = "LICENSE";
const TOP_FILES = ["c1x_launcher.exe", LICENSE, "settings.example.cfg", "controls.example.cfg", "streams/README.md"];
const PLAYER_README = "doc/release/README.md";
// the docs for players; the rest are for building and working on c1x
const PLAYER_DOCS = ["running", "launcher", "controls", "settings", "custom_levels", "changelog"].map((name) => `doc/${name}.md`);
// built by make, and needed in the release: the game, and the tools (the level build and editor)
const BUILT_FILES = ["c1x.exe", "c1x_tools.exe"];
// the level editor's page, built by make, which the tools serve
const EDITOR_PAGE_DIR = "build/editor";
const EDITOR_PAGE_INDEX = "index.html";
// the level sources git has go in, so not a player's own
const GIT_FOLDER = "level_src/";

const sameName = (path: string): ReleaseFile => ({ from: path, to: path });

const isDll = (name: string): boolean => name.toLowerCase().endsWith(".dll");

function checkBuilt(buildFiles: string[]): void {
  const missing = BUILT_FILES.find((name) => !buildFiles.includes(name));
  if (missing) {
    throw new Error(`build/${missing} isn't built: run make first`);
  }
}

// the game, the tools and the game's dlls, from the names of the files in build/
function buildFolderFiles(buildFiles: string[]): ReleaseFile[] {
  checkBuilt(buildFiles);
  return [...BUILT_FILES, ...buildFiles.filter(isDll)].map((name) => sameName(`build/${name}`));
}

// the editor's built page, from its files' paths in build/editor/
function editorPageFiles(pageFiles: string[]): ReleaseFile[] {
  if (!pageFiles.includes(EDITOR_PAGE_INDEX)) {
    throw new Error(`${EDITOR_PAGE_DIR}/${EDITOR_PAGE_INDEX} isn't built: run make first`);
  }
  return pageFiles.map((path) => sameName(`${EDITOR_PAGE_DIR}/${path}`));
}

// a doc goes in as its page (htmlDocs.ts), which opens in any browser, and the
// licence as a text file, which a browser shows
function asReleased(file: ReleaseFile): ReleaseFile {
  if (/\.md$/i.test(file.from)) {
    return { from: file.from, to: file.to.replace(/\.md$/i, ".html"), asPage: true };
  }
  if (file.to === LICENSE) {
    return { ...file, to: `${LICENSE}.txt` };
  }
  return file;
}

// gitFiles: every file git has (git ls-files); buildFiles: the names of the files
// in build/; pageFiles: the paths of the files in build/editor/
export function releaseFiles(gitFiles: string[], buildFiles: string[], pageFiles: string[]): ReleaseFile[] {
  return [
    ...TOP_FILES.map(sameName),
    { from: PLAYER_README, to: "README.md" },
    ...PLAYER_DOCS.map(sameName),
    ...buildFolderFiles(buildFiles),
    ...editorPageFiles(pageFiles),
    ...gitFiles.filter((path) => path.startsWith(GIT_FOLDER)).map(sameName),
  ].map(asReleased);
}

// repo's release/c1x-<version>, beside release.bat, for a version like 1.2.3
export function releaseFolder(repo: string, version: string): string {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`the version has to be like 1.2.3, not "${version}"`);
  }
  return join(repo, "release", `c1x-${version}`);
}

function copyReleaseFile(repo: string, file: ReleaseFile, folder: string): void {
  const from = join(repo, file.from);
  if (!existsSync(from)) {
    throw new Error(`${file.from} isn't there, so it can't go in the release`);
  }
  const to = join(folder, file.to);
  mkdirSync(dirname(to), { recursive: true });
  if (file.asPage) {
    writeFileSync(to, htmlDocPage(readFileSync(from, "utf8")));
    return;
  }
  copyFileSync(from, to);
}

// copies files from repo into folder, emptied first
export function copyReleaseFiles(repo: string, files: ReleaseFile[], folder: string): void {
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
  files.forEach((file) => copyReleaseFile(repo, file, folder));
}

// windows' own tar writes zips (-a, from the name); msys2's tar, which may be first on
// the path, doesn't, so it's run by its full path
export function zipCommand(folderName: string, platform: NodeJS.Platform, systemRoot: string | undefined): Command {
  const zip = `${folderName}.zip`;
  if (platform === "win32") {
    return { program: join(systemRoot ?? "C:\\Windows", "System32", "tar.exe"), args: ["-a", "-c", "-f", zip, folderName] };
  }
  return { program: "zip", args: ["-q", "-r", zip, folderName] };
}

// zips folder into <folder>.zip beside it, replacing an earlier one; returns the zip's path
export function zipFolder(folder: string): string {
  const zip = `${folder}.zip`;
  rmSync(zip, { force: true });
  const { program, args } = zipCommand(basename(folder), process.platform, process.env.SystemRoot);
  execFileSync(program, args, { cwd: dirname(folder) });
  return zip;
}

function gitFilesIn(repo: string): string[] {
  return execFileSync("git", ["ls-files", "-z"], { cwd: repo, encoding: "utf8" }).split("\0").filter(Boolean);
}

function buildFilesIn(repo: string): string[] {
  const build = join(repo, "build");
  return readdirSync(build).filter((name) => statSync(join(build, name)).isFile());
}

// the paths of the files in folder and its subfolders, with forward slashes; none if it isn't there
function filesUnder(folder: string): string[] {
  if (!existsSync(folder)) {
    return [];
  }
  return readdirSync(folder, { recursive: true, encoding: "utf8" })
    .filter((path) => statSync(join(folder, path)).isFile())
    .map((path) => path.split(sep).join("/"));
}

// makes release/c1x-<version>/ and its zip; returns the zip's path
export function makeRelease(repo: string, version: string): string {
  const folder = releaseFolder(repo, version);
  copyReleaseFiles(repo, releaseFiles(gitFilesIn(repo), buildFilesIn(repo), filesUnder(join(repo, EDITOR_PAGE_DIR))), folder);
  return zipFolder(folder);
}
