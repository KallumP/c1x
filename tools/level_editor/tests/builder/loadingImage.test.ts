import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { describe, expect, test } from "vitest";
import type { RgbImage } from "../../builder/images";
import { fillLoadingImage, LOADING_IMAGE_HEIGHT, LOADING_IMAGE_WIDTH, loadingImageFor, TITLE_MARGIN, titleCard } from "../../builder/loadingImage";
import type { Sky } from "../../src/sky";

const SKY: Sky = { top: [0, 0, 200], bottom: [0, 120, 0], split: 100 };

const pixelAt = (image: RgbImage, x: number, y: number) => [...image.rgb.subarray((y * image.width + x) * 3, (y * image.width + x) * 3 + 3)];

const isSkyColumn = (image: RgbImage, x: number, sky: RgbImage) =>
  Array.from({ length: image.height }, (_, y) => pixelAt(image, x, y).join() === pixelAt(sky, x, y).join()).every(Boolean);

// the leftmost and rightmost columns the title draws in, against the card with no title
function titleColumns(image: RgbImage): [number, number] {
  const sky = titleCard("", SKY);
  const drawn = Array.from({ length: image.width }, (_, x) => x).filter((x) => !isSkyColumn(image, x, sky));
  return [drawn[0], drawn[drawn.length - 1]];
}

describe("a level's title card", () => {
  test("is the loading screen's size", () => {
    const card = titleCard("Tide Ruins", SKY);
    expect([card.width, card.height]).toEqual([LOADING_IMAGE_WIDTH, LOADING_IMAGE_HEIGHT]);
    expect(card.rgb.length).toBe(LOADING_IMAGE_WIDTH * LOADING_IMAGE_HEIGHT * 3);
  });

  test("fades from the level's sky top colour to its bottom one, behind the title", () => {
    const card = titleCard("Tide Ruins", SKY);
    expect(pixelAt(card, 0, 0)).toEqual(SKY.top);
    expect(pixelAt(card, 0, LOADING_IMAGE_HEIGHT - 1)).toEqual(SKY.bottom);
  });

  test("puts the title in the middle", () => {
    const [left, right] = titleColumns(titleCard("Tide Ruins", SKY));
    expect(Math.abs(left - (LOADING_IMAGE_WIDTH - 1 - right))).toBeLessThanOrEqual(1);
  });

  test("draws a long title smaller, so it still fits inside the margins", () => {
    const short = titleColumns(titleCard("Lab", SKY));
    const long = titleColumns(titleCard("A".repeat(30), SKY));
    expect(long[0]).toBeGreaterThanOrEqual(TITLE_MARGIN);
    expect(long[1]).toBeLessThan(LOADING_IMAGE_WIDTH - TITLE_MARGIN);
    expect(short[1] - short[0]).toBeGreaterThan(60); // a short one is drawn big, not at the smallest size
  });
});

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
    const red = [255, 0, 0], green = [0, 255, 0], blue = [0, 0, 255];
    const width = 2 * LOADING_IMAGE_WIDTH;
    const picture = stripes(width, LOADING_IMAGE_HEIGHT, (x) => (x < width / 4 ? red : x >= (3 * width) / 4 ? blue : green));
    expect(colours(fillLoadingImage(picture))).toEqual(new Set([green.join()]));
  });

  test("a smaller one is stretched to fill it", () => {
    const filled = fillLoadingImage(stripes(LOADING_IMAGE_WIDTH / 2, LOADING_IMAGE_HEIGHT / 2, () => [9, 8, 7]));
    expect([filled.width, filled.height]).toEqual([LOADING_IMAGE_WIDTH, LOADING_IMAGE_HEIGHT]);
    expect(colours(filled)).toEqual(new Set(["9,8,7"]));
  });
});

describe("a level's loading screen", () => {
  test("is its folder's loading.png if it has one", () => {
    const folder = mkdtempSync(join(tmpdir(), "loading-"));
    const png = new PNG({ width: LOADING_IMAGE_WIDTH, height: LOADING_IMAGE_HEIGHT });
    png.data.fill(200);
    writeFileSync(join(folder, "loading.png"), PNG.sync.write(png));
    expect(colours(loadingImageFor(folder, "Tide Ruins", SKY))).toEqual(new Set(["200,200,200"]));
  });

  test("is its title card if it hasn't", () => {
    const folder = mkdtempSync(join(tmpdir(), "loading-"));
    expect(loadingImageFor(folder, "Tide Ruins", SKY)).toEqual(titleCard("Tide Ruins", SKY));
  });
});
