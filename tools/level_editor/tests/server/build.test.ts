import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLevel } from "../../server/build";

const BEACH = fileURLToPath(new URL("../../../../streams/s0000009", import.meta.url));
const hasBeach = existsSync(`${BEACH}.nsd`);

// a repo with a level source, lvl: a floor
let repo: string;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "repo-"));
  mkdirSync(join(repo, "level_src", "lvl"), { recursive: true });
  writeFileSync(join(repo, "level_src", "lvl", "lvl.obj"), "o Floor\nv -4 0 -8\nv -4 0 8\nv 4 0 8\nv 4 0 -8\nf 1 2 3 4\n");
});
afterEach(() => { rmSync(repo, { recursive: true, force: true }); });

// n. sanity beach in the repo's streams, to build from
function addBeach(): void {
  mkdirSync(join(repo, "streams"));
  for (const extension of ["nsd", "nsf"]) {
    copyFileSync(`${BEACH}.${extension}`, join(repo, "streams", `s0000009.${extension}`));
  }
}

describe("buildLevel", () => {
  test.skipIf(!hasBeach)("builds the level's folder into the repo's build/levels, and gives what it said", async () => {
    addBeach();
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

  test("isn't ok without n. sanity beach in the repo's streams", async () => {
    const result = await buildLevel(repo, "lvl");
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/s0000009\.nsd/);
  });

  test("refuses a level that isn't a level source", async () => {
    await expect(buildLevel(repo, "../lvl")).rejects.toThrow("no level source");
  });
});
