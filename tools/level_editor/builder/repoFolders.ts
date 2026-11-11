// where the level build finds level sources and the game's files, and puts
// the levels it builds, in a repo (the project's folder, or a release's)
import { dirname, join } from "node:path";

export interface RepoFolders {
  sourcesDir: string; // level_src: each level source's folder
  streamsDir: string; // the game's files, the base level among them
  levelsDir: string;  // build/levels, next to the game; see LEVELS_DIR in src/pc/settings.h
}

export function repoFolders(repo: string): RepoFolders {
  return {
    sourcesDir: join(repo, "level_src"),
    streamsDir: join(repo, "streams"),
    levelsDir: join(repo, "build", "levels"),
  };
}

// build-level.exe is in the repo's build folder, beside the game
export const repoOfExe = (exePath: string) => dirname(dirname(exePath));
