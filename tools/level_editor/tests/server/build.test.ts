import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_LEVEL } from "../../builder/baseLevel";
import { buildLevel } from "../../server/build";

const BASE = fileURLToPath(new URL(`../../../../streams/${BASE_LEVEL.file}`, import.meta.url));
const hasBase = existsSync(`${BASE}.nsd`);

// a repo with a level source, lvl: a floor
let repo: string;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "repo-"));
  mkdirSync(join(repo, "level_src", "lvl"), { recursive: true });
  writeFileSync(join(repo, "level_src", "lvl", "lvl.obj"), "o Floor\nv -4 0 -8\nv -4 0 8\nv 4 0 8\nv 4 0 -8\nf 1 2 3 4\n");
});
afterEach(() => { rmSync(repo, { recursive: true, force: true }); });

// the base level (jungle rollers) in the repo's streams, to build from
function addBase(): void {
  mkdirSync(join(repo, "streams"));
  for (const extension of ["nsd", "nsf"]) {
    copyFileSync(`${BASE}.${extension}`, join(repo, "streams", `${BASE_LEVEL.file}.${extension}`));
  }
}

describe("buildLevel", () => {
  test.skipIf(!hasBase)("builds the level's folder into the repo's build/levels", async () => {
    // and gives what it said
    addBase();
    const levels = join(repo, "build", "levels");
    expect(await buildLevel(repo, "lvl")).toEqual({ ok: true, output: `wrote ${join(levels, "lvl")}\n` });
    expect(existsSync(join(levels, "lvl.nsd")) && existsSync(join(levels, "lvl.nsf"))).toBe(true);
  });

  test("isn't ok when it fails, saying why", async () => {
    writeFileSync(join(repo, "level_src", "lvl", "level.cfg"), "scale = big\n");
    const result = await buildLevel(repo, "lvl");
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/level\.cfg, line 1: scale has to be a whole number/);
  });

  test("says which base level is missing from the repo's streams", async () => {
    const result = await buildLevel(repo, "lvl");
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/Jungle Rollers \(s000000c\.nsd\)/);
  });

  test("refuses a level that isn't a level source", async () => {
    await expect(buildLevel(repo, "../lvl")).rejects.toThrow("no level source");
  });
});
