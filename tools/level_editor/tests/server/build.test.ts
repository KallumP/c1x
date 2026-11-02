import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildLevel } from "../../server/build";

// a repo whose tools/build_level.py is a node script, run by node in place of python
let repo: string;
const fakeBuild = (script: string) => {
  mkdirSync(join(repo, "tools"), { recursive: true });
  writeFileSync(join(repo, "tools", "build_level.py"), script);
};

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "repo-"));
  mkdirSync(join(repo, "level_src", "lvl"), { recursive: true });
  writeFileSync(join(repo, "level_src", "lvl", "lvl.obj"), "");
});
afterEach(() => { rmSync(repo, { recursive: true, force: true }); });

describe("buildLevel", () => {
  test("runs build_level.py on the level's folder, from the repo, and gives its output", async () => {
    fakeBuild("console.log('wrote', process.argv.slice(2).join(' '), process.cwd() === process.env.REPO);");
    process.env.REPO = repo;
    expect(await buildLevel(repo, "lvl", process.execPath)).toEqual({ ok: true, output: "wrote level_src/lvl true\n" });
  });

  test("isn't ok when it fails, with what it printed to stderr too", async () => {
    fakeBuild("console.log('reading'); console.error('no floor below box 3'); process.exit(1);");
    expect(await buildLevel(repo, "lvl", process.execPath)).toEqual({ ok: false, output: "reading\nno floor below box 3\n" });
  });

  test("isn't ok when python can't be run", async () => {
    const result = await buildLevel(repo, "lvl", join(repo, "no-python"));
    expect(result.ok).toBe(false);
    expect(result.output).not.toBe("");
  });

  test("refuses a level that isn't a level source", async () => {
    fakeBuild("console.log('ran');");
    await expect(buildLevel(repo, "../lvl", process.execPath)).rejects.toThrow("no level source");
  });
});
