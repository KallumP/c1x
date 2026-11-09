import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { readImage } from "../../../builder/images";
import { readCutLevel } from "../../../scripts/cutLevel/readCutLevel";
import { exportCutLevel, sceneCentre } from "../../../scripts/cutLevel/exportCutLevel";

const ACID_CAVE = fileURLToPath(new URL("../../../../../streams/s0000004.nsf", import.meta.url));

describe.skipIf(!existsSync(ACID_CAVE))("exporting the cut acid cave for blender", () => {
  const level = readCutLevel(ACID_CAVE);

  test("its centre is the middle of its objects across, the lowest of them, and crash's spawn along the route", () => {
    const xs = level.entities.map(({ at }) => at[0]);
    const crash = level.entities.find(({ type }) => type === 0)!;
    expect(sceneCentre(level)).toEqual([(Math.min(...xs) + Math.max(...xs)) / 2, Math.min(...level.entities.map(({ at }) => at[1])), crash.at[2]]);
  });

  test("writes each material's image as a png, and the scene for blender beside them", () => {
    const out = mkdtempSync(join(tmpdir(), "acid-"));
    exportCutLevel(level, out, "acid_cave");
    const scene = JSON.parse(readFileSync(join(out, "acid_cave.scene.json"), "utf8"));
    expect(scene.objects.map(({ name }: { name: string }) => name)).toContain("pit_acid");
    expect(scene.materials.length).toBeGreaterThan(50);
    for (const { image } of scene.materials) {
      expect(readImage(join(out, image)).width).toBeGreaterThan(0);
    }
  });
});
