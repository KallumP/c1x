// the player release zip (see doc/releasing.md): which of the repo's files go in it,
// copied into build/release/c1x-<version>/ and zipped there.
// paths are relative to the repo and to the release folder, with forward slashes
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export type ReleaseFile = { from: string; to: string };
type Command = { program: string; args: string[] };

// at the top of the release, as they are in the repo
const TOP_FILES = ["c1x_launcher.exe", "LICENSE", "settings.example.cfg", "controls.example.cfg", "streams/README.md"];
const PLAYER_README = "doc/release/README.md";
// the docs for players; the rest are for building and working on c1x
const PLAYER_DOCS = ["running", "launcher", "controls", "settings", "custom_levels", "changelog"].map((name) => `doc/${name}.md`);
// built by make, and needed in the release
const BUILT_FILES = ["c1x.exe", "build-level.exe"];
// folders whose files git has go in whole, apart from the excluded ones
const GIT_FOLDERS = ["level_src/", "tools/level_editor/"];
const EXCLUDED_GIT_FOLDERS = ["tools/level_editor/tests/"];

const sameName = (path: string): ReleaseFile => ({ from: path, to: path });

const isDll = (name: string): boolean => name.toLowerCase().endsWith(".dll");

function checkBuilt(buildFiles: string[]): void {
  const missing = BUILT_FILES.find((name) => !buildFiles.includes(name));
  if (missing) {
    throw new Error(`build/${missing} isn't built: run make first`);
  }
}

// the game, build-level.exe and the game's dlls, from the names of the files in build/
function buildFolderFiles(buildFiles: string[]): ReleaseFile[] {
  checkBuilt(buildFiles);
  return [...BUILT_FILES, ...buildFiles.filter(isDll)].map((name) => sameName(`build/${name}`));
}

const isReleasedGitFile = (path: string): boolean =>
  GIT_FOLDERS.some((folder) => path.startsWith(folder)) && !EXCLUDED_GIT_FOLDERS.some((folder) => path.startsWith(folder));

// gitFiles: every file git has (git ls-files); buildFiles: the names of the files in build/
export function releaseFiles(gitFiles: string[], buildFiles: string[]): ReleaseFile[] {
  return [
    ...TOP_FILES.map(sameName),
    { from: PLAYER_README, to: "README.md" },
    ...PLAYER_DOCS.map(sameName),
    ...buildFolderFiles(buildFiles),
    ...gitFiles.filter(isReleasedGitFile).map(sameName),
  ];
}

// c1x-<version>, for a version like 1.2.3
export function releaseFolderName(version: string): string {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`the version has to be like 1.2.3, not "${version}"`);
  }
  return `c1x-${version}`;
}

function copyReleaseFile(repo: string, file: ReleaseFile, folder: string): void {
  const from = join(repo, file.from);
  if (!existsSync(from)) {
    throw new Error(`${file.from} isn't there, so it can't go in the release`);
  }
  const to = join(folder, file.to);
  mkdirSync(dirname(to), { recursive: true });
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

// makes build/release/c1x-<version>/ and its zip; returns the zip's path
export function makeRelease(repo: string, version: string): string {
  const folder = join(repo, "build", "release", releaseFolderName(version));
  copyReleaseFiles(repo, releaseFiles(gitFilesIn(repo), buildFilesIn(repo)), folder);
  return zipFolder(folder);
}
