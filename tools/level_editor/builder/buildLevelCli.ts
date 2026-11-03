// npm run build-level -- <level>: builds level_src/<level> (or a level source
// at a path) into build/levels, for the level editor's build button
import { buildLevel, LEVELS_DIR, levelSourcePath, STREAMS_DIR } from "./buildLevel";

const USAGE = `usage: npm run build-level -- <level>

  level  a level source's name, such as tide_ruins (its folder in level_src),
         or the path of a level source's folder or .obj

  its level.cfg sets the level's scale and turn, and its objects.json places
  objects in it; the level editor sets both. the level goes to build/levels`;

const [level] = process.argv.slice(2);
if (!level) {
  console.log(USAGE);
  process.exitCode = 1;
} else {
  const isBuilt = buildLevel(levelSourcePath(level), { streamsDir: STREAMS_DIR, levelsDir: LEVELS_DIR, log: console.log });
  process.exitCode = isBuilt ? 0 : 1;
}
