// a custom level's loading screen: a title card with its title (src/levelTitle.ts) in big
// outlined letters over its sky, the same size as the game's own loading screens
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readImage, type RgbImage } from "./images";
import { GLYPH_HEIGHT, textMask, textWidth, type Mask } from "./pixelFont";
import type { Rgb, Sky } from "../src/sky";

export const LOADING_IMAGE_WIDTH = 432;
export const LOADING_IMAGE_HEIGHT = 144;
export const TITLE_MARGIN = 24; // the most of the card's edge the title is kept clear of
export const LOADING_PICTURE = "loading.png"; // a picture in the level's folder to show instead of the title card

const TITLE_SCALE_MAX = 10;    // the biggest the font is drawn, for a short title
const TITLE_TOP: Rgb = [255, 225, 70];   // the letters' colour at their top...
const TITLE_BOTTOM: Rgb = [240, 110, 0]; // ...fading to this at their bottom
const OUTLINE: Rgb = [45, 20, 0];

const mix = (from: Rgb, to: Rgb, amount: number): Rgb =>
  from.map((part, index) => Math.round(part + (to[index] - part) * amount)) as Rgb;

function setPixel(image: RgbImage, x: number, y: number, colour: Rgb): void {
  image.rgb.set(colour, (y * image.width + x) * 3);
}

// the card's sky: its top colour at the top, fading to its bottom colour at the bottom
function skyBackground(sky: Sky): RgbImage {
  const image: RgbImage = { width: LOADING_IMAGE_WIDTH, height: LOADING_IMAGE_HEIGHT, rgb: new Uint8Array(LOADING_IMAGE_WIDTH * LOADING_IMAGE_HEIGHT * 3) };
  for (let y = 0; y < image.height; y++) {
    const colour = mix(sky.top, sky.bottom, y / (image.height - 1));
    for (let x = 0; x < image.width; x++) {
      setPixel(image, x, y, colour);
    }
  }
  return image;
}

const outlineOf = (scale: number) => Math.max(1, Math.floor(scale / 3));

// whether title, drawn at scale with its outline, fits inside the card's margins
function fitsAt(title: string, scale: number): boolean {
  const outline = 2 * outlineOf(scale);
  return textWidth(title, scale) + outline <= LOADING_IMAGE_WIDTH - 2 * TITLE_MARGIN
    && GLYPH_HEIGHT * scale + outline <= LOADING_IMAGE_HEIGHT - 2 * TITLE_MARGIN;
}

// the biggest the title fits at, down to 1
function titleScale(title: string): number {
  let scale = TITLE_SCALE_MAX;
  while (scale > 1 && !fitsAt(title, scale)) {
    scale--;
  }
  return scale;
}

// a ring of outline around each inked pixel of mask, drawn at left, top
function drawOutline(image: RgbImage, mask: Mask, left: number, top: number, outline: number): void {
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (mask.ink[y * mask.width + x]) {
        for (let dy = -outline; dy <= outline; dy++) {
          for (let dx = -outline; dx <= outline; dx++) {
            setPixel(image, left + x + dx, top + y + dy, OUTLINE);
          }
        }
      }
    }
  }
}

// mask's ink at left, top, fading from TITLE_TOP to TITLE_BOTTOM down it
function drawLetters(image: RgbImage, mask: Mask, left: number, top: number): void {
  for (let y = 0; y < mask.height; y++) {
    const colour = mix(TITLE_TOP, TITLE_BOTTOM, y / Math.max(1, mask.height - 1));
    for (let x = 0; x < mask.width; x++) {
      if (mask.ink[y * mask.width + x]) {
        setPixel(image, left + x, top + y, colour);
      }
    }
  }
}

// the level's title card: its title, as big as fits, in the middle of its sky
export function titleCard(title: string, sky: Sky): RgbImage {
  const image = skyBackground(sky);
  if (title === "") {
    return image;
  }
  const scale = titleScale(title);
  const mask = textMask(title, scale);
  const left = Math.floor((image.width - mask.width) / 2);
  const top = Math.floor((image.height - mask.height) / 2);
  drawOutline(image, mask, left, top, outlineOf(scale));
  drawLetters(image, mask, left, top);
  return image;
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

// the level's loading screen: the loading.png in its folder if it has one, else its title card
export function loadingImageFor(folder: string, title: string, sky: Sky): RgbImage {
  const picturePath = join(folder, LOADING_PICTURE);
  if (existsSync(picturePath)) {
    return fillLoadingImage(readImage(picturePath));
  }
  return titleCard(title, sky);
}
