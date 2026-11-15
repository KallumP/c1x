// a custom level's loading screen in the game's own style: the "LOADING" sign every one of the
// game's loading screens has (loadingScreens.ts), with the level's title under it in the
// letters the game's names are drawn in (signFont.ts)
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readImage, type RgbImage } from "./images";
import { fillLoadingImage } from "./loadingImage";
import { nameFill, pixelAt, readLoadingScreens, type LoadingScreen } from "./loadingScreens";
import { baselineOf, fillColumnsOf, signFont, type Glyph } from "./signFont";
import type { Rgb } from "./tpage";

export const LOADING_PICTURE = "loading.png"; // a picture in the level's folder to show instead of the sign

const NAME_MARGIN = 2;       // the columns and rows around a name's letters that are their outline and shading
const NAME_BASELINE = 94;    // the row most of the game's names stand on
export const NAME_CENTRE = 229;     // the column the game's names are centred on: the middle one, as they're placed by hand
export const NAME_MAX_WIDTH = 300;  // the widest a title is drawn, well inside the sign at its rows
const LETTER_GAP = 3;        // the columns between one letter's white and the next's, as the game's names have
const WORD_GAP = 13;         // ...and between words
const MIN_LETTER_GAP = 1;    // the closest letters are drawn, to fit a wide title
const MIN_WORD_GAP = 5;

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

// the gaps between a title's letters and between its words, in columns of sign
interface Spacing {
  letter: number;
  word: number;
}

// a letter of a title, and whether a space comes before it
interface TitleLetter {
  glyph: Glyph;
  afterSpace: boolean;
}

// the letters of title, in capitals
function titleLetters(font: Map<string, Glyph>, title: string): TitleLetter[] {
  const words = title.toUpperCase().split(" ").filter((word) => word !== "");
  return words.flatMap((word, wordIndex) => [...word].map((letter, letterIndex) => {
    const glyph = font.get(letter);
    if (glyph === undefined) {
      throw new Error(`the loading screen's letters have no ${letter}`);
    }
    return { glyph, afterSpace: wordIndex > 0 && letterIndex === 0 };
  }));
}

function gapBefore({ afterSpace }: TitleLetter, spacing: Spacing): number {
  if (afterSpace) {
    return spacing.word;
  }
  return spacing.letter;
}

const whiteWidth = (glyph: Glyph) => fillColumnsOf(glyph)[1] - fillColumnsOf(glyph)[0] + 1;

// how wide letters are from the first one's white to the last one's, at spacing
const titleWidth = (letters: TitleLetter[], spacing: Spacing) =>
  letters.reduce((width, letter, index) => {
    if (index === 0) {
      return whiteWidth(letter.glyph);
    }
    return width + gapBefore(letter, spacing) + whiteWidth(letter.glyph);
  }, 0);

// the game's spacing, closed up (letters first, then words) as far as letters need to fit the sign
function spacingToFit(letters: TitleLetter[]): Spacing {
  const spacing = { letter: LETTER_GAP, word: WORD_GAP };
  while (titleWidth(letters, spacing) > NAME_MAX_WIDTH && spacing.letter > MIN_LETTER_GAP) {
    spacing.letter--;
  }
  while (titleWidth(letters, spacing) > NAME_MAX_WIDTH && spacing.word > MIN_WORD_GAP) {
    spacing.word--;
  }
  return spacing;
}

// glyph drawn on image with its white's left column at whiteLeft, standing on NAME_BASELINE
function drawGlyph(image: RgbImage, glyph: Glyph, whiteLeft: number): void {
  const left = whiteLeft - fillColumnsOf(glyph)[0];
  const top = NAME_BASELINE - baselineOf(glyph);
  for (let y = 0; y < glyph.height; y++) {
    for (let x = 0; x < glyph.width; x++) {
      const colour = glyph.pixels[y * glyph.width + x];
      if (colour !== null) {
        image.rgb.set(colour, ((top + y) * image.width + left + x) * 3);
      }
    }
  }
}

// the game's loading sign with title under it, made from the game's loading screens in streamsDir
export function gameLoadingSign(streamsDir: string, title: string): RgbImage {
  const screens = readLoadingScreens(streamsDir);
  const sign = blankSign(screens);
  return signWithTitle(sign, signFont(screens, sign), title);
}

// the level's loading screen: the loading.png in its folder if it has one, else the game's sign with its title
export function loadingImageFor(folder: string, title: string, streamsDir: string): RgbImage {
  const picturePath = join(folder, LOADING_PICTURE);
  if (existsSync(picturePath)) {
    return fillLoadingImage(readImage(picturePath));
  }
  return gameLoadingSign(streamsDir, title);
}

// sign with title under it in font's letters (signFont.ts), centred and spaced as the game's names are
export function signWithTitle(sign: RgbImage, font: Map<string, Glyph>, title: string): RgbImage {
  const image: RgbImage = { ...sign, rgb: new Uint8Array(sign.rgb) };
  const letters = titleLetters(font, title);
  const spacing = spacingToFit(letters);
  let whiteLeft = NAME_CENTRE - Math.floor(titleWidth(letters, spacing) / 2);
  letters.forEach((letter, index) => {
    if (index > 0) {
      whiteLeft += gapBefore(letter, spacing);
    }
    drawGlyph(image, letter.glyph, whiteLeft);
    whiteLeft += whiteWidth(letter.glyph);
  });
  return image;
}
