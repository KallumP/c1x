// the letters the game's loading screens write their level's name in (loadingScreens.ts), cut
// out of those names: white with grey shading and a black outline. The names have every
// capital but Q and Z, so Q is made from O and R, and Z from N
import type { RgbImage } from "./images";
import { isLetterWhite, nameFill, NAME_BOTTOM, NAME_LEFT, NAME_RIGHT, NAME_TOP, pixelAt, type LoadingScreen } from "./loadingScreens";
import type { Rgb } from "./tpage";

export const SIGN_FONT_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ.";

// a letter: its pixels row by row, null where the sign shows through
export interface Glyph {
  width: number;
  height: number;
  pixels: (Rgb | null)[];
}

const OUTLINE_REACH = 2;     // how far a letter's outline and shading reach past its white middle
const SIGN_DIFFERENCE = 45;  // how different from the sign a pixel is to be part of a letter
const Q_TAIL_ROWS = 5;       // the rows of R's leg that are Q's tail...
const Q_TAIL_DROP = 2;       // ...and how far below the bottom of O it reaches

type Span = [number, number]; // a letter's first and last column of white

const glyphPixel = (glyph: Glyph, x: number, y: number) => glyph.pixels[y * glyph.width + x];

// the runs of columns of the name that have white in them: one a letter
function letterSpans(fill: Uint8Array, width: number): Span[] {
  const hasWhite = (x: number) => {
    for (let y = NAME_TOP; y < NAME_BOTTOM; y++) {
      if (fill[y * width + x]) {
        return true;
      }
    }
    return false;
  };
  const spans: Span[] = [];
  for (let x = NAME_LEFT; x < NAME_RIGHT; x++) {
    if (hasWhite(x) && !hasWhite(x - 1)) {
      let right = x;
      while (right + 1 < NAME_RIGHT && hasWhite(right + 1)) {
        right++;
      }
      spans.push([x, right]);
    }
  }
  return spans;
}

// whether x, y is within OUTLINE_REACH of a white pixel of the letter in span
function isNearLetter(fill: Uint8Array, width: number, [left, right]: Span, x: number, y: number): boolean {
  for (let nearY = Math.max(NAME_TOP, y - OUTLINE_REACH); nearY <= Math.min(NAME_BOTTOM - 1, y + OUTLINE_REACH); nearY++) {
    for (let nearX = Math.max(left, x - OUTLINE_REACH); nearX <= Math.min(right, x + OUTLINE_REACH); nearX++) {
      if (fill[nearY * width + nearX]) {
        return true;
      }
    }
  }
  return false;
}

const difference = (a: Rgb, b: Rgb) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

// the letter in span, from the rows names are drawn in: the pixels near its white that aren't the sign's
function cutLetter(image: RgbImage, sign: RgbImage, fill: Uint8Array, span: Span): Glyph {
  const left = span[0] - OUTLINE_REACH;
  const width = span[1] - span[0] + 1 + 2 * OUTLINE_REACH;
  const height = NAME_BOTTOM - NAME_TOP;
  const pixels: (Rgb | null)[] = [];
  for (let y = NAME_TOP; y < NAME_BOTTOM; y++) {
    for (let x = left; x < left + width; x++) {
      const colour = pixelAt(image, x, y);
      const isLetter = isNearLetter(fill, image.width, span, x, y) && difference(colour, pixelAt(sign, x, y)) > SIGN_DIFFERENCE;
      if (isLetter) {
        pixels.push(colour);
      } else {
        pixels.push(null);
      }
    }
  }
  return trimmed({ width, height, pixels });
}

// the columns and rows of glyph that pixels are set in
function setRowsAndColumns(glyph: Glyph): { columns: number[]; rows: number[] } {
  const columns: number[] = [];
  const rows: number[] = [];
  for (let y = 0; y < glyph.height; y++) {
    for (let x = 0; x < glyph.width; x++) {
      if (glyphPixel(glyph, x, y) !== null) {
        columns.push(x);
        rows.push(y);
      }
    }
  }
  return { columns, rows };
}

// the part of glyph from left, top, width x height in size
function cropped(glyph: Glyph, left: number, top: number, width: number, height: number): Glyph {
  const pixels: (Rgb | null)[] = [];
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) {
      pixels.push(glyphPixel(glyph, x, y));
    }
  }
  return { width, height, pixels };
}

// glyph cut down to the rows and columns it has pixels in
function trimmed(glyph: Glyph): Glyph {
  const { columns, rows } = setRowsAndColumns(glyph);
  const left = Math.min(...columns);
  const top = Math.min(...rows);
  return cropped(glyph, left, top, Math.max(...columns) - left + 1, Math.max(...rows) - top + 1);
}

