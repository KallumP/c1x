import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { Cells, solidCells } from "../../builder/collision";
import type { Span } from "../../builder/fit";
import type { Mesh } from "../../builder/obj";
import { CAM_LEAD, CAM_OFFSET, cameraOffsets, cameraPath, spawnPoint, zoneIndex, zonePaths } from "../../builder/route";
import { DEFAULT_CAMERA } from "../../src/camera";
import type { Vec3 } from "../../builder/vectors";
import { worldMeshes } from "../../builder/worldMeshes";
import { floorMesh, meshOf, merged, quadMesh } from "./meshes";

// a small closed cube centred on (x, y, z), its faces of object
function cube(x: number, y: number, z: number, r: number, object: string): Mesh {
  const mesh = merged(floorMesh(-r, -r, r, r, r), quadMesh([[-r, -r, -r], [r, -r, -r], [r, -r, r], [-r, -r, r]]));
  return meshOf(
    mesh.vertices.map(([vx, vy, vz]) => [vx + x, vy + y, vz + z] as Vec3),
    mesh.triangles.map((triangle) => ({ ...triangle, object })),
  );
}

// down the middle: a short strip at the +z end, a block too tall to climb, then a long floor
function blockedStart(): Mesh {
  const floors = merged(floorMesh(0, 0, 2048, 3328, 256), floorMesh(0, 3712, 2048, 4096, 256));
  const block = merged(
    floorMesh(0, 3328, 2048, 3712, 1536),
    quadMesh([[0, 256, 3328], [2048, 256, 3328], [2048, 1536, 3328], [0, 1536, 3328]]),
    quadMesh([[0, 256, 3712], [0, 1536, 3712], [2048, 1536, 3712], [2048, 256, 3712]]),
  );
  return merged(floors, block);
}

describe("crash's spawn", () => {
  const SIZE: Vec3 = [2048, 2048, 4096];
  const spawnOn = (mesh: Mesh) => spawnPoint(mesh, solidCells(mesh, SIZE, 128), 128);

  test("a spawn object puts crash on the ground below it", () => {
    expect(spawnOn(merged(floorMesh(0, 0, 2048, 4096, 512), cube(1000, 900, 3000, 32, "Spawn")))).toEqual([1000, 512, 3000]);
  });

  test("a spawn object isn't drawn or solid", () => {
    const marker = cube(1000, 900, 3000, 32, "spawn");
    expect(solidCells(marker, SIZE, 128).size).toBe(0);
    expect(worldMeshes(marker, { piece: 256, ground: { texinfo: 5, page: 1 }, side: { texinfo: 9, page: 2 } })).toEqual([]);
  });

  test("without one, crash starts where the longest walk along the route starts", () => {
    const [x, y, z] = spawnOn(blockedStart());
    expect(y).toBe(256);
    expect(z).toBeLessThan(3328); // in front of the block
    expect([960, 1088]).toContain(x); // the middle across
  });

  test("the camera behind crash starts over the walk too", () => {
    // the camera follows CAM_LEAD behind (+z of) crash, so he starts that far along the walk
    const [, , z] = spawnOn(blockedStart());
    expect(z + CAM_LEAD).toBeLessThan(3328);
    expect(z + CAM_LEAD).toBeGreaterThan(3328 - 3 * 128);
  });

  test("the walk goes up and down gentle steps", () => {
    // eight floors 512 long along z, every other one a cell higher: steps crash can walk
    const staircase = merged(...Array.from({ length: 8 }, (_, k) => floorMesh(0, k * 512, 2048, k * 512 + 512, 256 + 128 * (k % 2))));
    // the walk starts in the middle of the cell at the +z end, and runs the whole way, so crash
    // starts about CAM_LEAD (12 cells) along it, as on a flat floor
    const walkStart = 4096 - 64;
    expect(spawnOn(staircase)[2]).toBe(walkStart - 12 * 128);
  });

  test("the middle across is the middle of the floors, not of the zone", () => {
    expect([320, 448]).toContain(spawnOn(floorMesh(0, 0, 768, 2048, 256))[0]); // either column next to 384
  });

  test("crash starts on a floor, not on top of a wall", () => {
    const wall = quadMesh([[0, 0, 2048], [0, 1024, 2048], [2048, 1024, 2048], [2048, 0, 2048]]);
    const [, y, z] = spawnOn(merged(floorMesh(0, 0, 2048, 2048, 256), wall));
    expect(y).toBe(256);
    expect(z).toBeLessThan(2048);
  });

  test("no ground is an error", () => {
    expect(() => spawnPoint(meshOf([], []), new Cells(), 128)).toThrow("the map has no ground for crash to start on");
  });
});

describe("where the camera is from crash", () => {
  test("default camera settings keep the standard follow distance and height", () => {
    expect(cameraOffsets(DEFAULT_CAMERA)).toEqual({ lead: CAM_LEAD, height: CAM_OFFSET[1] });
  });

  test("its distance scales both", () => {
    expect(cameraOffsets({ distance: 2, angle: 42 })).toEqual({ lead: 2 * CAM_LEAD, height: 2 * CAM_OFFSET[1] });
  });

  test("its angle turns it about crash, keeping its distance", () => {
    // up or down, that many degrees from where it was
    const usual = Math.hypot(CAM_LEAD, CAM_OFFSET[1]);
    const degrees = (offsets: { lead: number; height: number }) => (Math.atan2(offsets.height, offsets.lead) * 180) / Math.PI;
    const steep = cameraOffsets({ distance: 1, angle: 60 });
    expect(Math.hypot(steep.lead, steep.height)).toBeCloseTo(usual, 0);
    expect(degrees(steep) - degrees(cameraOffsets(DEFAULT_CAMERA))).toBeCloseTo(18, 1);
  });
});

