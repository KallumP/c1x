import { describe, expect, test } from "vitest";
import { mossySlideImages, mossySlidePlank, mossySlidePath, SLIDE_MATERIALS, withPlanks } from "../../builder/mossySlide";
import { normal } from "../../builder/faces";
import { expectNear } from "../helpers";

const tan = (degrees: number) => Math.tan((degrees * Math.PI) / 180);

describe("a mossy slide's textures, made like the great gate's", () => {
  const images = mossySlideImages();
  const pixels = (material: string) => {
    const { rgb } = images.get(material)!;
    return Array.from({ length: rgb.length / 3 }, (_, index) => [rgb[3 * index], rgb[3 * index + 1], rgb[3 * index + 2]]);
  };

  test("one image each for its moss, log ends and bark", () => {
    expect([...images.keys()].sort()).toEqual(Object.values(SLIDE_MATERIALS).sort());
    images.forEach(({ width, height, rgb }) => expect(rgb.length).toBe(width * height * 3));
  });

  test("the moss is mostly green, the bark brown", () => {
    const greenish = pixels(SLIDE_MATERIALS.moss).filter(([r, g, b]) => g > r && g > b);
    expect(greenish.length).toBeGreaterThan(pixels(SLIDE_MATERIALS.moss).length * 0.8);
    const brownish = pixels(SLIDE_MATERIALS.bark).filter(([r, g, b]) => r > b && r >= g);
    expect(brownish.length).toBeGreaterThan(pixels(SLIDE_MATERIALS.bark).length * 0.8);
  });

  test("a log end is pale wood in the middle, bark round its edge", () => {
    const { width, height, rgb } = images.get(SLIDE_MATERIALS.logEnd)!;
    const at = (x: number, y: number) => rgb.slice(3 * (y * width + x), 3 * (y * width + x) + 3);
    const [middle, corner] = [at(width / 2, height / 2), at(0, 0)];
    expect(middle[0] + middle[1] + middle[2]).toBeGreaterThan(corner[0] + corner[1] + corner[2]);
  });
});

describe("a mossy slide's plank", () => {
  test.each([
    { length: 4000, angle: 20, reverse: false, way: 1 },
    { length: 1500, angle: 8, reverse: true, way: -1 },
  ])("$length long at $angle degrees, reversed $reverse: from its top end along the map and down", ({ length, angle, reverse, way }) => {
    const plank = mossySlidePlank(length, angle, reverse);
    const xs = plank.vertices.map(([x]) => x * way);
    expectNear(Math.min(...xs), 0, 1);
    expectNear(Math.max(...xs), length, 1);
    // its top along the slope from its top end, its bottom a log's thickness under it
    plank.vertices.forEach(([x, y]) => expect(y + Math.abs(x) * tan(angle)).toBeLessThanOrEqual(1));
    expect(plank.vertices.some(([x, y]) => Math.abs(y + Math.abs(x) * tan(angle)) < 1)).toBe(true);
  });

  test("its top is mossy and faces up, so crash stands on it; its front is log ends, facing the camera (+z)", () => {
    const plank = mossySlidePlank(3000, 15, false);
    const byMaterial = (material: string) => plank.triangles.filter((triangle) => triangle.material === material);
    expect(byMaterial(SLIDE_MATERIALS.moss).length).toBeGreaterThan(0);
    byMaterial(SLIDE_MATERIALS.moss).forEach((triangle) => expect(normal(plank, triangle)![1]).toBeGreaterThan(0.9));
    byMaterial(SLIDE_MATERIALS.logEnd).forEach((triangle) => expect(normal(plank, triangle)![2]).toBeGreaterThan(0.9));
    expect(byMaterial(SLIDE_MATERIALS.bark).length).toBeGreaterThan(0);
  });

  test("its faces come in the order they're drawn: bark (under, behind and at its ends), then its mossy top, then its log ends", () => {
    // the sort list draws farthest first by middle z, and a log's top and underside have the same middles,
    // so which is drawn over the other is their order: the top must come after, or the bark shows through it
    const materials = mossySlidePlank(2000, 15, false).triangles.map(({ material }) => material);
    const lastBark = materials.lastIndexOf(SLIDE_MATERIALS.bark);
    expect(lastBark).toBeLessThan(materials.indexOf(SLIDE_MATERIALS.moss));
    expect(materials.lastIndexOf(SLIDE_MATERIALS.moss)).toBeLessThan(materials.indexOf(SLIDE_MATERIALS.logEnd));
  });

  test("reversed, its faces still face out", () => {
    const plank = mossySlidePlank(3000, 15, true);
    plank.triangles.filter((triangle) => triangle.material === SLIDE_MATERIALS.moss)
      .forEach((triangle) => expect(normal(plank, triangle)![1]).toBeGreaterThan(0.9));
  });

  test("each face has its own texture coordinates, on its image", () => {
    const plank = mossySlidePlank(2500, 25, false);
    plank.triangles.forEach(({ uvs }) => {
      expect(uvs!.length).toBe(3);
      uvs!.flat().forEach((value) => { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1); });
    });
  });
});

describe("a mossy slide's slider path", () => {
  test("along its plank's top and on past its end, its points about 450 apart", () => {
    const path = mossySlidePath(4000, 20, false);
    expect(path[0]).toEqual([0, 0, 0]);
    const [x, y, z] = path.at(-1)!;
    expectNear([x, y, z], [4400, -4400 * tan(20), 0], 1);
    path.slice(1).forEach(([px], point) => expectNear(px - path[point][0], 450, 60));
    expect(mossySlidePath(4000, 20, true).at(-1)![0]).toBeCloseTo(-4400);
  });
});

describe("planks added to a map's mesh", () => {
  test("the map's own, then each plank's moved to where it goes, so it's drawn and solid as the map is", () => {
    const map = { vertices: [[0, 0, 0], [1, 0, 0], [0, 0, 1]] as [number, number, number][], triangles: [{ corners: [0, 1, 2] as [number, number, number], object: null, material: "grass" }], materialLibraries: [] };
    const plank = mossySlidePlank(1000, 10, false);
    const merged = withPlanks(map, [{ plank, at: [500, 200, -300] }]);
    expect(merged.vertices.length).toBe(3 + plank.vertices.length);
    expect(merged.vertices[3]).toEqual(plank.vertices[0].map((value, axis) => value + [500, 200, -300][axis]));
    expect(merged.triangles[0]).toEqual(map.triangles[0]);
    expect(merged.triangles[1].corners).toEqual(plank.triangles[0].corners.map((corner) => corner + 3));
    expect(merged.triangles.length).toBe(1 + plank.triangles.length);
  });
});
