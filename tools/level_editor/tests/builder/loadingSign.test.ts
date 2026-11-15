import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { RgbImage } from "../../builder/images";
import { LOADING_IMAGE_HEIGHT, LOADING_IMAGE_WIDTH } from "../../builder/loadingImage";
import { ORIGINAL_LOADING_SCREENS, readLoadingScreens, type LoadingScreen } from "../../builder/loadingScreens";
import { blankSign, isNameFill, NAME_BOTTOM, NAME_LEFT, NAME_RIGHT, NAME_TOP } from "../../builder/loadingSign";

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
});
