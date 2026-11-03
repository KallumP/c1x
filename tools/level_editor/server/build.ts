// builds a level source (see doc/custom_levels.md) with the level build in
// builder/, for the editor's build button
import { join } from "node:path";
import { buildLevel as buildLevelSource } from "../builder/buildLevel";
import { listLevels } from "./levels";

export interface BuildResult {
  ok: boolean;
  output: string; // what it said: warnings, then what it wrote or why it failed, a line each
}

// builds level_src/<name> in repo into its build/levels, from n. sanity beach in its streams
export async function buildLevel(repo: string, name: string): Promise<BuildResult> {
  if (!listLevels(join(repo, "level_src")).some((level) => level.name === name)) {
    throw new Error(`no level source ${name}`);
  }
  const lines: string[] = [];
  const ok = buildLevelSource(join(repo, "level_src", name), {
    streamsDir: join(repo, "streams"),
    levelsDir: join(repo, "build", "levels"),
    log: (line) => lines.push(line),
  });
  return { ok, output: lines.map((line) => `${line}\n`).join("") };
}
