// builds a level source (see doc/custom_levels.md) with the level build in
// builder/, for the editor's build button
import { join } from "node:path";
import { buildLevel as buildLevelSource } from "../builder/buildLevel";
import { repoFolders } from "../builder/repoFolders";
import { listLevels } from "./levels";

export interface BuildResult {
  ok: boolean;
  output: string; // what it said: warnings, then what it wrote or why it failed, a line each
}

// builds level_src/<name> in repo into its build/levels, from the base level in its streams
export async function buildLevel(repo: string, name: string): Promise<BuildResult> {
  if (!listLevels(join(repo, "level_src")).some((level) => level.name === name)) {
    throw new Error(`no level source ${name}`);
  }
  const lines: string[] = [];
  const { sourcesDir, streamsDir, levelsDir } = repoFolders(repo);
  const ok = buildLevelSource(join(sourcesDir, name), { streamsDir, levelsDir, log: (line) => lines.push(line) });
  return { ok, output: lines.map((line) => `${line}\n`).join("") };
}
