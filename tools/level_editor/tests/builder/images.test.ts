import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { describe, expect, test } from "vitest";
import { readImage } from "../../builder/images";

const folder = mkdtempSync(join(tmpdir(), "images-"));

// a width x height RGBA image of one colour
function rgbaPixels(width: number, height: number, rgba: number[]): Buffer {
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    pixels.set(rgba, i * 4);
  }
  return pixels;
}

describe("reading images", () => {
  test("a PNG as its RGB pixels, ignoring alpha", () => {
    const png = new PNG({ width: 3, height: 2 });
    png.data = rgbaPixels(3, 2, [10, 200, 30, 0]);
    const path = join(folder, "flat.png");
    writeFileSync(path, PNG.sync.write(png));
    const image = readImage(path);
    expect([image.width, image.height]).toEqual([3, 2]);
    expect([...image.rgb.subarray(0, 6)]).toEqual([10, 200, 30, 10, 200, 30]);
  });

  test("a JPEG", () => {
    const encoded = jpeg.encode({ data: rgbaPixels(8, 4, [255, 0, 0, 255]), width: 8, height: 4 }, 100);
    const path = join(folder, "red.jpg");
    writeFileSync(path, encoded.data);
    const image = readImage(path);
    expect([image.width, image.height]).toEqual([8, 4]);
    expect(image.rgb[0]).toBeGreaterThan(240);
    expect(image.rgb[1]).toBeLessThan(16);
  });

  test("anything else is an error naming the file", () => {
    const path = join(folder, "picture.bmp");
    writeFileSync(path, "BM not really");
    expect(() => readImage(path)).toThrow(/picture\.bmp/);
  });
});
