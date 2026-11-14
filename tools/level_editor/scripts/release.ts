// the player release zip (see doc/releasing.md): which of the repo's files go in it.
// paths are relative to the repo and to the release folder, with forward slashes

export type ReleaseFile = { from: string; to: string };

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
