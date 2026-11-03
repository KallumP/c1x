import { describe, expect, test } from "vitest";
import type { RgbImage } from "../../builder/images";
import { tileFromImage } from "../../builder/tiles";
import { colour5551, type Rgb } from "../../builder/tpage";

function imageOf(width: number, height: number, colourAt: (x: number, y: number) => Rgb): RgbImage {
  const rgb = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      rgb.set(colourAt(x, y), (y * width + x) * 3);
    }
  }
  return { width, height, rgb };
}

// a size x size image of two colours in a checkerboard of 1 pixel squares
const checker = (size: number, a: Rgb, b: Rgb) => imageOf(size, size, (x, y) => ((x + y) % 2 ? a : b));

const RED: Rgb = [248, 0, 0];
const BLUE: Rgb = [0, 0, 248];

describe("tiles", () => {
  test("a tile is 64 x 64 indices into 16 colours", () => {
    const { pixels, palette } = tileFromImage(checker(32, RED, BLUE));
    expect(pixels.length).toBe(64 * 64);
    expect(palette.length).toBe(16);
    expect(pixels.every((index) => index >= 0 && index < 16)).toBe(true);
  });

  test("pixels keep their colours", () => {
    const { pixels, palette } = tileFromImage(checker(64, RED, BLUE));
    expect(palette[pixels[0]]).toBe(colour5551(BLUE)); // (0, 0) is b
    expect(palette[pixels[1]]).toBe(colour5551(RED));
  });

  test("a smaller image is scaled up without blurring", () => {
    const { pixels } = tileFromImage(checker(32, RED, BLUE));
    expect(new Set(pixels).size).toBe(2);
    expect(pixels[0]).toBe(pixels[1]); // each pixel is now 2x2
    expect(pixels[0]).not.toBe(pixels[2]);
  });

  test("a bigger image is scaled down smoothly", () => {
    const halves = imageOf(128, 128, (x) => (x < 64 ? RED : BLUE));
    const { pixels, palette } = tileFromImage(halves);
    expect(palette[pixels[0]]).toBe(colour5551(RED));
    expect(palette[pixels[63]]).toBe(colour5551(BLUE));
    expect(palette[pixels[31]]).not.toBe(palette[pixels[32]]);
  });

  test("many colours are reduced to 16, near the image's own", () => {
    const gradient = imageOf(64, 64, (x, y) => [x * 4, y * 4, (x + y) * 2]);
    const { pixels, palette } = tileFromImage(gradient);
    expect(new Set(pixels).size).toBeLessThanOrEqual(16);
    expect(new Set(pixels).size).toBeGreaterThan(8);
    const red = (colour: number) => (colour & 31) << 3;
    expect(Math.abs(red(palette[pixels[63]]) - 252)).toBeLessThan(40); // the top right is red
    expect(red(palette[pixels[0]])).toBeLessThan(40);                  // the top left isn't
  });
});
