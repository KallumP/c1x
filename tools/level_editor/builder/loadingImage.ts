// a custom level's loading screen in the game's format: a picture the size of the game's own,
// as the ldat's image bytes (src/pc/loading.c). loadingSign.ts makes the picture
import type { RgbImage } from "./images";
import { LDAT_IMAGE_SIZE, type Level, type Nsd } from "./levelFiles";
import { paletteImage } from "./tiles";
import { rgbOf5551, type Rgb } from "./tpage";

export const LOADING_IMAGE_WIDTH = 432;
export const LOADING_IMAGE_HEIGHT = 144;

function setPixel(image: RgbImage, x: number, y: number, colour: Rgb): void {
  image.rgb.set(colour, (y * image.width + x) * 3);
}

// the average colour of picture's pixels from (left, top) up to (right, bottom), each at least one pixel on
function averageColour(picture: RgbImage, left: number, top: number, right: number, bottom: number): Rgb {
  const total = [0, 0, 0];
  let count = 0;
  for (let y = top; y < Math.max(bottom, top + 1); y++) {
    for (let x = left; x < Math.max(right, left + 1); x++) {
      const at = (y * picture.width + x) * 3;
      total[0] += picture.rgb[at];
      total[1] += picture.rgb[at + 1];
      total[2] += picture.rgb[at + 2];
      count++;
    }
  }
  return total.map((part) => Math.round(part / count)) as Rgb;
}

// picture filling the loading screen: scaled until it covers it, its middle kept and its overhang cut off
export function fillLoadingImage(picture: RgbImage): RgbImage {
  const scale = Math.max(LOADING_IMAGE_WIDTH / picture.width, LOADING_IMAGE_HEIGHT / picture.height);
  const cutX = (picture.width - LOADING_IMAGE_WIDTH / scale) / 2; // picture pixels cut off each side
  const cutY = (picture.height - LOADING_IMAGE_HEIGHT / scale) / 2;
  const sourceX = (x: number) => Math.floor(cutX + x / scale);
  const sourceY = (y: number) => Math.floor(cutY + y / scale);
  const image: RgbImage = { width: LOADING_IMAGE_WIDTH, height: LOADING_IMAGE_HEIGHT, rgb: new Uint8Array(LOADING_IMAGE_WIDTH * LOADING_IMAGE_HEIGHT * 3) };
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      setPixel(image, x, y, averageColour(picture, sourceX(x), sourceY(y), sourceX(x + 1), sourceY(y + 1)));
    }
  }
  return image;
}

const LOADING_PALETTE_COLOURS = 256; // the loading screen's pixels are 8 bit indices into a palette

// the loading screen as the ldat's image bytes (src/pc/loading.c's LoadingImageConvert): its palette
// of 256 16 bit colours and then a byte a pixel, at the end of the LDAT_IMAGE_SIZE bytes
export function loadingImageBytes(image: RgbImage): Buffer {
  const { pixels, palette } = paletteImage(image, LOADING_PALETTE_COLOURS);
  const bytes = Buffer.alloc(LDAT_IMAGE_SIZE);
  const paletteAt = LDAT_IMAGE_SIZE - (2 * LOADING_PALETTE_COLOURS + pixels.length);
  palette.forEach((colour, index) => bytes.writeUInt16LE(colour, paletteAt + 2 * index));
  bytes.set(pixels, paletteAt + 2 * LOADING_PALETTE_COLOURS);
  return bytes;
}

// the width x height loading screen in the ldat's image bytes: the opposite of loadingImageBytes
export function loadingImageFromBytes(bytes: Buffer, width: number, height: number): RgbImage {
  const pixelCount = width * height;
  const paletteAt = bytes.length - (2 * LOADING_PALETTE_COLOURS + pixelCount);
  const pixelsAt = paletteAt + 2 * LOADING_PALETTE_COLOURS;
  const image: RgbImage = { width, height, rgb: new Uint8Array(pixelCount * 3) };
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    image.rgb.set(rgbOf5551(bytes.readUInt16LE(paletteAt + 2 * bytes[pixelsAt + pixel])), pixel * 3);
  }
  return image;
}

// the loading screen a level's .nsd has
export const loadingImageOf = (nsd: Nsd): RgbImage =>
  loadingImageFromBytes(nsd.ldat.image, nsd.loadingImageWidth, nsd.loadingImageHeight);

// level's .nsd with image as its loading screen, in place of the one it was built from
export function setLoadingImage(level: Level, image: RgbImage): void {
  level.nsd.hasLoadingImage = 1;
  level.nsd.loadingImageWidth = image.width;
  level.nsd.loadingImageHeight = image.height;
  level.nsd.ldat.image = loadingImageBytes(image);
}
