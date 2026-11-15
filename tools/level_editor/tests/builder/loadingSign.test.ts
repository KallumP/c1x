import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { describe, expect, test } from "vitest";
import type { RgbImage } from "../../builder/images";
import { LOADING_IMAGE_HEIGHT, LOADING_IMAGE_WIDTH } from "../../builder/loadingImage";
import { isNameFill, nameFill, NAME_BOTTOM, NAME_LEFT, NAME_RIGHT, NAME_TOP, ORIGINAL_LOADING_SCREENS, readLoadingScreens, type LoadingScreen } from "../../builder/loadingScreens";
import { blankSign, gameLoadingSign, LOADING_PICTURE, loadingImageFor, NAME_CENTRE, NAME_MAX_WIDTH, signWithTitle } from "../../builder/loadingSign";
import { signFont, type Glyph } from "../../builder/signFont";
import type { Rgb } from "../../builder/tpage";

const WOOD = (x: number, y: number) => [100 + (x % 40), 30 + (y % 20), 10];
const WHITE = [240, 240, 240];
const BLACK = [0, 0, 0];

function setPixel(image: RgbImage, x: number, y: number, colour: number[]): void {
  image.rgb.set(colour, (y * image.width + x) * 3);
}
const pixelAt = (image: RgbImage, x: number, y: number) => [...image.rgb.subarray((y * image.width + x) * 3, (y * image.width + x) * 3 + 3)];

function woodSign(): RgbImage {
  const image: RgbImage = { width: LOADING_IMAGE_WIDTH, height: LOADING_IMAGE_HEIGHT, rgb: new Uint8Array(LOADING_IMAGE_WIDTH * LOADING_IMAGE_HEIGHT * 3) };
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      setPixel(image, x, y, WOOD(x, y));
    }
  }
  return image;
}

// the sign with a white, black-outlined block for a name, from column left to right
function signNamed(left: number, right: number): LoadingScreen {
  const image = woodSign();
  for (let y = NAME_TOP + 9; y <= NAME_TOP + 23; y++) {
    for (let x = left - 1; x <= right + 1; x++) {
      const isEdge = y === NAME_TOP + 9 || y === NAME_TOP + 23 || x === left - 1 || x === right + 1;
      if (isEdge) {
        setPixel(image, x, y, BLACK);
      } else {
        setPixel(image, x, y, WHITE);
      }
    }
  }
  return { name: "BLOCK", image };
}

describe("the loading sign with no name on it", () => {
  test("is the sign the screens share, from the pixels that aren't under their names", () => {
    const blank = blankSign([signNamed(150, 200), signNamed(180, 260), signNamed(240, 300)]);
    expect(blank).toEqual(woodSign());
  });

  test("fills a pixel under every screen's name from the sign beside it", () => {
    const blank = blankSign([signNamed(150, 200), signNamed(190, 260)]);
    // with the 2 columns kept clear around a name's letters, both names cover columns 188 to 202:
    // the nearest of the sign beside it, on the left first, is column 187
    expect(pixelAt(blank, 195, NAME_TOP + 15)).toEqual(WOOD(187, NAME_TOP + 15));
  });
});

const STREAMS = fileURLToPath(new URL("../../../../streams", import.meta.url));
const hasStreams = ORIGINAL_LOADING_SCREENS.every(({ file }) => existsSync(join(STREAMS, `${file}.nsd`)));

// a font of plain blocks: each letter a white block width columns wide, with a black outline
function blockFont(widths: Record<string, number>): Map<string, Glyph> {
  return new Map(Object.entries(widths).map(([letter, width]) => {
    const glyph: Glyph = { width: width + 2, height: 15, pixels: [] };
    for (let y = 0; y < glyph.height; y++) {
      for (let x = 0; x < glyph.width; x++) {
        const isEdge = y === 0 || y === glyph.height - 1 || x === 0 || x === glyph.width - 1;
        if (isEdge) {
          glyph.pixels.push(BLACK as Rgb);
        } else {
          glyph.pixels.push(WHITE as Rgb);
        }
      }
    }
    return [letter, glyph];
  }));
}

// the columns the title's white is drawn in, on a wooden sign
function whiteColumns(image: RgbImage): number[] {
  const columns = new Set<number>();
  for (let y = NAME_TOP; y < NAME_BOTTOM; y++) {
    for (let x = NAME_LEFT; x < NAME_RIGHT; x++) {
      if (isNameFill(image, x, y)) {
        columns.add(x);
      }
    }
  }
  return [...columns].sort((a, b) => a - b);
}

