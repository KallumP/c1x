// npm run build-level -- <level>: builds level_src/<level> (or a level source
// at a path) into build/levels, for the level editor's build button. bundled
// as build/build-level.exe (npm run bundle-builder), so the launcher can build
// levels without node
import { isSea } from "node:sea";
import { fileURLToPath } from "node:url";
import { buildLevel, levelSourcePath } from "./buildLevel";
import { repoFolders, repoOfExe } from "./repoFolders";

const USAGE = `usage: npm run build-level -- <level>
       build-level <level>

  level  a level source's name, such as tide_ruins (its folder in level_src),
         or the path of a level source's folder or .obj

  its level.cfg sets the level's scale and turn, and its objects.json places
  objects in it; the level editor sets both. the level goes to build/levels`;

// the project's folder: above build/ for build-level.exe, else three up from this file
function repoFolder(): string {
  if (isSea()) {
    return repoOfExe(process.execPath);
  }
  return fileURLToPath(new URL("../../..", import.meta.url));
}

const [level] = process.argv.slice(2);
if (!level) {
  console.log(USAGE);
  process.exitCode = 1;
} else {
  const { sourcesDir, streamsDir, levelsDir } = repoFolders(repoFolder());
  const isBuilt = buildLevel(levelSourcePath(level, sourcesDir), { streamsDir, levelsDir, log: console.log });
  process.exitCode = isBuilt ? 0 : 1;
}
