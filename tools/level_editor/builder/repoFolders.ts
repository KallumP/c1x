// where the level build finds level sources and the game's files, puts the
// levels it builds, and the editor's built page is, in a repo (the project's folder, or a release's)
import { dirname, join } from "node:path";

export interface RepoFolders {
  sourcesDir: string; // level_src: each level source's folder
  streamsDir: string; // the game's files, the base level among them
  levelsDir: string;  // build/levels, next to the game; see LEVELS_DIR in src/pc/settings.h
  editorPageDir: string; // build/editor: the level editor's page, built by vite build, for the tools exe to serve
}

export function repoFolders(repo: string): RepoFolders {
  return {
    sourcesDir: join(repo, "level_src"),
    streamsDir: join(repo, "streams"),
    levelsDir: join(repo, "build", "levels"),
    editorPageDir: join(repo, "build", "editor"),
  };
}

// build-level.exe is in the repo's build folder, beside the game
export const repoOfExe = (exePath: string) => dirname(dirname(exePath));
