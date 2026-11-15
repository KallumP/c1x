import { describe, expect, test } from "vitest";
import type { RgbImage } from "../../builder/images";
import { fillLoadingImage, LOADING_IMAGE_HEIGHT, LOADING_IMAGE_WIDTH, loadingImageBytes, loadingImageFromBytes } from "../../builder/loadingImage";
import { LDAT_IMAGE_SIZE } from "../../builder/levelFiles";
import { colour5551, type Rgb } from "../../builder/tpage";

const pixelAt = (image: RgbImage, x: number, y: number) => [...image.rgb.subarray((y * image.width + x) * 3, (y * image.width + x) * 3 + 3)];

// a width x height image, each pixel the colour colourAt gives for its column
function stripes(width: number, height: number, colourAt: (x: number) => number[]): RgbImage {
  const rgb = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      rgb.set(colourAt(x), (y * width + x) * 3);
    }
  }
  return { width, height, rgb };
}

const colours = (image: RgbImage) => new Set(Array.from({ length: image.width * image.height }, (_, i) => [...image.rgb.subarray(i * 3, i * 3 + 3)].join()));

describe("a picture of the level's own as its loading screen", () => {
  test("one the loading screen's size stays as it is", () => {
    const picture = stripes(LOADING_IMAGE_WIDTH, LOADING_IMAGE_HEIGHT, (x) => [x % 256, 0, 0]);
    expect(fillLoadingImage(picture)).toEqual(picture);
  });

  test("a wider one is cut at its sides, keeping its middle", () => {
    const width = 2 * LOADING_IMAGE_WIDTH;
    const isMiddleHalf = (x: number) => x >= width / 4 && x < (3 * width) / 4;
    const greenInTheMiddle = (x: number) => {
      if (isMiddleHalf(x)) {
        return [0, 255, 0];
      }
      return [255, 0, 0];
    };
    const picture = stripes(width, LOADING_IMAGE_HEIGHT, greenInTheMiddle);
    expect(colours(fillLoadingImage(picture))).toEqual(new Set(["0,255,0"]));
  });

  test("a smaller one is stretched to fill it", () => {
    const filled = fillLoadingImage(stripes(LOADING_IMAGE_WIDTH / 2, LOADING_IMAGE_HEIGHT / 2, () => [9, 8, 7]));
    expect([filled.width, filled.height]).toEqual([LOADING_IMAGE_WIDTH, LOADING_IMAGE_HEIGHT]);
    expect(colours(filled)).toEqual(new Set(["9,8,7"]));
  });
});

describe("the loading screen in the game's format", () => {
  const PALETTE_COLOURS = 256;

  // the colour the game shows at x, y of the ldat's image bytes: its palette entry for the pixel's index
  function shownColour(bytes: Buffer, x: number, y: number): number {
    const pixels = LOADING_IMAGE_WIDTH * LOADING_IMAGE_HEIGHT;
    const paletteAt = bytes.length - (2 * PALETTE_COLOURS + pixels);
    const index = bytes[paletteAt + 2 * PALETTE_COLOURS + y * LOADING_IMAGE_WIDTH + x];
    return bytes.readUInt16LE(paletteAt + 2 * index);
  }

  test("fills the ldat's image bytes, its palette and pixels at their end", () => {
    const blueThenGreen = (x: number) => {
      if (x < LOADING_IMAGE_WIDTH / 2) {
        return [0, 0, 200];
      }
      return [0, 120, 0];
    };
    const bytes = loadingImageBytes(stripes(LOADING_IMAGE_WIDTH, LOADING_IMAGE_HEIGHT, blueThenGreen));
    expect(bytes.length).toBe(LDAT_IMAGE_SIZE);
    expect(shownColour(bytes, 0, 0)).toBe(colour5551([0, 0, 200]));
    expect(shownColour(bytes, LOADING_IMAGE_WIDTH - 1, LOADING_IMAGE_HEIGHT - 1)).toBe(colour5551([0, 120, 0]));
  });

  test("reads back as the picture, its colours in 16 bit", () => {
    const picture = stripes(LOADING_IMAGE_WIDTH, LOADING_IMAGE_HEIGHT, (x) => [(x % 32) * 8, 248 - (x % 32) * 8, 64]);
    const read = loadingImageFromBytes(loadingImageBytes(picture), LOADING_IMAGE_WIDTH, LOADING_IMAGE_HEIGHT);
    expect([read.width, read.height]).toEqual([LOADING_IMAGE_WIDTH, LOADING_IMAGE_HEIGHT]);
    expect(Array.from({ length: LOADING_IMAGE_WIDTH }, (_, x) => colour5551(pixelAt(read, x, 7) as Rgb)))
      .toEqual(Array.from({ length: LOADING_IMAGE_WIDTH }, (_, x) => colour5551(pixelAt(picture, x, 7) as Rgb)));
  });

  test("keeps a picture's colours in 16 bit, cutting it to 256 if it has more", () => {
    const picture = stripes(LOADING_IMAGE_WIDTH, LOADING_IMAGE_HEIGHT, (x) => [x % 256, (x * 7) % 256, (x * 13) % 256]);
    const bytes = loadingImageBytes(picture);
    const shown = new Set(Array.from({ length: LOADING_IMAGE_WIDTH }, (_, x) => shownColour(bytes, x, 0)));
    expect(shown.size).toBeLessThanOrEqual(PALETTE_COLOURS);
    expect(shown.size).toBeGreaterThan(100);
  });
});
