// runs tools/build_level.py on a level source (see doc/custom_levels.md), for the editor's build button
import { execFile } from "node:child_process";
import { join } from "node:path";
import { listLevels } from "./levels";

export interface BuildResult {
  ok: boolean;
  output: string; // what it printed: its stdout, then its stderr
}

// builds level_src/<name> in repo with python (PYTHON, or python on the path)
export function buildLevel(repo: string, name: string, python = process.env.PYTHON ?? "python"): Promise<BuildResult> {
  if (!listLevels(join(repo, "level_src")).some((l) => l.name === name))
    return Promise.reject(new Error(`no level source ${name}`));
  return new Promise((done) => {
    execFile(python, ["tools/build_level.py", `level_src/${name}`], { cwd: repo }, (error, stdout, stderr) => {
      const output = stdout + stderr;
      done({ ok: !error, output: output || (error ? error.message : "") });
    });
  });
}
