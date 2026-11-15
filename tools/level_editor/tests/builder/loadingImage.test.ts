import { describe, expect, test } from "vitest";
import type { RgbImage } from "../../builder/images";
import { LOADING_IMAGE_HEIGHT, LOADING_IMAGE_WIDTH, TITLE_MARGIN, titleCard } from "../../builder/loadingImage";
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
