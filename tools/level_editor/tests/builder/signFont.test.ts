import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { RgbImage } from "../../builder/images";
import { LOADING_IMAGE_HEIGHT, LOADING_IMAGE_WIDTH } from "../../builder/loadingImage";
import { NAME_TOP, ORIGINAL_LOADING_SCREENS, readLoadingScreens, type LoadingScreen } from "../../builder/loadingScreens";
import { blankSign } from "../../builder/loadingSign";
import { baselineOf, fillColumnsOf, signFont, SIGN_FONT_CHARACTERS, type Glyph } from "../../builder/signFont";

const WOOD = [120, 40, 10];
const WHITE = [240, 240, 240];
const BLACK = [0, 0, 0];

function plainSign(): RgbImage {
  const image: RgbImage = { width: LOADING_IMAGE_WIDTH, height: LOADING_IMAGE_HEIGHT, rgb: new Uint8Array(LOADING_IMAGE_WIDTH * LOADING_IMAGE_HEIGHT * 3) };
  for (let pixel = 0; pixel < image.width * image.height; pixel++) {
    image.rgb.set(WOOD, pixel * 3);
  }
  return image;
}

// the sign with a white, black-outlined block for each letter of name, letterWidths[i] wide, 3 apart
function signNamed(name: string, letterWidths: number[]): LoadingScreen {
  const image = plainSign();
  const top = NAME_TOP + 10;
  const bottom = NAME_TOP + 22;
  let left = 150;
  letterWidths.forEach((width) => {
    for (let y = top - 1; y <= bottom + 1; y++) {
      for (let x = left - 1; x <= left + width; x++) {
        const isEdge = y === top - 1 || y === bottom + 1 || x === left - 1 || x === left + width;
        let colour = WHITE;
        if (isEdge) {
          colour = BLACK;
        }
        image.rgb.set(colour, (y * image.width + x) * 3);
      }
    }
    left += width + 3;
  });
  return { name, image };
}

const glyphPixel = (glyph: Glyph, x: number, y: number) => glyph.pixels[y * glyph.width + x];

describe("the letters cut out of the screens' names", () => {
  const screens = [signNamed("AB", [10, 13]), signNamed("BA", [13, 10]), signNamed("BAA", [13, 12, 10])];
  const font = signFont(screens, plainSign());

  test("are each name's letters, in order", () => {
    expect(fillColumnsOf(font.get("A")!)).toEqual([1, 10]);
    expect(fillColumnsOf(font.get("B")!)).toEqual([1, 13]);
  });

  test("are each letter's most common width", () => {
    const [left, right] = fillColumnsOf(font.get("A")!);
    expect(right - left + 1).toBe(10);
  });

  test("keep the letters' outline, but not the sign behind them", () => {
    const glyph = font.get("A")!;
    const [left, right] = fillColumnsOf(glyph);
    const baseline = baselineOf(glyph);
    expect([glyph.width, glyph.height]).toEqual([right + 2, baseline + 2]);
    expect(glyphPixel(glyph, left - 1, baseline)).toEqual(BLACK);
    expect(glyphPixel(glyph, right + 1, baseline + 1)).toEqual(BLACK);
    expect(glyphPixel(glyph, left, baseline)).toEqual(WHITE);
  });

  test("stop the build if a name doesn't split into its letters", () => {
    expect(() => signFont([signNamed("ABC", [10, 13])], plainSign())).toThrow("AB");
  });
});

const STREAMS = fileURLToPath(new URL("../../../../streams", import.meta.url));
const hasStreams = ORIGINAL_LOADING_SCREENS.every(({ file }) => existsSync(join(STREAMS, `${file}.nsd`)));

describe.skipIf(!hasStreams)("the letters of the game's loading screens", () => {
  const screens = hasStreams ? readLoadingScreens(STREAMS) : [];
  const font = hasStreams ? signFont(screens, blankSign(screens)) : new Map<string, Glyph>();

  test("are every capital letter and a full stop", () => {
    expect([...font.keys()].sort().join("")).toBe(SIGN_FONT_CHARACTERS.split("").sort().join(""));
  });

  test("have only their outline and shadow at their edges, none of the sign behind them", () => {
    const isDark = (colour: number[]) => colour[0] + colour[1] + colour[2] < 160; // the sign around them is lighter
    for (const glyph of font.values()) {
      for (let y = 0; y < glyph.height; y++) {
        for (let x = 0; x < glyph.width; x++) {
          const isEdge = glyphPixel(glyph, x, y) !== null && [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
            .some(([nx, ny]) => nx < 0 || ny < 0 || nx >= glyph.width || ny >= glyph.height || glyphPixel(glyph, nx, ny) === null);
          if (isEdge) {
            expect(isDark(glyphPixel(glyph, x, y)!)).toBe(true);
          }
        }
      }
    }
  });

  test("Z is N turned on its side", () => {
    const n = font.get("N")!;
    const z = font.get("Z")!;
    expect([z.width, z.height]).toEqual([n.height, n.width]);
    expect(glyphPixel(z, z.width - 1 - 3, 5)).toEqual(glyphPixel(n, 5, 3));
  });

  test("Q is O with a tail below it", () => {
    const o = font.get("O")!;
    const q = font.get("Q")!;
    expect(q.pixels.slice(0, o.width * 4)).toEqual(o.pixels.slice(0, o.width * 4));
    expect(q.height).toBeGreaterThan(o.height);
  });
});