describe("zone paths", () => {
  const SPANS: Span[] = [[32768, 49152], [16384, 32768], [0, 16384]];

  test("each point goes to the zone crash is in, relative to it", () => {
    // crash is CAM_LEAD ahead (-z) of the camera, as on n. sanity beach
    const points: Vec3[] = [[1, 2, 40000], [1, 2, 32768 + CAM_LEAD], [1, 2, 32767 + CAM_LEAD], [1, 2, 1000]];
    expect(zonePaths(points, SPANS)).toEqual([
      [[1, 2, 40000 - 32768], [1, 2, CAM_LEAD]],
      [[1, 2, 16383 + CAM_LEAD]],
      [[1, 2, 1000]],
    ]);
  });

  test("the zone a point is in", () => {
    expect([40000, 32767, 16384, 0].map((z) => zoneIndex(SPANS, z))).toEqual([0, 1, 1, 2]);
  });

  test("with the camera further behind, a point goes to the zone crash is in that far ahead", () => {
    expect(zonePaths([[1, 2, 32767 + 3000], [1, 2, 32768 + 3000]], SPANS, 3000)).toEqual([[[1, 2, 3000]], [[1, 2, 16383 + 3000]], []]);
  });

  test("zones before the start have no points", () => {
    expect(zonePaths([[1, 2, 20000], [1, 2, 1000]], SPANS)).toEqual([[], [[1, 2, 20000 - 16384]], [[1, 2, 1000]]]);
  });
});

describe("the camera path", () => {
  const SIZE: Vec3 = [2048, 4096, 8192];
  const pathOver = (mesh: Mesh, start: Vec3, step = 256) => cameraPath(solidCells(mesh, SIZE, 128), SIZE, 128, start, step);
  const heights = (points: Vec3[]) => new Set(points.map(([, y]) => y));

  test("the game keeps the camera as high as the path does", () => {
    // FOLLOW_CAM_HEIGHT (game units) in src/pc/follow.h is the height the follow camera keeps above crash's floor
    const followH = readFileSync(fileURLToPath(new URL("../../../../src/pc/follow.h", import.meta.url)), "utf8");
    const line = followH.split(/\r?\n/).find((candidate) => candidate.startsWith("#define FOLLOW_CAM_HEIGHT"))!;
    expect(line).toContain(`(${CAM_OFFSET[1]} << 8)`);
  });

  test("its height ignores the tops of walls", () => {
    // a low wall running along z under crash's x: its top isn't somewhere to stand
    const wall = quadMesh([[1024, 0, 0], [1024, 1024, 0], [1024, 1024, 8192], [1024, 0, 8192]]);
    expect(heights(pathOver(merged(floorMesh(0, 0, 2048, 8192, 512), wall), [960, 512, 5000]))).toEqual(new Set([512 + CAM_OFFSET[1]]));
  });

  test("it follows crash from behind along -z", () => {
    const points = pathOver(floorMesh(0, 0, 2048, 8192, 512), [1024, 512, 5000]);
    expect(points[0]).toEqual([1024 + CAM_OFFSET[0], 512 + CAM_OFFSET[1], 5000 + CAM_LEAD]);
    expect(points.slice(1).map((point, index) => point[2] - points[index][2])).toEqual(Array(points.length - 1).fill(-256));
    expect(points[points.length - 1][2]).toBeGreaterThan(0);
    expect(points[points.length - 1][2]).toBeLessThanOrEqual(256 + 200);
  });

  test("it starts inside the zone", () => {
    expect(pathOver(floorMesh(0, 0, 2048, 8192, 512), [1024, 512, 8000])[0][2]).toBeLessThanOrEqual(8192 - 200);
  });

  test("its height follows the ground ahead of the camera", () => {
    const mesh = merged(floorMesh(0, 4096, 2048, 8192, 512), floorMesh(0, 0, 2048, 4096, 1024));
    for (const [, y, z] of pathOver(mesh, [1024, 512, 6000])) {
      expect(y).toBe((z - CAM_LEAD < 4096 ? 1024 : 512) + CAM_OFFSET[1]);
    }
  });

  test("its height is kept over a gap", () => {
    const mesh = merged(floorMesh(0, 4096, 2048, 8192, 512), floorMesh(0, 0, 2048, 2048, 1024));
    const overGap = pathOver(mesh, [1024, 512, 6000]).find(([, , z]) => z - CAM_LEAD >= 2048 && z - CAM_LEAD < 4096)!;
    expect(overGap[1]).toBe(512 + CAM_OFFSET[1]);
  });

  test("it picks the ground nearest the last height", () => {
    const upper = floorMesh(0, 0, 2048, 8192, 2048); // an upper floor over the whole route
    expect(heights(pathOver(merged(floorMesh(0, 0, 2048, 8192, 512), upper), [1024, 512, 5000]))).toEqual(new Set([512 + CAM_OFFSET[1]]));
  });
});
