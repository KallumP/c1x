// the player release zip (see doc/releasing.md): which of the repo's files go in it,
// copied into release/c1x-<version>/ (beside release.bat) and zipped there.
// paths are relative to the repo and to the release folder, with forward slashes
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, posix, sep } from "node:path";
import { docLink, htmlDocPage } from "./htmlDocs";
import { releaseName } from "./releaseDownload";

export type ReleaseFile = { from: string; to: string; asPage?: boolean }; // asPage: a doc, written as its html page
type Command = { program: string; args: string[] };

// where the docs a release doesn't have are, for its docs' links to them
const ONLINE_DOCS = "https://github.com/KallumP/c1x/blob/master";
// at the top of the release, as they are in the repo
const LICENSE = "LICENSE";
const LAUNCHER = "c1x_launcher.exe";
const LAUNCHER_TIMEOUT_MS = 10000; // how long it has to say its version
const TOP_FILES = [LAUNCHER, LICENSE, "settings.example.cfg", "controls.example.cfg", "streams/README.md"];
const PLAYER_README = "doc/release/README.md";
// the docs for players; the rest are for building and working on c1x
const PLAYER_DOCS = ["running", "launcher", "controls", "settings", "custom_levels", "changelog"].map((name) => `doc/${name}.md`);
// built by make, and needed in the release: the game, and the tools (tools.ts)
const BUILT_FILES = ["c1x.exe", "c1x_tools.exe"];
// the level editor's page, built by make, which the tools serve
const EDITOR_PAGE_DIR = "build/editor";
const EDITOR_PAGE_INDEX = "index.html";
// the folders whose files git has go in: the level sources (so not a player's own),
// and the game's own pictures
const GIT_FOLDERS = ["level_src/", "assets/"];

const isInGitFolder = (path: string): boolean => GIT_FOLDERS.some((folder) => path.startsWith(folder));

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
    ...gitFiles.filter(isInGitFolder).map(sameName),
  ].map(asReleased);
}

// repo's release/c1x-<version>, beside release.bat, for a two-number version like 1.3
export function releaseFolder(repo: string, version: string): string {
  if (!/^\d+\.\d+$/.test(version)) {
    throw new Error(`the version has to be two numbers, like 1.3, not "${version}"`);
  }
  return join(repo, "release", releaseName(version));
}

// a link's path, and the place on the page it goes to (with its #), if it has one
function splitAnchor(href: string): { path: string; anchor: string } {
  const hashAt = href.indexOf("#");
  if (hashAt === -1) {
    return { path: href, anchor: "" };
  }
  return { path: href.slice(0, hashAt), anchor: href.slice(hashAt) };
}

// a link in the doc that's page in the release (its path there), with released
// the paths of everything in the release: to another doc's page, or to the doc
// on github when the release doesn't have it (the docs for working on c1x)
export function releasedLink(page: string, href: string, released: Set<string>): string {
  const link = docLink(href);
  if (link === href) {
    return link; // a website, a place on the page, or anything that isn't a doc
  }
  const { path, anchor } = splitAnchor(href);
  const target = posix.normalize(posix.join(posix.dirname(page), path));
  if (released.has(docLink(target))) {
    return link;
  }
  return `${ONLINE_DOCS}/${target}${anchor}`;
}

function copyReleaseFile(repo: string, file: ReleaseFile, folder: string, released: Set<string>): void {
  const from = join(repo, file.from);
  if (!existsSync(from)) {
    throw new Error(`${file.from} isn't there, so it can't go in the release`);
  }
  const to = join(folder, file.to);
  mkdirSync(dirname(to), { recursive: true });
  if (file.asPage) {
    writeFileSync(to, htmlDocPage(readFileSync(from, "utf8"), (href) => releasedLink(file.to, href, released)));
    return;
  }
  copyFileSync(from, to);
}

// copies files from repo into folder, emptied first
export function copyReleaseFiles(repo: string, files: ReleaseFile[], folder: string): void {
  const released = new Set(files.map((file) => file.to));
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
  files.forEach((file) => copyReleaseFile(repo, file, folder, released));
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

// throws unless said, what the launcher printed for --version, is the version being released
export function checkLauncherVersion(said: string, releasing: string): void {
  const builtAs = said.trim();
  if (builtAs === releasing) {
    return;
  }
  const fix = `build it with release.bat ${releasing}`;
  if (!builtAs) {
    throw new Error(`${LAUNCHER} isn't built as version ${releasing}: ${fix}`);
  }
  throw new Error(`${LAUNCHER} is built as version ${builtAs}, not ${releasing}: ${fix}`);
}

// what repo's launcher prints for --version: the version it was built as, and
// nothing for a build that isn't a release's. a launcher from before it took
// --version opens its window instead, so it's only waited for so long
function askLauncherVersion(repo: string): string {
  const launcher = join(repo, LAUNCHER);
  if (!existsSync(launcher)) {
    throw new Error(`${LAUNCHER} isn't built: run make first`);
  }
  try {
    return execFileSync(launcher, ["--version"], { encoding: "utf8", timeout: LAUNCHER_TIMEOUT_MS });
  } catch {
    throw new Error(`${LAUNCHER} didn't say its version: build it again with release.bat`);
  }
}

// makes release/c1x-<version>/ and its zip, from a launcher built as version;
// returns the zip's path. askLauncher is a test's stand-in for running the launcher
export function makeRelease(
  repo: string,
  version: string,
  askLauncher: (repo: string) => string = askLauncherVersion,
): string {
  const folder = releaseFolder(repo, version);
  checkLauncherVersion(askLauncher(repo), version);
  const files = releaseFiles(gitFilesIn(repo), buildFilesIn(repo), filesUnder(join(repo, EDITOR_PAGE_DIR)));
  copyReleaseFiles(repo, files, folder);
  return zipFolder(folder);
}