// the runs of columns in columns: [first, last] each
function runsOf(columns: number[]): [number, number][] {
  const runs: [number, number][] = [];
  columns.forEach((column) => {
    const last = runs[runs.length - 1];
    if (last !== undefined && last[1] === column - 1) {
      last[1] = column;
    } else {
      runs.push([column, column]);
    }
  });
  return runs;
}

describe("a title on the loading sign", () => {
  const font = blockFont({ A: 13, I: 10, M: 14 });

  test("is drawn in capitals, 3 columns between letters and 13 between words", () => {
    const runs = runsOf(whiteColumns(signWithTitle(woodSign(), font, "Ai a")));
    const widths = runs.map(([first, last]) => last - first + 1);
    const gaps = runs.slice(1).map(([first], index) => first - runs[index][1] - 1);
    expect(widths).toEqual([13, 10, 13]);
    expect(gaps).toEqual([3, 13]);
  });

  test("is in the middle of the sign", () => {
    const columns = whiteColumns(signWithTitle(woodSign(), font, "AIM"));
    const middle = (columns[0] + columns[columns.length - 1]) / 2;
    expect(Math.abs(middle - NAME_CENTRE)).toBeLessThanOrEqual(1);
  });

  test("has its letters closer together if it's too wide for the sign", () => {
    const columns = whiteColumns(signWithTitle(woodSign(), font, "MMMMMMMMMMMMMMMMMMMM"));
    expect(columns[columns.length - 1] - columns[0] + 1).toBeLessThanOrEqual(NAME_MAX_WIDTH);
    expect(runsOf(columns).length).toBe(20);
  });

  test("can't have a letter the font hasn't", () => {
    expect(() => signWithTitle(woodSign(), font, "AB")).toThrow("B");
  });
});

describe("a level's loading screen", () => {
  test("is its folder's loading.png if it has one, without the game's files", () => {
    const folder = mkdtempSync(join(tmpdir(), "loading-"));
    const png = new PNG({ width: LOADING_IMAGE_WIDTH, height: LOADING_IMAGE_HEIGHT });
    png.data.fill(200);
    writeFileSync(join(folder, LOADING_PICTURE), PNG.sync.write(png));
    const image = loadingImageFor(folder, "Tide Ruins", join(folder, "no streams"));
    expect(new Set(Array.from({ length: image.width * image.height }, (_, i) => pixelAt(image, i % image.width, Math.floor(i / image.width)).join())))
      .toEqual(new Set(["200,200,200"]));
  });

  test.skipIf(!hasStreams)("is the game's sign with its title if it hasn't", () => {
    const folder = mkdtempSync(join(tmpdir(), "loading-"));
    expect(loadingImageFor(folder, "Tide Ruins", STREAMS)).toEqual(gameLoadingSign(STREAMS, "Tide Ruins"));
  });
});

describe.skipIf(!hasStreams)("the game's loading sign with no name on it", () => {
  test("has none of a name's white letters left", () => {
    const blank = blankSign(readLoadingScreens(STREAMS));
    const white = [];
    for (let y = NAME_TOP; y < NAME_BOTTOM; y++) {
      for (let x = NAME_LEFT; x < NAME_RIGHT; x++) {
        if (isNameFill(blank, x, y)) {
          white.push([x, y]);
        }
      }
    }
    expect(white).toEqual([]);
  });

  test.each(["N. SANITY BEACH", "CORTEX POWER", "THE GREAT GATE"])("with %s drawn on it in the other screens' letters looks like the game's", (name) => {
    const screens = readLoadingScreens(STREAMS);
    const original = screens.find((screen) => screen.name === name)!.image;
    const others = screens.filter((screen) => screen.name !== name);
    const sign = blankSign(others);
    const drawn = signWithTitle(sign, signFont(others, sign), name);
    // the game's names are placed and spaced by hand, a column or two either way, so they're compared
    // by their letters, how wide they are and how much white they have
    const widthOf = (columns: number[]) => columns[columns.length - 1] - columns[0] + 1;
    const whiteCount = (image: RgbImage) => nameFill(image).reduce((count, isWhite) => count + isWhite, 0);
    expect(runsOf(whiteColumns(drawn)).length).toBe(runsOf(whiteColumns(original)).length);
    expect(Math.abs(widthOf(whiteColumns(drawn)) - widthOf(whiteColumns(original)))).toBeLessThanOrEqual(4);
    expect(Math.abs(whiteCount(drawn) / whiteCount(original) - 1)).toBeLessThan(0.05);
  });
});