// the columns and rows of glyph's white middle
function whiteRowsAndColumns(glyph: Glyph): { columns: number[]; rows: number[] } {
  const columns: number[] = [];
  const rows: number[] = [];
  for (let y = 0; y < glyph.height; y++) {
    for (let x = 0; x < glyph.width; x++) {
      const colour = glyphPixel(glyph, x, y);
      if (colour !== null && isLetterWhite(colour)) {
        columns.push(x);
        rows.push(y);
      }
    }
  }
  return { columns, rows };
}

// the first and last columns of glyph's white middle: what letters are spaced by
export function fillColumnsOf(glyph: Glyph): Span {
  const { columns } = whiteRowsAndColumns(glyph);
  return [Math.min(...columns), Math.max(...columns)];
}

// the bottom row of glyph's white middle: what letters stand on
export const baselineOf = (glyph: Glyph): number => Math.max(...whiteRowsAndColumns(glyph).rows);

// each letter of the screen's name: the name, without its spaces, split at the gaps between letters
function lettersOf(screen: LoadingScreen, sign: RgbImage): [string, Glyph][] {
  const fill = nameFill(screen.image);
  const spans = letterSpans(fill, screen.image.width);
  const letters = screen.name.replace(/ /g, "");
  if (spans.length !== letters.length) {
    throw new Error(`the loading screen with ${screen.name} on it has ${spans.length} letters, not ${letters.length}`);
  }
  return spans.map((span, index) => [letters[index], cutLetter(screen.image, sign, fill, span)]);
}

const whiteWidth = (glyph: Glyph) => fillColumnsOf(glyph)[1] - fillColumnsOf(glyph)[0];

// the first of glyphs with the width most of them have
function mostCommonWidth(glyphs: Glyph[]): Glyph {
  const counts = new Map<number, number>();
  glyphs.forEach((glyph) => counts.set(whiteWidth(glyph), (counts.get(whiteWidth(glyph)) ?? 0) + 1));
  const most = Math.max(...counts.values());
  return glyphs.find((glyph) => counts.get(whiteWidth(glyph)) === most)!;
}

// glyph turned a quarter clockwise
function turnedClockwise(glyph: Glyph): Glyph {
  const turned: Glyph = { width: glyph.height, height: glyph.width, pixels: Array(glyph.pixels.length).fill(null) };
  for (let y = 0; y < glyph.height; y++) {
    for (let x = 0; x < glyph.width; x++) {
      turned.pixels[x * turned.width + (glyph.height - 1 - y)] = glyphPixel(glyph, x, y);
    }
  }
  return turned;
}

// O with the bottom of R's leg for a tail, lined up with O's right side and reaching below it
function withTail(o: Glyph, r: Glyph): Glyph {
  const height = Math.max(o.height, r.height) + Q_TAIL_DROP;
  const pixels: (Rgb | null)[] = Array(o.width * height).fill(null);
  o.pixels.forEach((colour, index) => {
    pixels[index] = colour;
  });
  const legLeft = Math.ceil(r.width / 2);
  const tailTop = o.height - Q_TAIL_ROWS + Q_TAIL_DROP;
  for (let y = 0; y < Q_TAIL_ROWS; y++) {
    for (let x = legLeft; x < r.width; x++) {
      const colour = glyphPixel(r, x, r.height - Q_TAIL_ROWS + y);
      const atX = o.width - r.width + x;
      if (colour !== null && atX >= 0) {
        pixels[(tailTop + y) * o.width + atX] = colour;
      }
    }
  }
  return trimmed({ width: o.width, height, pixels });
}

// the letters the names don't have, made from ones they do
function withMadeLetters(font: Map<string, Glyph>): Map<string, Glyph> {
  const [n, o, r] = [font.get("N"), font.get("O"), font.get("R")];
  if (n !== undefined) {
    font.set("Z", turnedClockwise(n));
  }
  if (o !== undefined && r !== undefined) {
    font.set("Q", withTail(o, r));
  }
  return font;
}

// each letter the screens' names have, cut out against sign (the sign with no name on it,
// loadingSign.ts), and the ones made from them. Where a letter is in many names, the first of the
// most common width is used, so an odd one out isn't
export function signFont(screens: LoadingScreen[], sign: RgbImage): Map<string, Glyph> {
  const samples = new Map<string, Glyph[]>();
  for (const screen of screens) {
    for (const [letter, glyph] of lettersOf(screen, sign)) {
      samples.set(letter, [...(samples.get(letter) ?? []), glyph]);
    }
  }
  const font = new Map([...samples].map(([letter, glyphs]) => [letter, mostCommonWidth(glyphs)]));
  return withMadeLetters(font);
}
