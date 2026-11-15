// a custom level's loading screen in the game's own style: the "LOADING" sign every one of the
// game's loading screens has (loadingScreens.ts), with the level's title under it in the
// letters the game's names are drawn in (signFont.ts)
import type { RgbImage } from "./images";
import type { LoadingScreen } from "./loadingScreens";
import type { Rgb } from "./tpage";

// the part of the sign the names are drawn in: rows NAME_TOP up to NAME_BOTTOM, and columns
// NAME_LEFT up to NAME_RIGHT, between the rope at the sign's ends
export const NAME_TOP = 70;
export const NAME_BOTTOM = 104;
export const NAME_LEFT = 60;
export const NAME_RIGHT = 400;
const NAME_MARGIN = 2; // the columns and rows around a name's letters that are their outline and shading

const pixelAt = (image: RgbImage, x: number, y: number): Rgb =>
  [...image.rgb.subarray((y * image.width + x) * 3, (y * image.width + x) * 3 + 3)] as Rgb;

// whether x, y is in the white or light grey middle of a name's letters: the sign has no other
// light colour without red or yellow in it
export function isNameFill(image: RgbImage, x: number, y: number): boolean {
  const colour = pixelAt(image, x, y);
  return Math.min(...colour) > 110 && Math.max(...colour) - Math.min(...colour) < 60;
}

// which of image's pixels are in its name's letters, 1 for each
export function nameFill(image: RgbImage): Uint8Array {
  const fill = new Uint8Array(image.width * image.height);
  for (let y = NAME_TOP; y < NAME_BOTTOM; y++) {
    for (let x = NAME_LEFT; x < NAME_RIGHT; x++) {
      if (isNameFill(image, x, y)) {
        fill[y * image.width + x] = 1;
      }
    }
  }
  return fill;
}

// mask with every pixel within by of one of its pixels set too
function grown(mask: Uint8Array, width: number, height: number, by: number): Uint8Array {
  const result = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        for (let near = Math.max(0, y - by); near <= Math.min(height - 1, y + by); near++) {
          result.fill(1, near * width + Math.max(0, x - by), near * width + Math.min(width, x + by + 1));
        }
      }
    }
  }
  return result;
}

// which pixels of a screen are under its name: its letters, their outline and shading
const underName = ({ image }: LoadingScreen) => grown(nameFill(image), image.width, image.height, NAME_MARGIN);

const brightness = ([red, green, blue]: Rgb) => red + green + blue;

// the middle colour of colours, by brightness
function middleColour(colours: Rgb[]): Rgb {
  const sorted = [...colours].sort((a, b) => brightness(a) - brightness(b));
  return sorted[Math.floor(sorted.length / 2)];
}

// the column nearest x in row y that isn't a hole, on the left first
function nearestFilled(holes: Uint8Array, width: number, x: number, y: number): number {
  for (let distance = 1; distance < width; distance++) {
    if (x - distance >= 0 && !holes[y * width + x - distance]) {
      return x - distance;
    }
    if (x + distance < width && !holes[y * width + x + distance]) {
      return x + distance;
    }
  }
  return x;
}

// image with each hole the colour of the nearest pixel in its row that isn't one
function withHolesFilled(image: RgbImage, holes: Uint8Array): RgbImage {
  const filled: RgbImage = { ...image, rgb: new Uint8Array(image.rgb) };
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (holes[y * image.width + x]) {
        filled.rgb.set(pixelAt(image, nearestFilled(holes, image.width, x, y), y), (y * image.width + x) * 3);
      }
    }
  }
  return filled;
}

// the sign the screens share with no name on it: each pixel the middle colour of the screens that
// don't have their name over it (their colours differ a little, as each has its own palette), or
// the sign beside it where every screen does
export function blankSign(screens: LoadingScreen[]): RgbImage {
  const { width, height } = screens[0].image;
  const covered = screens.map(underName);
  const sign: RgbImage = { width, height, rgb: new Uint8Array(width * height * 3) };
  const holes = new Uint8Array(width * height);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const colours = screens.filter((_, index) => !covered[index][pixel]).map(({ image }) => pixelAt(image, x, y));
    if (colours.length === 0) {
      holes[pixel] = 1;
    } else {
      sign.rgb.set(middleColour(colours), pixel * 3);
    }
  }
  return withHolesFilled(sign, holes);
}
